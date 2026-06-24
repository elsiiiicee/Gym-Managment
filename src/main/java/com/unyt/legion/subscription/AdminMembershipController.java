package com.unyt.legion.subscription;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

// Mapped at both `/membership-plans` (canonical) and `/memberships`
// (frontend-friendly alias) so the admin UI doesn't need to know the
// internal noun. Both paths share the same handler methods.
@RestController
@RequestMapping({"/api/admin/membership-plans", "/api/admin/memberships"})
public class AdminMembershipController {
    private final MembershipPlanRepository plans;
    private final SubscriptionService service;

    public AdminMembershipController(MembershipPlanRepository plans, SubscriptionService service) {
        this.plans = plans;
        this.service = service;
    }

    @GetMapping
    @Transactional(readOnly = true)
    List<PlanAdminResponse> list() {
        return plans.findAll().stream().map(PlanAdminResponse::from).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    PlanAdminResponse create(@Valid @RequestBody PlanRequest request) {
        return PlanAdminResponse.from(service.createPlan(
                request.name(),
                request.description(),
                request.priceCents(),
                request.billingPeriodMonths(),
                Boolean.TRUE.equals(request.popular()),
                request.features() == null ? List.of() : request.features()));
    }

    @PutMapping("/{id}")
    @Transactional
    PlanAdminResponse update(@PathVariable UUID id, @Valid @RequestBody PlanUpdateRequest request) {
        return PlanAdminResponse.from(service.updatePlan(
                id,
                request.name(),
                request.description(),
                request.priceCents(),
                request.billingPeriodMonths(),
                request.active(),
                request.popular(),
                request.features()));
    }

    // `popular` and `features` are optional; use a boxed Boolean so an omitted
    // JSON field deserializes to null instead of failing on a primitive.
    record PlanRequest(
            @NotBlank @Size(max = 120) String name,
            @NotBlank @Size(max = 1000) String description,
            @Min(1) long priceCents,
            @Min(1) @Max(24) int billingPeriodMonths,
            Boolean popular,
            List<@NotBlank @Size(max = 200) String> features) {
    }

    record PlanUpdateRequest(
            @NotBlank @Size(max = 120) String name,
            @NotBlank @Size(max = 1000) String description,
            @Min(1) long priceCents,
            @Min(1) @Max(24) int billingPeriodMonths,
            boolean active,
            Boolean popular,
            List<@NotBlank @Size(max = 200) String> features) {
    }

    record PlanAdminResponse(
            UUID id,
            String name,
            String description,
            long priceCents,
            int billingPeriodMonths,
            boolean active,
            boolean popular,
            List<String> features) {
        static PlanAdminResponse from(MembershipPlan plan) {
            List<String> features = plan.getFeatures();
            return new PlanAdminResponse(
                    plan.getId(),
                    plan.getName(),
                    plan.getDescription(),
                    plan.getPriceCents(),
                    plan.getBillingPeriodMonths(),
                    plan.isActive(),
                    plan.isPopular(),
                    features == null ? List.of() : List.copyOf(features));
        }
    }
}
