package com.unyt.legion.notification;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    List<Notification> findTop50ByUserIdOrderByCreatedAtDesc(UUID userId);

    Optional<Notification> findByIdAndUserId(UUID id, UUID userId);
}
