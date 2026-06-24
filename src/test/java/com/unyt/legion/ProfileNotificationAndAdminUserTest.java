package com.unyt.legion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.unyt.legion.booking.GymClass;
import com.unyt.legion.booking.GymClassRepository;
import com.unyt.legion.notification.NotificationService;
import com.unyt.legion.store.Product;
import com.unyt.legion.store.ProductRepository;
import com.unyt.legion.trainer.Trainer;
import com.unyt.legion.trainer.TrainerRepository;
import com.unyt.legion.user.AppUser;
import com.unyt.legion.user.UserRepository;
import com.unyt.legion.user.UserRole;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
class ProfileNotificationAndAdminUserTest {
    private final ObjectMapper mapper = new ObjectMapper();

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository users;

    @Autowired
    private ProductRepository products;

    @Autowired
    private TrainerRepository trainers;

    @Autowired
    private GymClassRepository classes;

    @Autowired
    private NotificationService notifier;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void profileReadUpdateAvatarUploadAndDeactivateWork() throws Exception {
        String email = "profile-" + UUID.randomUUID() + "@example.com";
        JsonNode tokens = register(email);
        String token = tokens.get("accessToken").asText();

        JsonNode me = getJson("/api/users/me", token);
        assertThat(me.get("email").asText()).isEqualTo(email);

        putJson("/api/users/me/profile", token, Map.of(
                "displayName", "Updated Name",
                "phone", "+1 555 123 4567"), 200);

        // Avatar upload (valid PNG).
        byte[] tinyPng = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
        MockMultipartFile file = new MockMultipartFile(
                "file", "avatar.png", "image/png", tinyPng);
        mockMvc.perform(multipart("/api/users/me/avatar")
                        .file(file)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        // Bad content type.
        MockMultipartFile evil = new MockMultipartFile(
                "file", "evil.exe", "application/octet-stream", new byte[]{1, 2, 3});
        mockMvc.perform(multipart("/api/users/me/avatar")
                        .file(evil)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());

        // Empty file.
        MockMultipartFile empty = new MockMultipartFile("file", "x.png", "image/png", new byte[]{});
        mockMvc.perform(multipart("/api/users/me/avatar")
                        .file(empty)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());

        // Request email verification.
        mockMvc.perform(post("/api/users/me/email-verification")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isAccepted());

        // Deactivate.
        mockMvc.perform(delete("/api/users/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        // After deactivation login fails.
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of(
                                "email", email,
                                "password", "VeryStrongPassword123!"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void notificationsListAndMarkReadAreScoped() throws Exception {
        String email = "notify-" + UUID.randomUUID() + "@example.com";
        String token = register(email).get("accessToken").asText();
        AppUser user = users.findByEmail(email).orElseThrow();
        notifier.notify(user, "TEST", "First note");
        notifier.notify(user, "TEST", "Second note");

        JsonNode list = getJson("/api/notifications", token);
        assertThat(list.size()).isEqualTo(2);
        String firstId = list.get(0).get("id").asText();

        mockMvc.perform(patch("/api/notifications/" + firstId + "/read")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        // Marking another user's notification returns 404.
        String otherToken = register("other-" + UUID.randomUUID() + "@example.com")
                .get("accessToken").asText();
        mockMvc.perform(patch("/api/notifications/" + firstId + "/read")
                        .header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void adminUserUpdateEnforcesSelfAndLastAdminConstraints() throws Exception {
        String adminEmail = "admin-" + UUID.randomUUID() + "@example.com";
        AppUser admin = users.save(new AppUser(adminEmail,
                passwordEncoder.encode("AdminStrongPassword123!"), "Admin", UserRole.ADMIN));
        String adminToken = login(adminEmail, "AdminStrongPassword123!");

        // List users.
        JsonNode list = getJson("/api/admin/users", adminToken);
        assertThat(list.isArray()).isTrue();

        // Cannot demote the last admin.
        mockMvc.perform(patch("/api/admin/users/" + admin.getId())
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of(
                                "role", "USER",
                                "active", true))))
                .andExpect(status().isBadRequest());

        // Cannot self-deactivate.
        mockMvc.perform(patch("/api/admin/users/" + admin.getId())
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of(
                                "role", "ADMIN",
                                "active", false))))
                .andExpect(status().isBadRequest());

        // After creating a second admin, the first can be demoted.
        String otherEmail = "other-" + UUID.randomUUID() + "@example.com";
        AppUser other = users.save(new AppUser(otherEmail,
                passwordEncoder.encode("AdminStrongPassword123!"), "Other", UserRole.ADMIN));
        mockMvc.perform(patch("/api/admin/users/" + other.getId())
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of(
                                "role", "USER",
                                "active", true))))
                .andExpect(status().isOk());

        // Analytics endpoint.
        getJson("/api/admin/analytics", adminToken);
    }

    @Test
    void productCrudAndCartLifecycleWork() throws Exception {
        String adminEmail = "admin-prod-" + UUID.randomUUID() + "@example.com";
        users.save(new AppUser(adminEmail, passwordEncoder.encode("AdminStrongPassword123!"), "Admin", UserRole.ADMIN));
        String adminToken = login(adminEmail, "AdminStrongPassword123!");

        Product p = products.save(new Product(
                "SKU-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(),
                "Foam Roller", "smooth black", 1_500, 5));

        // Admin product list + update.
        getJson("/api/admin/products", adminToken);
        putJson("/api/admin/products/" + p.getId(), adminToken, Map.of(
                "name", "Foam Roller XL",
                "description", "longer",
                "priceCents", 1_800,
                "stockQuantity", 4,
                "active", true), 200);

        // Duplicate SKU rejected.
        postJson("/api/admin/products", adminToken, Map.of(
                "sku", p.getSku(),
                "name", "dup",
                "description", "dup",
                "priceCents", 100,
                "stockQuantity", 1), 409);

        // Public catalog.
        getJson("/api/catalog/products", null);

        // Cart lifecycle: add, update, remove.
        String userToken = register("cart-" + UUID.randomUUID() + "@example.com")
                .get("accessToken").asText();
        postJson("/api/cart/items", userToken, Map.of(
                "productId", p.getId().toString(), "quantity", 1), 201);
        putJson("/api/cart/items/" + p.getId(), userToken, Map.of("quantity", 2), 200);
        mockMvc.perform(delete("/api/cart/items/" + p.getId())
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isNoContent());
        getJson("/api/cart", userToken);
    }

    @Test
    void bookingCancellationFlow() throws Exception {
        Trainer trainer = trainers.save(new Trainer(null, "T", "S", "bio"));
        Instant startsAt = Instant.now().plus(2, ChronoUnit.DAYS);
        GymClass gc = classes.save(new GymClass(trainer, "Open Floor", "free training",
                startsAt, startsAt.plus(1, ChronoUnit.HOURS), 4));

        String token = register("booker-" + UUID.randomUUID() + "@example.com")
                .get("accessToken").asText();
        JsonNode booking = postJson("/api/bookings", token,
                Map.of("classId", gc.getId().toString()), 201);
        UUID bookingId = UUID.fromString(booking.get("id").asText());

        getJson("/api/bookings", token);
        getJson("/api/classes", null);

        mockMvc.perform(delete("/api/bookings/" + bookingId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        // Cancelling a non-existent booking returns 404.
        mockMvc.perform(delete("/api/bookings/" + UUID.randomUUID())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());

        // Re-book after cancellation is allowed.
        postJson("/api/bookings", token, Map.of("classId", gc.getId().toString()), 201);
    }

    private String login(String email, String password) throws Exception {
        return postJson("/api/auth/login", null,
                Map.of("email", email, "password", password), 200)
                .get("accessToken").asText();
    }

    private JsonNode register(String email) throws Exception {
        return postJson("/api/auth/register", null, Map.of(
                "email", email,
                "password", "VeryStrongPassword123!",
                "fullName", "User"), 201);
    }

    private JsonNode postJson(String path, String token, Map<String, Object> body, int expectedStatus) throws Exception {
        var request = post(path)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(body));
        if (token != null) {
            request.header("Authorization", "Bearer " + token);
        }
        MvcResult result = mockMvc.perform(request).andExpect(status().is(expectedStatus)).andReturn();
        String response = result.getResponse().getContentAsString();
        return response.isBlank() ? mapper.createObjectNode() : mapper.readTree(response);
    }

    private void putJson(String path, String token, Map<String, Object> body, int expectedStatus) throws Exception {
        var request = put(path)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(body));
        if (token != null) {
            request.header("Authorization", "Bearer " + token);
        }
        mockMvc.perform(request).andExpect(status().is(expectedStatus));
    }

    private JsonNode getJson(String path, String token) throws Exception {
        var request = get(path);
        if (token != null) {
            request.header("Authorization", "Bearer " + token);
        }
        MvcResult result = mockMvc.perform(request).andExpect(status().isOk()).andReturn();
        String response = result.getResponse().getContentAsString();
        return response.isBlank() ? mapper.createObjectNode() : mapper.readTree(response);
    }
}
