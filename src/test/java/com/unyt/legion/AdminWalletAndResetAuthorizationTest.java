package com.unyt.legion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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

/**
 * Verifies wallet + password-reset admin endpoints are gated to ADMIN only and
 * that the wallet HTTP surface (credit, debit, transactions, audit listing)
 * behaves correctly under real authentication.
 */
@SpringBootTest
@AutoConfigureMockMvc
class AdminWalletAndResetAuthorizationTest {
    private final ObjectMapper mapper = new ObjectMapper();

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository users;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void unauthenticatedCannotAccessAdminWalletEndpoints() throws Exception {
        UUID someUser = UUID.randomUUID();
        // Spring Security STATELESS without an explicit entry point returns 403 for
        // anonymous access to a protected URL — what matters is that the call is
        // rejected, not the precise 401/403 distinction.
        mockMvc.perform(get("/api/admin/wallets/" + someUser))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/admin/wallets/" + someUser + "/credit")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amountCents\":1,\"notes\":\"x\",\"idempotencyKey\":\"y\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void userRoleCannotAccessAdminWalletEndpoints() throws Exception {
        String userEmail = "user-" + UUID.randomUUID() + "@example.com";
        JsonNode tokens = register(userEmail);
        String userToken = tokens.get("accessToken").asText();
        UUID targetId = users.findByEmail(userEmail).orElseThrow().getId();

        mockMvc.perform(get("/api/admin/wallets/" + targetId)
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/admin/wallets/" + targetId + "/credit")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of(
                                "amountCents", 100,
                                "notes", "self credit",
                                "idempotencyKey", "evil-" + UUID.randomUUID()))))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/admin/wallets/" + targetId + "/debit")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of(
                                "amountCents", 100,
                                "notes", "self debit",
                                "idempotencyKey", "evil-" + UUID.randomUUID()))))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCreditAndDebitFlowProducesAuditableTransactionHistory() throws Exception {
        String adminToken = createAdminAndLogin();
        String userEmail = "wallet-" + UUID.randomUUID() + "@example.com";
        register(userEmail);
        UUID userId = users.findByEmail(userEmail).orElseThrow().getId();

        // Credit twice with different keys.
        JsonNode credit = postJson("/api/admin/wallets/" + userId + "/credit", adminToken, Map.of(
                "amountCents", 3_000,
                "type", "CREDIT_ADD",
                "notes", "first top-up",
                "idempotencyKey", "topup-1-" + UUID.randomUUID()), 201);
        assertThat(credit.get("balanceAfterCents").asLong()).isEqualTo(3_000);
        assertThat(credit.get("createdByAdminId").asText()).isNotBlank();

        postJson("/api/admin/wallets/" + userId + "/credit", adminToken, Map.of(
                "amountCents", 1_500,
                "type", "CREDIT_ADD",
                "notes", "second top-up",
                "idempotencyKey", "topup-2-" + UUID.randomUUID()), 201);

        // Admin adjustment debit.
        JsonNode debit = postJson("/api/admin/wallets/" + userId + "/debit", adminToken, Map.of(
                "amountCents", 500,
                "notes", "promo correction",
                "idempotencyKey", "adj-" + UUID.randomUUID()), 201);
        assertThat(debit.get("amountCents").asLong()).isEqualTo(-500);
        assertThat(debit.get("balanceAfterCents").asLong()).isEqualTo(4_000);

        // Cannot debit below zero. Insufficient balance maps to 402 Payment Required.
        mockMvc.perform(post("/api/admin/wallets/" + userId + "/debit")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of(
                                "amountCents", 9_999_999,
                                "notes", "over",
                                "idempotencyKey", "adj-over-" + UUID.randomUUID()))))
                .andExpect(status().isPaymentRequired());

        JsonNode txns = getJson("/api/admin/wallets/" + userId + "/transactions", adminToken, 200);
        assertThat(txns.isArray()).isTrue();
        assertThat(txns.size()).isEqualTo(3);
    }

    @Test
    void userCanReadOwnWalletAndTransactionsButNotOthers() throws Exception {
        String adminToken = createAdminAndLogin();
        String aliceEmail = "alice-" + UUID.randomUUID() + "@example.com";
        String bobEmail = "bob-" + UUID.randomUUID() + "@example.com";
        String aliceToken = register(aliceEmail).get("accessToken").asText();
        register(bobEmail);
        UUID aliceId = users.findByEmail(aliceEmail).orElseThrow().getId();
        UUID bobId = users.findByEmail(bobEmail).orElseThrow().getId();

        postJson("/api/admin/wallets/" + aliceId + "/credit", adminToken, Map.of(
                "amountCents", 800,
                "type", "CREDIT_ADD",
                "notes", "n",
                "idempotencyKey", "k-" + UUID.randomUUID()), 201);

        JsonNode mine = getJson("/api/wallet", aliceToken, 200);
        assertThat(mine.get("userId").asText()).isEqualTo(aliceId.toString());
        assertThat(mine.get("balanceCents").asLong()).isEqualTo(800);

        // No endpoint exists for one user to view another user's wallet
        // outside /api/admin. Alice hitting Bob's admin path is forbidden.
        mockMvc.perform(get("/api/admin/wallets/" + bobId)
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isForbidden());

        JsonNode myTx = getJson("/api/wallet/transactions", aliceToken, 200);
        assertThat(myTx.isArray()).isTrue();
        assertThat(myTx.size()).isEqualTo(1);
    }

    @Test
    void unauthenticatedAndUserCannotTriggerAdminPasswordReset() throws Exception {
        String userEmail = "reset-target-" + UUID.randomUUID() + "@example.com";
        String userToken = register(userEmail).get("accessToken").asText();
        UUID targetId = users.findByEmail(userEmail).orElseThrow().getId();

        // No bearer.
        mockMvc.perform(post("/api/admin/users/" + targetId + "/password-reset")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of(
                                "temporaryPassword", "TempStrongPassword123!",
                                "reason", "x"))))
                .andExpect(status().isForbidden());

        // Non-admin token.
        mockMvc.perform(post("/api/admin/users/" + targetId + "/password-reset")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of(
                                "temporaryPassword", "TempStrongPassword123!",
                                "reason", "self"))))
                .andExpect(status().isForbidden());
    }

    private String createAdminAndLogin() throws Exception {
        String email = "admin-" + UUID.randomUUID() + "@example.com";
        users.save(new AppUser(email, passwordEncoder.encode("AdminStrongPassword123!"), "Admin", UserRole.ADMIN));
        return postJson("/api/auth/login", null,
                Map.of("email", email, "password", "AdminStrongPassword123!"), 200)
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

    private JsonNode getJson(String path, String token, int expectedStatus) throws Exception {
        var request = get(path);
        if (token != null) {
            request.header("Authorization", "Bearer " + token);
        }
        MvcResult result = mockMvc.perform(request).andExpect(status().is(expectedStatus)).andReturn();
        String response = result.getResponse().getContentAsString();
        return response.isBlank() ? mapper.createObjectNode() : mapper.readTree(response);
    }
}
