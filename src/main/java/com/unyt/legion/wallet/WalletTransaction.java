package com.unyt.legion.wallet;

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
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "wallet_transactions")
@Getter
@Setter
@NoArgsConstructor
public class WalletTransaction {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "wallet_id", nullable = false)
    private Wallet wallet;

    @Column(nullable = false)
    private long amountCents;

    @Column(nullable = false)
    private long balanceAfterCents;

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false, length = 30)
    private WalletTransactionType transactionType;

    @Column(name = "created_by_admin_id")
    private UUID createdByAdminId;

    @Column(name = "reference_type", length = 40)
    private String referenceType;

    @Column(name = "reference_id")
    private UUID referenceId;

    @Column(length = 500)
    private String notes;

    @Column(name = "idempotency_key", nullable = false, length = 120)
    private String idempotencyKey;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    public WalletTransaction(
            Wallet wallet,
            long amountCents,
            long balanceAfterCents,
            WalletTransactionType transactionType,
            UUID createdByAdminId,
            String referenceType,
            UUID referenceId,
            String notes,
            String idempotencyKey) {
        this.wallet = wallet;
        this.amountCents = amountCents;
        this.balanceAfterCents = balanceAfterCents;
        this.transactionType = transactionType;
        this.createdByAdminId = createdByAdminId;
        this.referenceType = referenceType;
        this.referenceId = referenceId;
        this.notes = notes;
        this.idempotencyKey = idempotencyKey;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }
}
