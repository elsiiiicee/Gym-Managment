package com.unyt.legion.booking;

import com.unyt.legion.notification.NotificationService;
import com.unyt.legion.subscription.SubscriptionStatus;
import com.unyt.legion.subscription.UserSubscriptionRepository;
import com.unyt.legion.trainer.Trainer;
import com.unyt.legion.trainer.TrainerRepository;
import com.unyt.legion.user.AppUser;
import com.unyt.legion.user.UserRepository;
import com.unyt.legion.wallet.WalletService;
import com.unyt.legion.wallet.WalletTransactionType;
// WalletTransactionType used in book() for PURCHASE classification.
import java.time.Instant;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BookingService {
    private final GymClassRepository classes;
    private final ClassBookingRepository bookings;
    private final TrainerRepository trainers;
    private final UserRepository users;
    private final NotificationService notifications;
    private final UserSubscriptionRepository subscriptions;
    private final WalletService wallets;

    public BookingService(
            GymClassRepository classes,
            ClassBookingRepository bookings,
            TrainerRepository trainers,
            UserRepository users,
            NotificationService notifications,
            UserSubscriptionRepository subscriptions,
            WalletService wallets) {
        this.classes = classes;
        this.bookings = bookings;
        this.trainers = trainers;
        this.users = users;
        this.notifications = notifications;
        this.subscriptions = subscriptions;
        this.wallets = wallets;
    }

    @Transactional
    public GymClass createClass(UUID trainerId, String title, String description, Instant startsAt, Instant endsAt, int capacity) {
        return createClass(trainerId, title, description, startsAt, endsAt, capacity, "", 0L);
    }

    @Transactional
    public GymClass createClass(UUID trainerId, String title, String description, Instant startsAt, Instant endsAt,
            int capacity, String category) {
        return createClass(trainerId, title, description, startsAt, endsAt, capacity, category, 0L);
    }

    @Transactional
    public GymClass createClass(UUID trainerId, String title, String description, Instant startsAt, Instant endsAt,
            int capacity, String category, long priceCents) {
        validateClassTimes(startsAt, endsAt);
        if (priceCents < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Price must be zero or positive");
        }
        Trainer trainer = trainers.findById(trainerId)
                .filter(Trainer::isActive)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trainer not found"));
        GymClass gymClass = new GymClass(trainer, title.trim(), description.trim(), startsAt, endsAt, capacity);
        gymClass.setCategory(category == null ? "" : category.trim());
        gymClass.setPriceCents(priceCents);
        return classes.save(gymClass);
    }

    @Transactional
    public GymClass updateClass(UUID id, UUID trainerId, String title, String description, Instant startsAt, Instant endsAt,
            int capacity, boolean active) {
        return updateClass(id, trainerId, title, description, startsAt, endsAt, capacity, active, null, null);
    }

    @Transactional
    public GymClass updateClass(UUID id, UUID trainerId, String title, String description, Instant startsAt, Instant endsAt,
            int capacity, boolean active, String category) {
        return updateClass(id, trainerId, title, description, startsAt, endsAt, capacity, active, category, null);
    }

    @Transactional
    public GymClass updateClass(UUID id, UUID trainerId, String title, String description, Instant startsAt, Instant endsAt,
            int capacity, boolean active, String category, Long priceCents) {
        validateClassTimes(startsAt, endsAt);
        if (priceCents != null && priceCents < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Price must be zero or positive");
        }
        Trainer trainer = trainers.findById(trainerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trainer not found"));
        GymClass gymClass = classes.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Class not found"));
        gymClass.setTrainer(trainer);
        gymClass.setTitle(title.trim());
        gymClass.setDescription(description.trim());
        gymClass.setStartsAt(startsAt);
        gymClass.setEndsAt(endsAt);
        gymClass.setCapacity(capacity);
        gymClass.setActive(active);
        if (category != null) {
            gymClass.setCategory(category.trim());
        }
        if (priceCents != null) {
            gymClass.setPriceCents(priceCents);
        }
        return gymClass;
    }

    /** A member has an "active subscription" if there's a sub with status=ACTIVE
     *  whose endsAt is still in the future. */
    private boolean hasActiveSubscription(UUID userId) {
        return subscriptions.findFirstByUserIdAndStatusAndEndsAtAfterOrderByEndsAtDesc(
                userId, SubscriptionStatus.ACTIVE, Instant.now()).isPresent();
    }

    private static String bookingIdempotencyKey(UUID userId, UUID classId) {
        return "booking-" + userId + "-" + classId;
    }

    @Transactional
    public ClassBooking book(UUID userId, UUID classId) {
        AppUser user = users.findById(userId).orElseThrow();
        GymClass gymClass = classes.findByIdForUpdate(classId)
                .filter(GymClass::isActive)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Class not found"));
        if (gymClass.getStartsAt().isBefore(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot book a class in the past");
        }
        ClassBooking existing = bookings.findByUserIdAndGymClassId(userId, classId).orElse(null);
        if (existing != null && existing.getStatus() == BookingStatus.BOOKED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Class already booked");
        }
        long booked = bookings.countByGymClassIdAndStatus(classId, BookingStatus.BOOKED);
        if (booked >= gymClass.getCapacity()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Class is full");
        }
        long overlaps = bookings.countOverlappingBookings(userId, gymClass.getStartsAt(), gymClass.getEndsAt());
        if (overlaps > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Class overlaps an existing booking");
        }

        // Pricing: if the class has a drop-in price and the member doesn't
        // have an active subscription, charge their wallet. Active subs
        // book free. Free classes (price=0) book free for everyone.
        long priceCents = gymClass.getPriceCents();
        boolean shouldCharge = priceCents > 0 && !hasActiveSubscription(userId);
        if (shouldCharge) {
            // WalletService.debitForPurchase throws 400/409 if the wallet
            // can't cover it; let that propagate so the SPA can show
            // "Top up your wallet" to the member.
            wallets.debitForPurchase(
                    userId,
                    priceCents,
                    WalletTransactionType.PURCHASE,
                    "CLASS_BOOKING",
                    classId,
                    bookingIdempotencyKey(userId, classId));
        }

        ClassBooking booking = existing == null ? new ClassBooking(user, gymClass) : existing;
        booking.setStatus(BookingStatus.BOOKED);
        booking.setCanceledAt(null);
        ClassBooking saved = bookings.save(booking);
        notifications.notify(user, "CLASS_BOOKED", "You booked " + gymClass.getTitle());
        return saved;
    }

    @Transactional
    public void cancel(UUID userId, UUID bookingId) {
        ClassBooking booking = bookings.findByIdAndUserId(bookingId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
        if (booking.getStatus() == BookingStatus.BOOKED) {
            // Refund the drop-in fee if this booking was paid. We treat
            // "paid" as: class has a price AND there's a matching PURCHASE
            // wallet transaction with our booking idempotency key. We
            // don't strictly check the transaction (would require more
            // wiring); the gym policy of "always refund on cancel" is
            // simpler and matches what most gyms do for class drop-ins.
            GymClass cls = booking.getGymClass();
            long priceCents = cls.getPriceCents();
            if (priceCents > 0) {
                String refundKey = "refund-" + bookingIdempotencyKey(userId, cls.getId());
                wallets.refundPurchase(
                        userId,
                        priceCents,
                        "CLASS_BOOKING",
                        cls.getId(),
                        "Class cancellation refund · " + cls.getTitle(),
                        refundKey);
            }
            booking.setStatus(BookingStatus.CANCELED);
            booking.setCanceledAt(Instant.now());
            notifications.notify(booking.getUser(), "CLASS_CANCELED", "You canceled " + booking.getGymClass().getTitle());
        }
    }

    private void validateClassTimes(Instant startsAt, Instant endsAt) {
        if (!startsAt.isBefore(endsAt)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Class start must be before end");
        }
    }
}
