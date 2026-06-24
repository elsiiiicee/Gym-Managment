package com.unyt.legion.store;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "payments")
@Getter
@Setter
@NoArgsConstructor
public class Payment {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false, unique = true)
    private CustomerOrder order;

    @Column(nullable = false, length = 40)
    private String provider;

    @Column(nullable = false)
    private long amountCents;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PaymentStatus status;

    @Column(nullable = false, length = 120)
    private String idempotencyKey;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    public Payment(CustomerOrder order, String provider, long amountCents, PaymentStatus status, String idempotencyKey) {
        this.order = order;
        this.provider = provider;
        this.amountCents = amountCents;
        this.status = status;
        this.idempotencyKey = idempotencyKey;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }
}
