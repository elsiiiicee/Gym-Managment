package com.unyt.legion.subscription;

import com.unyt.legion.security.SecurityUtils;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MembershipController {
    private final MembershipPlanRepository plans;
    private final UserSubscriptionRepository subscriptions;
    private final SubscriptionService service;

    public MembershipController(
            MembershipPlanRepository plans,
            UserSubscriptionRepository subscriptions,
            SubscriptionService service) {
        this.plans = plans;
        this.subscriptions = subscriptions;
        this.service = service;
    }

    @GetMapping("/api/membership-plans")
    @Transactional(readOnly = true)
    List<PlanResponse> plans() {
        return plans.findByActiveTrueOrderByPriceCentsAsc().stream().map(PlanResponse::from).toList();
    }

    @GetMapping("/api/subscriptions")
    @Transactional(readOnly = true)
    List<SubscriptionResponse> mine() {
        return subscriptions.findByUserIdOrderByCreatedAtDesc(SecurityUtils.currentUserId()).stream()
                .map(SubscriptionResponse::from)
                .toList();
    }

    @PostMapping("/api/subscriptions")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    SubscriptionResponse purchase(@Valid @RequestBody PurchaseRequest request) {
        return SubscriptionResponse.from(service.purchase(
                SecurityUtils.currentUserId(),
                request.planId(),
                request.idempotencyKey()));
    }

    @DeleteMapping("/api/subscriptions/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void cancel(@PathVariable UUID id) {
        service.cancel(SecurityUtils.currentUserId(), id);
    }

    record PurchaseRequest(@NotNull UUID planId, @NotBlank @Size(max = 120) String idempotencyKey) {
    }

    record PlanResponse(
            UUID id,
            String name,
            String description,
            long priceCents,
            int billingPeriodMonths,
            boolean popular,
            List<String> features) {
        static PlanResponse from(MembershipPlan plan) {
            return new PlanResponse(
                    plan.getId(),
                    plan.getName(),
                    plan.getDescription(),
                    plan.getPriceCents(),
                    plan.getBillingPeriodMonths(),
                    plan.isPopular(),
                    List.copyOf(plan.getFeatures()));
        }
    }

    record SubscriptionResponse(UUID id, UUID planId, String planName, String status, Instant startsAt, Instant endsAt) {
        static SubscriptionResponse from(UserSubscription subscription) {
            return new SubscriptionResponse(
                    subscription.getId(),
                    subscription.getPlan().getId(),
                    subscription.getPlan().getName(),
                    subscription.getStatus().name(),
                    subscription.getStartsAt(),
                    subscription.getEndsAt());
        }
    }
}
