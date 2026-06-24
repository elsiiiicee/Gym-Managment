package com.unyt.legion.booking;

import com.unyt.legion.trainer.Trainer;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "gym_classes")
@Getter
@Setter
@NoArgsConstructor
public class GymClass {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "trainer_id", nullable = false)
    private Trainer trainer;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(nullable = false, length = 1000)
    private String description;

    @Column(nullable = false)
    private Instant startsAt;

    @Column(nullable = false)
    private Instant endsAt;

    @Column(nullable = false)
    private int capacity;

    @Column(nullable = false)
    private boolean active = true;

    // V3 migration is `not null default ''`. Marked nullable here so
    // Hibernate's `ddl-auto=update` against an existing Postgres database
    // can add the column without rewriting existing rows. The field
    // initializer ensures Java-side it's never actually null.
    @Column(length = 60)
    private String category = "";

    // V4: drop-in price. 0 means "free even for non-subscribers".
    @Column(name = "price_cents")
    private long priceCents = 0L;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    public GymClass(Trainer trainer, String title, String description, Instant startsAt, Instant endsAt, int capacity) {
        this.trainer = trainer;
        this.title = title;
        this.description = description;
        this.startsAt = startsAt;
        this.endsAt = endsAt;
        this.capacity = capacity;
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
