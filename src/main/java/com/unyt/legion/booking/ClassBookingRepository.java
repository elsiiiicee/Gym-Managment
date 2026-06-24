package com.unyt.legion.booking;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ClassBookingRepository extends JpaRepository<ClassBooking, UUID> {
    Optional<ClassBooking> findByUserIdAndGymClassId(UUID userId, UUID classId);

    Optional<ClassBooking> findByIdAndUserId(UUID id, UUID userId);

    long countByGymClassIdAndStatus(UUID classId, BookingStatus status);

    List<ClassBooking> findByUserIdOrderByCreatedAtDesc(UUID userId);

    @Query("""
            select count(b) from ClassBooking b
            where b.user.id = :userId
              and b.status = com.unyt.legion.booking.BookingStatus.BOOKED
              and b.gymClass.startsAt < :endsAt
              and b.gymClass.endsAt > :startsAt
            """)
    long countOverlappingBookings(@Param("userId") UUID userId, @Param("startsAt") Instant startsAt, @Param("endsAt") Instant endsAt);

    // Batch enrollment counts for the admin class list (avoids N+1).
    @Query("""
            select b.gymClass.id, count(b) from ClassBooking b
            where b.status = com.unyt.legion.booking.BookingStatus.BOOKED
            group by b.gymClass.id
            """)
    List<Object[]> countEnrolledByClass();

    // Admin: list all bookings ordered newest-first. Returns the booking
    // with its class + member eagerly available (no lazy access past tx).
    @Query("""
            select b from ClassBooking b
            join fetch b.user u
            join fetch b.gymClass c
            join fetch c.trainer t
            order by c.startsAt desc
            """)
    List<ClassBooking> findAllForAdmin();
}
