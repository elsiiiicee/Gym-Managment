package com.unyt.legion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.unyt.legion.user.AppUser;
import com.unyt.legion.user.UserRepository;
import com.unyt.legion.user.UserRole;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
class AuthSecurityIntegrationTest {
    private final ObjectMapper mapper = new ObjectMapper();

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository users;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void registrationRefreshRotationAndAdminProtectionWork() throws Exception {
        String email = "member-" + UUID.randomUUID() + "@example.com";
        JsonNode tokens = postJson("/api/auth/register", null, Map.of(
                "email", email,
                "password", "VeryStrongPassword123!",
                "fullName", "Legion Member"), 201);

        String accessToken = tokens.get("accessToken").asText();
        String refreshToken = tokens.get("refreshToken").asText();
        assertThat(tokens.get("role").asText()).isEqualTo("USER");

        mockMvc.perform(get("/api/admin/users").header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().is4xxClientError());

        postJson("/api/auth/register", null, Map.of(
                "email", email,
                "password", "VeryStrongPassword123!",
                "fullName", "Duplicate"), 409);

        JsonNode refreshed = postJson("/api/auth/refresh", null, Map.of("refreshToken", refreshToken), 200);
        assertThat(refreshed.get("accessToken").asText()).isNotBlank();

        postJson("/api/auth/refresh", null, Map.of("refreshToken", refreshToken), 401);
    }

    @Test
    void adminPasswordResetRevokesExistingRefreshTokensAndAudits() throws Exception {
        String userEmail = "reset-" + UUID.randomUUID() + "@example.com";
        JsonNode tokens = postJson("/api/auth/register", null, Map.of(
                "email", userEmail,
                "password", "OldStrongPassword123!",
                "fullName", "Reset Member"), 201);
        String oldRefreshToken = tokens.get("refreshToken").asText();
        UUID targetUserId = users.findByEmail(userEmail).orElseThrow().getId();

        String adminToken = createAdminAndLogin();

        // Public reset endpoints are gone.
        mockMvc.perform(post("/api/auth/password/forgot")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("email", userEmail))))
                .andExpect(status().is4xxClientError());

        // Non-admin cannot trigger an admin reset.
        mockMvc.perform(post("/api/admin/users/" + targetUserId + "/password-reset")
                        .header("Authorization", "Bearer " + tokens.get("accessToken").asText())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of(
                                "temporaryPassword", "TempStrongPassword123!",
                                "reason", "user request"))))
                .andExpect(status().isForbidden());

        postJson("/api/admin/users/" + targetUserId + "/password-reset", adminToken, Map.of(
                "temporaryPassword", "TempStrongPassword123!",
                "reason", "physically at gym front desk"), 201);

        // Old refresh token and old password no longer work; temp password does.
        postJson("/api/auth/refresh", null, Map.of("refreshToken", oldRefreshToken), 401);
        postJson("/api/auth/login", null, Map.of("email", userEmail, "password", "OldStrongPassword123!"), 401);
        JsonNode login = postJson("/api/auth/login", null,
                Map.of("email", userEmail, "password", "TempStrongPassword123!"), 200);
        String userAccessAfterReset = login.get("accessToken").asText();

        // User changes their own password and the change revokes the just-issued refresh.
        String refreshAfterReset = login.get("refreshToken").asText();
        postJson("/api/auth/password/change", userAccessAfterReset, Map.of(
                "currentPassword", "TempStrongPassword123!",
                "newPassword", "FinalStrongPassword123!"), 204);
        postJson("/api/auth/refresh", null, Map.of("refreshToken", refreshAfterReset), 401);
        postJson("/api/auth/login", null,
                Map.of("email", userEmail, "password", "FinalStrongPassword123!"), 200);

        // Audit trail surfaces the reset.
        JsonNode audits = getJson("/api/admin/users/" + targetUserId + "/password-reset/audits", adminToken, 200);
        assertThat(audits.isArray()).isTrue();
        assertThat(audits.size()).isGreaterThanOrEqualTo(1);
        assertThat(audits.get(0).get("reason").asText()).contains("front desk");
    }

    @Test
    void malformedJsonBodyReturns400NotInternalError() throws Exception {
        // Syntactically broken JSON -> HttpMessageNotReadableException -> 400.
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ this is not json "))
                .andExpect(status().isBadRequest());
    }

    @Test
    void missingRequiredPrimitiveFieldReturns400NotInternalError() throws Exception {
        // Admin creates a membership plan but omits a required field entirely;
        // an unmappable body is a client error (400), never a 500.
        String adminToken = createAdminAndLogin();
        mockMvc.perform(post("/api/admin/membership-plans")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"priceCents\":\"not-a-number\"}"))
                .andExpect(status().isBadRequest());
    }

    private String createAdminAndLogin() throws Exception {
        String email = "admin-" + UUID.randomUUID() + "@example.com";
        users.save(new AppUser(email, passwordEncoder.encode("AdminStrongPassword123!"), "Admin", UserRole.ADMIN));
        return postJson("/api/auth/login", null,
                Map.of("email", email, "password", "AdminStrongPassword123!"), 200)
                .get("accessToken").asText();
    }

    private JsonNode postJson(String path, String bearer, Map<String, Object> body, int expectedStatus) throws Exception {
        var request = post(path)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(body));
        if (bearer != null) {
            request.header("Authorization", "Bearer " + bearer);
        }
        MvcResult result = mockMvc.perform(request).andExpect(status().is(expectedStatus)).andReturn();
        String response = result.getResponse().getContentAsString();
        return response.isBlank() ? mapper.createObjectNode() : mapper.readTree(response);
    }

    private JsonNode getJson(String path, String bearer, int expectedStatus) throws Exception {
        var request = get(path);
        if (bearer != null) {
            request.header("Authorization", "Bearer " + bearer);
        }
        MvcResult result = mockMvc.perform(request).andExpect(status().is(expectedStatus)).andReturn();
        String response = result.getResponse().getContentAsString();
        return response.isBlank() ? mapper.createObjectNode() : mapper.readTree(response);
    }
}
