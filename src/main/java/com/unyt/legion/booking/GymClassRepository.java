package com.unyt.legion.booking;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface GymClassRepository extends JpaRepository<GymClass, UUID> {
    List<GymClass> findByActiveTrueAndStartsAtAfterOrderByStartsAtAsc(Instant now);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from GymClass c where c.id = :id")
    Optional<GymClass> findByIdForUpdate(@Param("id") UUID id);

    // Batch: classes-per-week count per trainer over a window.
    @Query("""
            select c.trainer.id, count(c) from GymClass c
            where c.active = true
              and c.startsAt >= :from and c.startsAt < :to
            group by c.trainer.id
            """)
    List<Object[]> countActiveClassesPerTrainer(@Param("from") Instant from, @Param("to") Instant to);

    // For payroll: classes that have already ended, per trainer.
    // Used to compute earnings = fee_per_class * count(classes taught).
    @Query("""
            select c.trainer.id, count(c) from GymClass c
            where c.endsAt <= :now
            group by c.trainer.id
            """)
    List<Object[]> countTaughtClassesPerTrainer(@Param("now") Instant now);
}
