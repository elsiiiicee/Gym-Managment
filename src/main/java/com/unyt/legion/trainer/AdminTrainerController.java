package com.unyt.legion.trainer;

import com.unyt.legion.booking.GymClassRepository;
import com.unyt.legion.user.AppUser;
import com.unyt.legion.user.UserRepository;
import com.unyt.legion.user.UserRole;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/admin/trainers")
public class AdminTrainerController {
    private final TrainerRepository trainers;
    private final UserRepository users;
    private final GymClassRepository classes;

    public AdminTrainerController(TrainerRepository trainers, UserRepository users, GymClassRepository classes) {
        this.trainers = trainers;
        this.users = users;
        this.classes = classes;
    }

    @GetMapping
    @Transactional(readOnly = true)
    List<TrainerAdminResponse> list() {
        Instant now = Instant.now();
        Instant weekFromNow = now.plus(Duration.ofDays(7));
        Map<UUID, Long> perWeek = new HashMap<>();
        for (Object[] row : classes.countActiveClassesPerTrainer(now, weekFromNow)) {
            perWeek.put((UUID) row[0], (Long) row[1]);
        }
        return trainers.findAllForAdmin().stream()
                .map(t -> TrainerAdminResponse.from(t, perWeek.getOrDefault(t.getId(), 0L).intValue()))
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    TrainerAdminResponse create(@Valid @RequestBody TrainerRequest request) {
        AppUser user = request.userId() == null ? null : users.findById(request.userId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        if (user != null) {
            user.setRole(UserRole.TRAINER);
        }
        Trainer trainer = new Trainer(
                user,
                request.name().trim(),
                request.specialty().trim(),
                request.bio().trim());
        trainer.setRating(request.rating());
        if (request.feePerClassCents() != null) {
            trainer.setFeePerClassCents(request.feePerClassCents());
        }
        return TrainerAdminResponse.from(trainers.save(trainer), 0);
    }

    @PutMapping("/{id}")
    @Transactional
    TrainerAdminResponse update(@PathVariable UUID id, @Valid @RequestBody TrainerUpdateRequest request) {
        Trainer trainer = trainers.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trainer not found"));
        trainer.setName(request.name().trim());
        trainer.setSpecialty(request.specialty().trim());
        trainer.setBio(request.bio().trim());
        trainer.setActive(request.active());
        if (request.rating() != null) {
            trainer.setRating(request.rating());
        }
        if (request.feePerClassCents() != null) {
            trainer.setFeePerClassCents(request.feePerClassCents());
        }
        return TrainerAdminResponse.from(trainer, 0);
    }

    record TrainerRequest(
            UUID userId,
            @NotBlank @Size(max = 120) String name,
            @NotBlank @Size(max = 120) String specialty,
            @NotBlank @Size(max = 1000) String bio,
            @DecimalMin("0.0") @DecimalMax("5.0") BigDecimal rating,
            @PositiveOrZero Long feePerClassCents) {
    }

    record TrainerUpdateRequest(
            @NotBlank @Size(max = 120) String name,
            @NotBlank @Size(max = 120) String specialty,
            @NotBlank @Size(max = 1000) String bio,
            boolean active,
            @DecimalMin("0.0") @DecimalMax("5.0") BigDecimal rating,
            @PositiveOrZero Long feePerClassCents) {
    }

    record TrainerAdminResponse(
            UUID id,
            String name,
            String email,
            String specialty,
            String bio,
            BigDecimal rating,
            int classesPerWeek,
            long feePerClassCents,
            boolean active) {
        static TrainerAdminResponse from(Trainer trainer, int classesPerWeek) {
            String email = trainer.getUser() == null ? null : trainer.getUser().getEmail();
            return new TrainerAdminResponse(
                    trainer.getId(),
                    trainer.getName(),
                    email,
                    trainer.getSpecialty(),
                    trainer.getBio(),
                    trainer.getRating(),
                    classesPerWeek,
                    trainer.getFeePerClassCents(),
                    trainer.isActive());
        }
    }
}
