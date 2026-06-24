package com.unyt.legion.subscription;

import com.unyt.legion.user.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "user_subscriptions", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "idempotency_key"}))
@Getter
@Setter
@NoArgsConstructor
public class UserSubscription {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "plan_id", nullable = false)
    private MembershipPlan plan;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private SubscriptionStatus status = SubscriptionStatus.ACTIVE;

    @Column(nullable = false)
    private Instant startsAt;

    @Column(nullable = false)
    private Instant endsAt;

    private Instant canceledAt;

    @Column(nullable = false, length = 120)
    private String idempotencyKey;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    public UserSubscription(AppUser user, MembershipPlan plan, Instant startsAt, Instant endsAt, String idempotencyKey) {
        this.user = user;
        this.plan = plan;
        this.startsAt = startsAt;
        this.endsAt = endsAt;
        this.idempotencyKey = idempotencyKey;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }
}
