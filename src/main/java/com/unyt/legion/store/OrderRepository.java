package com.unyt.legion.store;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderRepository extends JpaRepository<CustomerOrder, UUID> {
    Optional<CustomerOrder> findByUserIdAndIdempotencyKey(UUID userId, String idempotencyKey);

    List<CustomerOrder> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
