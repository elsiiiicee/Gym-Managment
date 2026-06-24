package com.unyt.legion.subscription;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "membership_plans")
@Getter
@Setter
@NoArgsConstructor
public class MembershipPlan {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 120)
    private String name;

    @Column(nullable = false, length = 1000)
    private String description;

    @Column(nullable = false)
    private long priceCents;

    @Column(nullable = false)
    private int billingPeriodMonths;

    @Column(nullable = false)
    private boolean active = true;

    @Column(nullable = false)
    private boolean popular = false;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "membership_plan_features",
            joinColumns = @JoinColumn(name = "plan_id"))
    @OrderColumn(name = "feature_index")
    @Column(name = "feature", nullable = false, length = 200)
    private List<String> features = new ArrayList<>();

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    public MembershipPlan(String name, String description, long priceCents, int billingPeriodMonths) {
        this.name = name;
        this.description = description;
        this.priceCents = priceCents;
        this.billingPeriodMonths = billingPeriodMonths;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
