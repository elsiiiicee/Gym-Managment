package com.unyt.legion.notification;

import com.unyt.legion.user.AppUser;
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

@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @Column(nullable = false, length = 60)
    private String type;

    @Column(nullable = false, length = 500)
    private String message;

    private Instant readAt;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    public Notification(AppUser user, String type, String message) {
        this.user = user;
        this.type = type;
        this.message = message;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }
}
