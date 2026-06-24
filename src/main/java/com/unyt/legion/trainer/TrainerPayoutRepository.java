package com.unyt.legion.trainer;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface TrainerPayoutRepository extends JpaRepository<TrainerPayout, UUID> {

    Optional<TrainerPayout> findByTrainerIdAndIdempotencyKey(UUID trainerId, String idempotencyKey);

    // Sum of payouts per trainer (long, may be null if trainer has no payouts).
    @Query("""
            select p.trainer.id, coalesce(sum(p.amountCents), 0)
            from TrainerPayout p
            group by p.trainer.id
            """)
    List<Object[]> sumPaidByTrainer();
}
