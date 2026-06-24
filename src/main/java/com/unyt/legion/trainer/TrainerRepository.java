package com.unyt.legion.trainer;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface TrainerRepository extends JpaRepository<Trainer, UUID> {
    List<Trainer> findByActiveTrueOrderByNameAsc();

    // Eager-fetch linked user for admin list so trainer.user.email is safe
    // to access after the read-only transaction returns. Required because
    // open-in-view is disabled.
    @Query("select t from Trainer t left join fetch t.user order by t.name asc")
    List<Trainer> findAllForAdmin();
}
