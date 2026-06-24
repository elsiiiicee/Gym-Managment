package com.unyt.legion.booking;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
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
@RequestMapping("/api/admin/classes")
public class AdminClassController {
    private final GymClassRepository classes;
    private final ClassBookingRepository bookings;
    private final BookingService service;

    public AdminClassController(GymClassRepository classes, ClassBookingRepository bookings, BookingService service) {
        this.classes = classes;
        this.bookings = bookings;
        this.service = service;
    }

    @GetMapping
    @Transactional(readOnly = true)
    List<ClassAdminResponse> list() {
        Map<UUID, Long> enrolled = new HashMap<>();
        for (Object[] row : bookings.countEnrolledByClass()) {
            enrolled.put((UUID) row[0], (Long) row[1]);
        }
        return classes.findAll().stream()
                .map(c -> ClassAdminResponse.from(c, enrolled.getOrDefault(c.getId(), 0L).intValue()))
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    ClassAdminResponse create(@Valid @RequestBody ClassRequest request) {
        return ClassAdminResponse.from(service.createClass(
                request.trainerId(),
                request.title(),
                request.description(),
                request.startsAt(),
                request.endsAt(),
                request.capacity(),
                request.category(),
                request.priceCents() == null ? 0L : request.priceCents()), 0);
    }

    @PutMapping("/{id}")
    @Transactional
    ClassAdminResponse update(@PathVariable UUID id, @Valid @RequestBody ClassUpdateRequest request) {
        GymClass updated = service.updateClass(
                id,
                request.trainerId(),
                request.title(),
                request.description(),
                request.startsAt(),
                request.endsAt(),
                request.capacity(),
                request.active(),
                request.category(),
                request.priceCents());
        int enrolled = (int) bookings.countByGymClassIdAndStatus(updated.getId(), BookingStatus.BOOKED);
        return ClassAdminResponse.from(updated, enrolled);
    }

    // Soft-delete: mark inactive. Hard delete is intentionally avoided so
    // existing bookings keep their referential integrity.
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    void deactivate(@PathVariable UUID id) {
        GymClass gymClass = classes.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Class not found"));
        gymClass.setActive(false);
    }

    record ClassRequest(@NotNull UUID trainerId, @NotBlank @Size(max = 160) String title,
            @NotBlank @Size(max = 1000) String description, @Future Instant startsAt,
            @NotNull Instant endsAt, @Min(1) @Max(500) int capacity,
            @Size(max = 60) String category,
            @PositiveOrZero Long priceCents) {
    }

    record ClassUpdateRequest(@NotNull UUID trainerId, @NotBlank @Size(max = 160) String title,
            @NotBlank @Size(max = 1000) String description, @NotNull Instant startsAt,
            @NotNull Instant endsAt, @Min(1) @Max(500) int capacity, boolean active,
            @Size(max = 60) String category,
            @PositiveOrZero Long priceCents) {
    }

    record ClassAdminResponse(
            UUID id,
            String title,
            String description,
            String trainerName,
            UUID trainerId,
            Instant startsAt,
            Instant endsAt,
            int capacity,
            int enrolled,
            int durationMin,
            String category,
            long priceCents,
            boolean active) {
        static ClassAdminResponse from(GymClass gymClass, int enrolled) {
            int durationMin = (int) Duration.between(gymClass.getStartsAt(), gymClass.getEndsAt()).toMinutes();
            return new ClassAdminResponse(
                    gymClass.getId(),
                    gymClass.getTitle(),
                    gymClass.getDescription(),
                    gymClass.getTrainer().getName(),
                    gymClass.getTrainer().getId(),
                    gymClass.getStartsAt(),
                    gymClass.getEndsAt(),
                    gymClass.getCapacity(),
                    enrolled,
                    durationMin,
                    gymClass.getCategory() == null ? "" : gymClass.getCategory(),
                    gymClass.getPriceCents(),
                    gymClass.isActive());
        }
    }
}
