package com.unyt.legion.subscription;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserSubscriptionRepository extends JpaRepository<UserSubscription, UUID> {
    Optional<UserSubscription> findByUserIdAndIdempotencyKey(UUID userId, String idempotencyKey);

    List<UserSubscription> findByUserIdOrderByCreatedAtDesc(UUID userId);

    Optional<UserSubscription> findFirstByUserIdAndStatusAndEndsAtAfterOrderByEndsAtDesc(
            UUID userId,
            SubscriptionStatus status,
            Instant now);
}
