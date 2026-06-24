package com.unyt.legion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.unyt.legion.booking.GymClass;
import com.unyt.legion.booking.GymClassRepository;
import com.unyt.legion.subscription.MembershipPlan;
import com.unyt.legion.subscription.MembershipPlanRepository;
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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
class BookingAndSubscriptionIntegrationTest {
    private final ObjectMapper mapper = new ObjectMapper();

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private TrainerRepository trainers;

    @Autowired
    private GymClassRepository classes;

    @Autowired
    private MembershipPlanRepository plans;

    @Autowired
    private UserRepository users;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void bookingPreventsDuplicatesOverbookingAndOverlaps() throws Exception {
        Trainer trainer = trainers.save(new Trainer(null, "Mira Coach", "Strength", "Barbell and conditioning"));
        Instant startsAt = Instant.now().plus(2, ChronoUnit.DAYS);
        GymClass firstClass = classes.save(new GymClass(
                trainer,
                "Leg Day",
                "Strength class",
                startsAt,
                startsAt.plus(1, ChronoUnit.HOURS),
                1));
        GymClass overlappingClass = classes.save(new GymClass(
                trainer,
                "Core Work",
                "Core class",
                startsAt.plus(15, ChronoUnit.MINUTES),
                startsAt.plus(75, ChronoUnit.MINUTES),
                5));

        String userOneToken = register("book-one-" + UUID.randomUUID() + "@example.com").get("accessToken").asText();
        String userTwoToken = register("book-two-" + UUID.randomUUID() + "@example.com").get("accessToken").asText();

        postJson("/api/bookings", userOneToken, Map.of("classId", firstClass.getId().toString()), 201);
        postJson("/api/bookings", userOneToken, Map.of("classId", firstClass.getId().toString()), 409);
        postJson("/api/bookings", userTwoToken, Map.of("classId", firstClass.getId().toString()), 409);
        postJson("/api/bookings", userOneToken, Map.of("classId", overlappingClass.getId().toString()), 409);
    }

    @Test
    void subscriptionPurchaseAndCancelAreScopedToCurrentUser() throws Exception {
        MembershipPlan plan = plans.save(new MembershipPlan("Gold " + UUID.randomUUID(), "Full gym access", 4900, 1));
        String memberEmail = "member-" + UUID.randomUUID() + "@example.com";
        String token = register(memberEmail).get("accessToken").asText();
        UUID memberId = users.findByEmail(memberEmail).orElseThrow().getId();

        // Insufficient wallet balance -> 402 Payment Required.
        // WalletService now throws InsufficientWalletBalanceException
        // (custom exception, see GlobalExceptionHandler) which maps to
        // 402 instead of the generic 409 it used to share with other
        // conflicts. Semantic: "your balance can't cover this purchase."
        postJson("/api/subscriptions", token, Map.of(
                "planId", plan.getId().toString(),
                "idempotencyKey", "membership-broke-" + UUID.randomUUID()), 402);

        // Admin tops up the wallet.
        String adminToken = createAdminAndLogin();
        postJson("/api/admin/wallets/" + memberId + "/credit", adminToken, Map.of(
                "amountCents", 4900,
                "type", "CREDIT_ADD",
                "notes", "front desk top-up",
                "idempotencyKey", "topup-" + UUID.randomUUID()), 201);

        JsonNode subscription = postJson("/api/subscriptions", token, Map.of(
                "planId", plan.getId().toString(),
                "idempotencyKey", "membership-" + UUID.randomUUID()), 201);

        assertThat(subscription.get("status").asText()).isEqualTo("ACTIVE");

        mockMvc.perform(delete("/api/subscriptions/" + subscription.get("id").asText())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
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
                "fullName", "Member"), 201);
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
}
