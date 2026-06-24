package com.unyt.legion.admin;

import com.unyt.legion.security.SecurityUtils;
import com.unyt.legion.user.AuthService;
import com.unyt.legion.user.PasswordResetAudit;
import com.unyt.legion.user.PasswordResetAuditRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/users")
public class AdminPasswordResetController {

    private final AuthService auth;
    private final PasswordResetAuditRepository audits;

    public AdminPasswordResetController(AuthService auth, PasswordResetAuditRepository audits) {
        this.auth = auth;
        this.audits = audits;
    }

    @PostMapping("/{userId}/password-reset")
    @ResponseStatus(HttpStatus.CREATED)
    ResetResponse resetPassword(@PathVariable UUID userId, @Valid @RequestBody ResetRequest request) {
        UUID adminId = SecurityUtils.currentUserId();
        PasswordResetAudit audit = auth.adminResetPassword(
                userId, adminId, request.temporaryPassword(), request.reason());
        return new ResetResponse(audit.getId(), audit.getTargetUserId(), audit.getAdminUserId(), audit.getCreatedAt());
    }

    @GetMapping("/{userId}/password-reset/audits")
    @Transactional(readOnly = true)
    List<AuditResponse> audits(@PathVariable UUID userId) {
        return audits.findByTargetUserIdOrderByCreatedAtDesc(userId).stream()
                .map(AuditResponse::from)
                .toList();
    }

    record ResetRequest(
            @Size(min = 12, max = 128) String temporaryPassword,
            @NotBlank @Size(max = 500) String reason) {
    }

    record ResetResponse(UUID auditId, UUID targetUserId, UUID adminUserId, Instant createdAt) {
    }

    record AuditResponse(UUID id, UUID targetUserId, UUID adminUserId, String reason, Instant createdAt) {
        static AuditResponse from(PasswordResetAudit audit) {
            return new AuditResponse(
                    audit.getId(),
                    audit.getTargetUserId(),
                    audit.getAdminUserId(),
                    audit.getReason(),
                    audit.getCreatedAt());
        }
    }
}
