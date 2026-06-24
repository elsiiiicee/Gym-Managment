package com.unyt.legion.trainer;

import com.unyt.legion.user.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "trainers")
@Getter
@Setter
@NoArgsConstructor
public class Trainer {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true)
    private AppUser user;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, length = 120)
    private String specialty;

    @Column(nullable = false, length = 1000)
    private String bio;

    @Column(nullable = false)
    private boolean active = true;

    @Column(precision = 2, scale = 1)
    private BigDecimal rating;

    // V4: what the gym pays this trainer for each class taught.
    // Migration backfills 0 for existing trainers.
    @Column(name = "fee_per_class_cents")
    private long feePerClassCents = 0L;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    public Trainer(AppUser user, String name, String specialty, String bio) {
        this.user = user;
        this.name = name;
        this.specialty = specialty;
        this.bio = bio;
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
