package com.unyt.legion.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "password_reset_audits")
@Getter
@Setter
@NoArgsConstructor
public class PasswordResetAudit {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "target_user_id", nullable = false)
    private UUID targetUserId;

    @Column(name = "admin_user_id", nullable = false)
    private UUID adminUserId;

    @Column(length = 500)
    private String reason;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    public PasswordResetAudit(UUID targetUserId, UUID adminUserId, String reason) {
        this.targetUserId = targetUserId;
        this.adminUserId = adminUserId;
        this.reason = reason;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }
}
