package com.unyt.legion.user;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PasswordResetAuditRepository extends JpaRepository<PasswordResetAudit, UUID> {
    List<PasswordResetAudit> findByTargetUserIdOrderByCreatedAtDesc(UUID targetUserId);
}
