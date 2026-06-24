package com.unyt.legion.notification;

import com.unyt.legion.security.SecurityUtils;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationRepository notifications;

    public NotificationController(NotificationRepository notifications) {
        this.notifications = notifications;
    }

    @GetMapping
    @Transactional(readOnly = true)
    List<NotificationResponse> list() {
        UUID userId = SecurityUtils.currentUserId();
        return notifications.findTop50ByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(NotificationResponse::from)
                .toList();
    }

    @PatchMapping("/{id}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    void markRead(@PathVariable UUID id) {
        UUID userId = SecurityUtils.currentUserId();
        Notification notification = notifications.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));
        notification.setReadAt(Instant.now());
    }

    record NotificationResponse(UUID id, String type, String message, Instant readAt, Instant createdAt) {
        static NotificationResponse from(Notification notification) {
            return new NotificationResponse(
                    notification.getId(),
                    notification.getType(),
                    notification.getMessage(),
                    notification.getReadAt(),
                    notification.getCreatedAt());
        }
    }
}
