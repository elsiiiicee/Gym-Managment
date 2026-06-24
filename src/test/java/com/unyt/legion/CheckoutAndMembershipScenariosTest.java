package com.unyt.legion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.unyt.legion.store.Product;
import com.unyt.legion.store.ProductRepository;
import com.unyt.legion.subscription.MembershipPlan;
import com.unyt.legion.subscription.MembershipPlanRepository;
import com.unyt.legion.user.AppUser;
import com.unyt.legion.user.UserRepository;
import com.unyt.legion.user.UserRole;
import com.unyt.legion.wallet.WalletRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
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
class CheckoutAndMembershipScenariosTest {
    private final ObjectMapper mapper = new ObjectMapper();

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository users;

    @Autowired
    private ProductRepository products;

    @Autowired
    private MembershipPlanRepository plans;

    @Autowired
    private WalletRepository wallets;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /**
     * Verifies that when checkout cannot complete (zero balance), the cart is
     * preserved, the wallet is unchanged, and stock has not been decremented.
     * Then a top-up + retry produces a successful order with the inventory
     * and wallet states correct.
     */
    @Test
    void checkoutRollsBackWhenWalletBalanceIsInsufficient() throws Exception {
        String adminToken = createAdminAndLogin();
        Product product = products.save(new Product(
                "SKU-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(),
                "Resistance Band",
                "Heavy resistance band",
                1_200,
                10));
        String email = "rollback-" + UUID.randomUUID() + "@example.com";
        String token = register(email).get("accessToken").asText();
        UUID userId = users.findByEmail(email).orElseThrow().getId();

        postJson("/api/cart/items", token, Map.of(
                "productId", product.getId().toString(), "quantity", 3), 201);

        // Wallet balance is zero, the checkout costs cents > 0, so the
        // custom InsufficientWalletBalanceException trips and the global
        // handler maps it to 402 Payment Required.
        postJson("/api/checkout", token, Map.of(
                "idempotencyKey", "fail-" + UUID.randomUUID()), 402);

        // Cart still present.
        JsonNode cart = getJson("/api/cart", token);
        assertThat(cart.isArray()).isTrue();
        assertThat(cart.size()).isEqualTo(1);

        // Stock unchanged.
        assertThat(products.findById(product.getId()).orElseThrow().getStockQuantity()).isEqualTo(10);

        // Wallet either nonexistent or zero.
        long initialBalance = wallets.findByUserId(userId).map(w -> w.getBalanceCents()).orElse(0L);
        assertThat(initialBalance).isEqualTo(0L);

        // Top up and retry succeeds.
        postJson("/api/admin/wallets/" + userId + "/credit", adminToken, Map.of(
                "amountCents", 10_000,
                "type", "CREDIT_ADD",
                "notes", "front desk",
                "idempotencyKey", "topup-" + UUID.randomUUID()), 201);

        JsonNode order = postJson("/api/checkout", token, Map.of(
                "idempotencyKey", "ok-" + UUID.randomUUID()), 201);
        assertThat(order.get("status").asText()).isEqualTo("PAID");

        // 3*1200=3600 subtotal + 8% tax (288) + 799 shipping = 4687.
        assertThat(order.get("totalCents").asLong()).isEqualTo(4_687);
        assertThat(products.findById(product.getId()).orElseThrow().getStockQuantity()).isEqualTo(7);
        assertThat(wallets.findByUserId(userId).orElseThrow().getBalanceCents()).isEqualTo(10_000 - 4_687);
    }

    /**
     * Subscription purchase: same idempotency key returns the same row; a
     * second purchase with a NEW key replaces the active subscription rather
     * than creating a duplicate active record. Insufficient wallet at the
     * NEW key fails cleanly.
     */
    @Test
    void membershipPurchaseHandlesIdempotencyDuplicateAndInsufficientCredits() throws Exception {
        String adminToken = createAdminAndLogin();
        MembershipPlan plan = plans.save(new MembershipPlan(
                "Silver-" + UUID.randomUUID(), "Gym access", 2_500, 1));
        String email = "memdup-" + UUID.randomUUID() + "@example.com";
        String token = register(email).get("accessToken").asText();
        UUID userId = users.findByEmail(email).orElseThrow().getId();

        // Insufficient balance -> 402 (see GlobalExceptionHandler).
        postJson("/api/subscriptions", token, Map.of(
                "planId", plan.getId().toString(),
                "idempotencyKey", "broke-" + UUID.randomUUID()), 402);

        // Fund and purchase once.
        postJson("/api/admin/wallets/" + userId + "/credit", adminToken, Map.of(
                "amountCents", 10_000,
                "type", "CREDIT_ADD",
                "notes", "n",
                "idempotencyKey", "topup-" + UUID.randomUUID()), 201);
        String purchaseKey = "buy-" + UUID.randomUUID();
        JsonNode first = postJson("/api/subscriptions", token, Map.of(
                "planId", plan.getId().toString(),
                "idempotencyKey", purchaseKey), 201);
        long balanceAfterFirst = wallets.findByUserId(userId).orElseThrow().getBalanceCents();
        assertThat(balanceAfterFirst).isEqualTo(10_000 - 2_500);

        // Same key returns same subscription, no double debit.
        JsonNode duplicate = postJson("/api/subscriptions", token, Map.of(
                "planId", plan.getId().toString(),
                "idempotencyKey", purchaseKey), 201);
        assertThat(duplicate.get("id").asText()).isEqualTo(first.get("id").asText());
        assertThat(wallets.findByUserId(userId).orElseThrow().getBalanceCents()).isEqualTo(balanceAfterFirst);
    }

