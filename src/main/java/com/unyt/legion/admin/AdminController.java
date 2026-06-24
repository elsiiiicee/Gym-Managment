package com.unyt.legion.admin;

import com.unyt.legion.booking.ClassBookingRepository;
import com.unyt.legion.booking.GymClassRepository;
import com.unyt.legion.notification.NotificationService;
import com.unyt.legion.security.SecurityUtils;
import com.unyt.legion.store.OrderRepository;
import com.unyt.legion.store.ProductRepository;
import com.unyt.legion.subscription.UserSubscriptionRepository;
import com.unyt.legion.user.AppUser;
import com.unyt.legion.user.Profile;
import com.unyt.legion.user.ProfileRepository;
import com.unyt.legion.user.UserRepository;
import com.unyt.legion.user.UserRole;
import com.unyt.legion.wallet.WalletService;
import com.unyt.legion.wallet.WalletTransactionType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final UserRepository users;
    private final ProfileRepository profiles;
    private final ProductRepository products;
    private final OrderRepository orders;
    private final UserSubscriptionRepository subscriptions;
    private final GymClassRepository classes;
    private final ClassBookingRepository bookings;
    private final PasswordEncoder passwordEncoder;
    private final WalletService wallets;
    private final NotificationService notifications;

    public AdminController(
            UserRepository users,
            ProfileRepository profiles,
            ProductRepository products,
            OrderRepository orders,
            UserSubscriptionRepository subscriptions,
            GymClassRepository classes,
            ClassBookingRepository bookings,
            PasswordEncoder passwordEncoder,
            WalletService wallets,
            NotificationService notifications) {
        this.users = users;
        this.profiles = profiles;
        this.products = products;
        this.orders = orders;
        this.subscriptions = subscriptions;
        this.classes = classes;
        this.bookings = bookings;
        this.passwordEncoder = passwordEncoder;
        this.wallets = wallets;
        this.notifications = notifications;
    }

    @GetMapping("/users")
    @Transactional(readOnly = true)
    List<UserAdminResponse> users() {
        return users.findAll().stream().map(UserAdminResponse::from).toList();
    }

    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    UserAdminResponse createUser(@Valid @RequestBody UserAdminCreateRequest request) {
        String normalizedEmail = request.email().trim().toLowerCase(Locale.ROOT);
        if (users.findByEmail(normalizedEmail).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }
        AppUser user = users.save(new AppUser(
                normalizedEmail,
                passwordEncoder.encode(request.password()),
                request.fullName().trim(),
                request.role() == null ? UserRole.USER : request.role()));
        if (!request.active()) {
            user.setActive(false);
        }
        profiles.save(new Profile(user, user.getFullName()));
        if (request.welcomeCreditCents() != null && request.welcomeCreditCents() > 0) {
            wallets.adminCredit(
                    user.getId(),
                    SecurityUtils.currentUserId(),
                    request.welcomeCreditCents(),
                    WalletTransactionType.CREDIT_ADD,
                    "Welcome credit",
                    "welcome-" + user.getId());
        }
        notifications.notify(user, "ACCOUNT_CREATED", "Your Legion account is ready");
        return UserAdminResponse.from(user);
    }

    @PatchMapping("/users/{id}")
    @Transactional
    UserAdminResponse updateUser(@PathVariable UUID id, @Valid @RequestBody UserAdminUpdateRequest request) {
        UUID currentUserId = SecurityUtils.currentUserId();
        AppUser user = users.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        if (user.getId().equals(currentUserId) && (!request.active() || request.role() != user.getRole())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Admins cannot change their own role or active status");
        }
        if (user.getRole() == UserRole.ADMIN && request.role() != UserRole.ADMIN
                && users.countByRoleAndActiveTrue(UserRole.ADMIN) <= 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot remove the last active admin");
        }
        user.setRole(request.role());
        user.setActive(request.active());
        return UserAdminResponse.from(user);
    }

    @DeleteMapping("/users/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    void deleteUser(@PathVariable UUID id) {
        UUID currentUserId = SecurityUtils.currentUserId();
        AppUser user = users.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        if (user.getRole() != UserRole.USER) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only member accounts can be deleted");
        }
        if (user.getId().equals(currentUserId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Admins cannot delete their own account");
        }
        users.delete(user);
    }

    /**
     * Bounded executor for the dashboard fan-out. Daemon threads so it
     * never blocks JVM shutdown. Sized for the 7 independent counts we
     * dispatch; tuning beyond this is premature.
     */
    private static final ExecutorService ANALYTICS_EXECUTOR =
            Executors.newFixedThreadPool(7, runnable -> {
                Thread t = new Thread(runnable, "analytics-worker");
                t.setDaemon(true);
                return t;
            });

    /**
     * Dashboard analytics. We fan the seven independent reads out across
     * a small thread pool so the page loads in roughly one query-latency
     * instead of seven. Each CompletableFuture runs its own short
     * transaction (Spring opens one per repository call), so there's no
     * shared Hibernate session and no thread-safety concern.
     *
     * NOTE: The outer method is NOT {@code @Transactional}. If it were,
     * Spring would propagate the transaction onto worker threads, where
     * the EntityManager is not thread-safe.
     */
    @GetMapping("/analytics")
    AnalyticsResponse analytics() {
        CompletableFuture<Long> usersF =
                CompletableFuture.supplyAsync(users::count, ANALYTICS_EXECUTOR);
        CompletableFuture<Long> productsF =
                CompletableFuture.supplyAsync(products::count, ANALYTICS_EXECUTOR);
        CompletableFuture<Long> ordersF =
                CompletableFuture.supplyAsync(orders::count, ANALYTICS_EXECUTOR);
        CompletableFuture<Long> subscriptionsF =
                CompletableFuture.supplyAsync(subscriptions::count, ANALYTICS_EXECUTOR);
        CompletableFuture<Long> classesF =
                CompletableFuture.supplyAsync(classes::count, ANALYTICS_EXECUTOR);
        CompletableFuture<Long> bookingsF =
                CompletableFuture.supplyAsync(bookings::count, ANALYTICS_EXECUTOR);
        CompletableFuture<Long> revenueF = CompletableFuture.supplyAsync(
                () -> orders.findAll().stream().mapToLong(order -> order.getTotalCents()).sum(),
                ANALYTICS_EXECUTOR);

        // Wait for all seven, then assemble. join() rethrows the first
        // failure unwrapped, so any DB error surfaces as a 500 via the
        // GlobalExceptionHandler.
        CompletableFuture.allOf(
                usersF, productsF, ordersF, subscriptionsF,
                classesF, bookingsF, revenueF
        ).join();

        return new AnalyticsResponse(
                usersF.join(),
                productsF.join(),
                ordersF.join(),
                revenueF.join(),
                subscriptionsF.join(),
                classesF.join(),
                bookingsF.join());
    }

    record UserAdminUpdateRequest(@NotNull UserRole role, boolean active) {
    }

    record UserAdminCreateRequest(
            @Email @NotBlank @Size(max = 320) String email,
            @NotBlank @Size(min = 12, max = 128) String password,
            @NotBlank @Size(max = 120) String fullName,
            UserRole role,
            boolean active,
            @PositiveOrZero Long welcomeCreditCents) {
    }

    record UserAdminResponse(UUID id, String email, String fullName, String role, boolean active, Instant joined) {
        static UserAdminResponse from(AppUser user) {
            return new UserAdminResponse(
                    user.getId(),
                    user.getEmail(),
                    user.getFullName(),
                    user.getRole().name(),
                    user.isActive(),
                    user.getCreatedAt());
        }
    }

    record AnalyticsResponse(long users, long products, long orders, long revenueCents, long subscriptions, long classes,
            long bookings) {
    }
}
