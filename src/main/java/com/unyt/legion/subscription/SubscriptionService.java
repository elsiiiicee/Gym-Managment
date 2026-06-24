package com.unyt.legion.subscription;

import com.unyt.legion.notification.NotificationService;
import com.unyt.legion.user.AppUser;
import com.unyt.legion.user.UserRepository;
import com.unyt.legion.wallet.WalletService;
import com.unyt.legion.wallet.WalletTransactionType;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class SubscriptionService {
    private final MembershipPlanRepository plans;
    private final UserSubscriptionRepository subscriptions;
    private final UserRepository users;
    private final NotificationService notifications;
    private final WalletService wallets;

    public SubscriptionService(
            MembershipPlanRepository plans,
            UserSubscriptionRepository subscriptions,
            UserRepository users,
            NotificationService notifications,
            WalletService wallets) {
        this.plans = plans;
        this.subscriptions = subscriptions;
        this.users = users;
        this.notifications = notifications;
        this.wallets = wallets;
    }

    @Transactional
    public MembershipPlan createPlan(String name, String description, long priceCents, int months) {
        return createPlan(name, description, priceCents, months, false, List.of());
    }

    @Transactional
    public MembershipPlan createPlan(String name, String description, long priceCents, int months,
            boolean popular, List<String> features) {
        MembershipPlan plan = new MembershipPlan(name.trim(), description.trim(), priceCents, months);
        plan.setPopular(popular);
        replaceFeatures(plan, features);
        return plans.save(plan);
    }

    @Transactional
    public MembershipPlan updatePlan(UUID id, String name, String description, long priceCents, int months, boolean active) {
        return updatePlan(id, name, description, priceCents, months, active, null, null);
    }

    @Transactional
    public MembershipPlan updatePlan(UUID id, String name, String description, long priceCents, int months,
            boolean active, Boolean popular, List<String> features) {
        MembershipPlan plan = plans.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Membership plan not found"));
        plan.setName(name.trim());
        plan.setDescription(description.trim());
        plan.setPriceCents(priceCents);
        plan.setBillingPeriodMonths(months);
        plan.setActive(active);
        if (popular != null) plan.setPopular(popular);
        if (features != null) replaceFeatures(plan, features);
        return plan;
    }

    private static void replaceFeatures(MembershipPlan plan, List<String> features) {
        List<String> cleaned = features == null ? List.of() : features.stream()
                .filter(f -> f != null && !f.isBlank())
                .map(String::trim)
                .toList();
        plan.getFeatures().clear();
        plan.getFeatures().addAll(new ArrayList<>(cleaned));
    }

    @Transactional
    public UserSubscription purchase(UUID userId, UUID planId, String idempotencyKey) {
        String key = idempotencyKey.trim();
        return subscriptions.findByUserIdAndIdempotencyKey(userId, key)
                .orElseGet(() -> createSubscription(userId, planId, key));
    }

    @Transactional
    public void cancel(UUID userId, UUID subscriptionId) {
        UserSubscription subscription = subscriptions.findById(subscriptionId)
                .filter(item -> item.getUser().getId().equals(userId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Subscription not found"));
        if (subscription.getStatus() == SubscriptionStatus.ACTIVE) {
            subscription.setStatus(SubscriptionStatus.CANCELED);
            subscription.setCanceledAt(Instant.now());
            notifications.notify(subscription.getUser(), "SUBSCRIPTION_CANCELED", "Your membership was canceled");
        }
    }

    private UserSubscription createSubscription(UUID userId, UUID planId, String key) {
        AppUser user = users.findById(userId).orElseThrow();
        MembershipPlan plan = plans.findById(planId)
                .filter(MembershipPlan::isActive)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Membership plan not found"));
        subscriptions.findFirstByUserIdAndStatusAndEndsAtAfterOrderByEndsAtDesc(userId, SubscriptionStatus.ACTIVE, Instant.now())
                .ifPresent(existing -> {
                    if (existing.getPlan().getId().equals(planId)) {
                        existing.setStatus(SubscriptionStatus.CANCELED);
                        existing.setCanceledAt(Instant.now());
                    } else {
                        existing.setStatus(SubscriptionStatus.CANCELED);
                        existing.setCanceledAt(Instant.now());
                    }
                });
        Instant startsAt = Instant.now();
        Instant endsAt = ZonedDateTime.ofInstant(startsAt, ZoneOffset.UTC)
                .plusMonths(plan.getBillingPeriodMonths())
                .toInstant();
        UserSubscription saved = subscriptions.save(new UserSubscription(user, plan, startsAt, endsAt, key));
        wallets.debitForPurchase(
                userId,
                plan.getPriceCents(),
                WalletTransactionType.MEMBERSHIP_PAYMENT,
                "SUBSCRIPTION",
                saved.getId(),
                key);
        notifications.notify(user, "SUBSCRIPTION_ACTIVE", "Your " + plan.getName() + " membership is active");
        return saved;
    }
}