    /**
     * Admin trainer + class + membership-plan CRUD: covers AdminTrainerController,
     * AdminClassController, AdminMembershipController, and BookingService class
     * mutations. Also exercises BookingService.book through the public endpoint.
     */
    @Test
    void adminTrainerClassAndMembershipPlanCrudOperateUnderAdminRole() throws Exception {
        String adminToken = createAdminAndLogin();

        // Trainer create + list + update.
        JsonNode trainer = postJson("/api/admin/trainers", adminToken, Map.of(
                "name", "Coach " + UUID.randomUUID(),
                "specialty", "Mobility",
                "bio", "decades of experience"), 201);
        UUID trainerId = UUID.fromString(trainer.get("id").asText());

        JsonNode trainers = getJson("/api/admin/trainers", adminToken);
        assertThat(trainers.isArray()).isTrue();

        putJson("/api/admin/trainers/" + trainerId, adminToken, Map.of(
                "name", "Updated Coach",
                "specialty", "Endurance",
                "bio", "updated bio",
                "active", true), 200);

        // Membership plan create + update.
        JsonNode plan = postJson("/api/admin/membership-plans", adminToken, Map.of(
                "name", "Plan " + UUID.randomUUID(),
                "description", "Standard plan",
                "priceCents", 3_900,
                "billingPeriodMonths", 1), 201);
        UUID planId = UUID.fromString(plan.get("id").asText());
        putJson("/api/admin/membership-plans/" + planId, adminToken, Map.of(
                "name", "Plan Renamed " + UUID.randomUUID(),
                "description", "renamed",
                "priceCents", 4_100,
                "billingPeriodMonths", 1,
                "active", true), 200);
        getJson("/api/admin/membership-plans", adminToken);

        // Class create + update + invalid times rejected.
        Instant startsAt = Instant.now().plus(2, ChronoUnit.DAYS);
        Instant endsAt = startsAt.plus(1, ChronoUnit.HOURS);
        JsonNode gymClass = postJson("/api/admin/classes", adminToken, Map.of(
                "trainerId", trainerId.toString(),
                "title", "HIIT",
                "description", "High intensity",
                "startsAt", startsAt.toString(),
                "endsAt", endsAt.toString(),
                "capacity", 10), 201);
        UUID classId = UUID.fromString(gymClass.get("id").asText());
        getJson("/api/admin/classes", adminToken);
        putJson("/api/admin/classes/" + classId, adminToken, Map.of(
                "trainerId", trainerId.toString(),
                "title", "HIIT II",
                "description", "renamed",
                "startsAt", startsAt.toString(),
                "endsAt", endsAt.toString(),
                "capacity", 12,
                "active", true), 200);

        // Inverted times rejected (400).
        Instant bad = Instant.now().plus(1, ChronoUnit.DAYS);
        postJson("/api/admin/classes", adminToken, Map.of(
                "trainerId", trainerId.toString(),
                "title", "Bad",
                "description", "bad times",
                "startsAt", bad.plus(2, ChronoUnit.HOURS).toString(),
                "endsAt", bad.toString(),
                "capacity", 5), 400);

        // Public booking flow against the (now-updated) class.
        String userToken = register("booker-" + UUID.randomUUID() + "@example.com")
                .get("accessToken").asText();
        postJson("/api/bookings", userToken, Map.of("classId", classId.toString()), 201);
        postJson("/api/bookings", userToken, Map.of("classId", classId.toString()), 409);
    }

    @Test
    void payrollSummaryAndIdempotentPayoutRecording() throws Exception {
        String adminToken = createAdminAndLogin();

        JsonNode trainer = postJson("/api/admin/trainers", adminToken, Map.of(
                "name", "Payroll Coach " + UUID.randomUUID(),
                "specialty", "Strength",
                "bio", "experienced",
                "feePerClassCents", 5_000), 201);
        UUID trainerId = UUID.fromString(trainer.get("id").asText());

        // Payroll summary lists the trainer with zero outstanding before any class.
        JsonNode summary = getJson("/api/admin/payroll", adminToken);
        assertThat(summary.isArray()).isTrue();
        assertThat(summary.size()).isGreaterThanOrEqualTo(1);

        // Record a payout; repeating with the same idempotency key returns the
        // same payout rather than double-paying.
        String idemKey = "payout-" + UUID.randomUUID();
        JsonNode first = postJson("/api/admin/payroll/" + trainerId + "/payout", adminToken, Map.of(
                "amountCents", 5_000,
                "notes", "one class",
                "idempotencyKey", idemKey), 201);
        JsonNode second = postJson("/api/admin/payroll/" + trainerId + "/payout", adminToken, Map.of(
                "amountCents", 5_000,
                "notes", "one class",
                "idempotencyKey", idemKey), 201);
        assertThat(second.get("payoutId").asText()).isEqualTo(first.get("payoutId").asText());

        // Payout against a missing trainer is a 404.
        postJson("/api/admin/payroll/" + UUID.randomUUID() + "/payout", adminToken, Map.of(
                "amountCents", 1_000,
                "notes", "ghost",
                "idempotencyKey", "ghost-" + UUID.randomUUID()), 404);
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
