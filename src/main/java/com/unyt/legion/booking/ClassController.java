package com.unyt.legion.booking;

import com.unyt.legion.security.SecurityUtils;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ClassController {
    private final GymClassRepository classes;
    private final ClassBookingRepository bookings;
    private final BookingService service;

    public ClassController(GymClassRepository classes, ClassBookingRepository bookings, BookingService service) {
        this.classes = classes;
        this.bookings = bookings;
        this.service = service;
    }

    @GetMapping("/api/classes")
    @Transactional(readOnly = true)
    List<ClassResponse> upcoming() {
        return classes.findByActiveTrueAndStartsAtAfterOrderByStartsAtAsc(Instant.now()).stream()
                .map(ClassResponse::from)
                .toList();
    }

    @PostMapping("/api/bookings")
    @ResponseStatus(HttpStatus.CREATED)
    BookingResponse book(@Valid @RequestBody BookingRequest request) {
        return BookingResponse.from(service.book(SecurityUtils.currentUserId(), request.classId()));
    }

    @GetMapping("/api/bookings")
    @Transactional(readOnly = true)
    List<BookingResponse> mine() {
        return bookings.findByUserIdOrderByCreatedAtDesc(SecurityUtils.currentUserId()).stream()
                .map(BookingResponse::from)
                .toList();
    }

    @DeleteMapping("/api/bookings/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void cancel(@PathVariable UUID id) {
        service.cancel(SecurityUtils.currentUserId(), id);
    }

    record BookingRequest(@NotNull UUID classId) {
    }

    public record ClassResponse(
            UUID id,
            String title,
            String trainerName,
            Instant startsAt,
            Instant endsAt,
            int capacity,
            long priceCents) {
        public static ClassResponse from(GymClass gymClass) {
            return new ClassResponse(
                    gymClass.getId(),
                    gymClass.getTitle(),
                    gymClass.getTrainer().getName(),
                    gymClass.getStartsAt(),
                    gymClass.getEndsAt(),
                    gymClass.getCapacity(),
                    gymClass.getPriceCents());
        }
    }

    record BookingResponse(UUID id, UUID classId, String title, String status, Instant startsAt, Instant endsAt) {
        static BookingResponse from(ClassBooking booking) {
            return new BookingResponse(
                    booking.getId(),
                    booking.getGymClass().getId(),
                    booking.getGymClass().getTitle(),
                    booking.getStatus().name(),
                    booking.getGymClass().getStartsAt(),
                    booking.getGymClass().getEndsAt());
        }
    }
}
