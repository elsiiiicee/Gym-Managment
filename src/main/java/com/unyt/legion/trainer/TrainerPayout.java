package com.unyt.legion.trainer;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Append-only ledger of payouts the gym has made to a trainer. Sum of
 * amount_cents per trainer is the "paid" total; "earned" is computed live
 * from sessions taught * fee_per_class_cents.
 */
@Entity
@Table(name = "trainer_payouts")
@Getter
@Setter
@NoArgsConstructor
public class TrainerPayout {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "trainer_id", nullable = false)
    private Trainer trainer;

    @Column(name = "admin_user_id", nullable = false)
    private UUID adminUserId;

    @Column(name = "amount_cents", nullable = false)
    private long amountCents;

    @Column(length = 500)
    private String notes;

    @Column(name = "idempotency_key", nullable = false, length = 120)
    private String idempotencyKey;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public TrainerPayout(Trainer trainer, UUID adminUserId, long amountCents,
            String notes, String idempotencyKey) {
        this.trainer = trainer;
        this.adminUserId = adminUserId;
        this.amountCents = amountCents;
        this.notes = notes;
        this.idempotencyKey = idempotencyKey;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }
}
