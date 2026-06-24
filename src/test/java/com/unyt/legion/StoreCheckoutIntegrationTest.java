package com.unyt.legion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.unyt.legion.user.AppUser;
import com.unyt.legion.user.UserRepository;
import com.unyt.legion.user.UserRole;
import com.unyt.legion.store.ProductRepository;
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
class StoreCheckoutIntegrationTest {
    private final ObjectMapper mapper = new ObjectMapper();

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository users;

    @Autowired
    private ProductRepository products;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void checkoutDebitsWalletIsAuthorizedValidatedIdempotentAndStockSafe() throws Exception {
        String adminToken = createAdminAndLogin();
        JsonNode product = postJson("/api/admin/products", adminToken, Map.of(
                "sku", "SKU-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(),
                "name", "Wrist Wraps",
                "description", "Supportive wraps for lifting",
                "priceCents", 999,
                "stockQuantity", 5), 201);
        UUID productId = UUID.fromString(product.get("id").asText());

        String userEmail = "shopper-" + UUID.randomUUID() + "@example.com";
        JsonNode userTokens = register(userEmail);
        String userToken = userTokens.get("accessToken").asText();
        UUID userId = users.findByEmail(userEmail).orElseThrow().getId();

        postJson("/api/cart/items", userToken, Map.of("productId", productId.toString(), "quantity", -1), 400);
        postJson("/api/cart/items", userToken, Map.of("productId", productId.toString(), "quantity", 2), 201);

        // Insufficient balance -> 402 (custom InsufficientWalletBalanceException).
        postJson("/api/checkout", userToken, Map.of(
                "idempotencyKey", "checkout-broke-" + UUID.randomUUID()), 402);

        // Admin tops up the wallet to cover the order (subtotal 1998 + tax 160 + shipping 799 = 2957).
        postJson("/api/admin/wallets/" + userId + "/credit", adminToken, Map.of(
                "amountCents", 5000,
                "type", "CREDIT_ADD",
                "notes", "cash at front desk",
                "idempotencyKey", "topup-" + UUID.randomUUID()), 201);

        JsonNode order = postJson("/api/checkout", userToken, Map.of(
                "idempotencyKey", "checkout-" + UUID.randomUUID()), 201);

        assertThat(order.get("status").asText()).isEqualTo("PAID");
        assertThat(order.get("totalCents").asLong()).isEqualTo(2957);
        assertThat(products.findById(productId).orElseThrow().getStockQuantity()).isEqualTo(3);

        JsonNode wallet = getJson("/api/wallet", userToken);
        assertThat(wallet.get("balanceCents").asLong()).isEqualTo(5000 - 2957);
    }

    private JsonNode register(String email) throws Exception {
        return postJson("/api/auth/register", null, Map.of(
                "email", email,
                "password", "VeryStrongPassword123!",
                "fullName", "Shopper"), 201);
    }

    private String createAdminAndLogin() throws Exception {
        String email = "admin-" + UUID.randomUUID() + "@example.com";
        users.save(new AppUser(email, passwordEncoder.encode("VeryStrongPassword123!"), "Admin", UserRole.ADMIN));
        return postJson("/api/auth/login", null, Map.of("email", email, "password", "VeryStrongPassword123!"), 200)
                .get("accessToken").asText();
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

    private JsonNode getJson(String path, String token) throws Exception {
        var request = org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get(path)
                .header("Authorization", "Bearer " + token);
        MvcResult result = mockMvc.perform(request).andExpect(status().isOk()).andReturn();
        String response = result.getResponse().getContentAsString();
        return response.isBlank() ? mapper.createObjectNode() : mapper.readTree(response);
    }
}
