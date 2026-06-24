package com.unyt.legion.booking;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/bookings")
public class AdminBookingController {

    private final ClassBookingRepository bookings;

    public AdminBookingController(ClassBookingRepository bookings) {
        this.bookings = bookings;
    }

    @GetMapping
    @Transactional(readOnly = true)
    List<BookingAdminResponse> list() {
        return bookings.findAllForAdmin().stream()
                .map(BookingAdminResponse::from)
                .toList();
    }

    record BookingAdminResponse(
            UUID id,
            String memberName,
            String memberEmail,
            String className,
            String trainerName,
            Instant startsAt,
            Instant endsAt,
            String status,
            Instant canceledAt) {
        static BookingAdminResponse from(ClassBooking b) {
            return new BookingAdminResponse(
                    b.getId(),
                    b.getUser().getFullName(),
                    b.getUser().getEmail(),
                    b.getGymClass().getTitle(),
                    b.getGymClass().getTrainer().getName(),
                    b.getGymClass().getStartsAt(),
                    b.getGymClass().getEndsAt(),
                    b.getStatus().name(),
                    b.getCanceledAt());
        }
    }
}
