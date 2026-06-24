package com.unyt.legion.wallet;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.unyt.legion.user.AppUser;
import com.unyt.legion.user.UserRepository;
import com.unyt.legion.user.UserRole;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

@SpringBootTest
class WalletServiceTest {

    @Autowired
    private WalletService walletService;

    @Autowired
    private WalletRepository wallets;

    @Autowired
    private WalletTransactionRepository transactions;

    @Autowired
    private UserRepository users;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void adminCreditCreatesWalletAndIncrementsBalance() {
        AppUser user = createUser("credit-init");
        AppUser admin = createAdmin();

        WalletTransaction tx = walletService.adminCredit(
                user.getId(), admin.getId(), 5_000,
                WalletTransactionType.CREDIT_ADD, "cash at front desk", idem());

        assertThat(tx.getAmountCents()).isEqualTo(5_000);
        assertThat(tx.getBalanceAfterCents()).isEqualTo(5_000);
        assertThat(tx.getCreatedByAdminId()).isEqualTo(admin.getId());
        assertThat(tx.getTransactionType()).isEqualTo(WalletTransactionType.CREDIT_ADD);
        assertThat(wallets.findByUserId(user.getId()).orElseThrow().getBalanceCents()).isEqualTo(5_000);
    }

    @Test
    void duplicateIdempotencyKeyReturnsExistingTransactionAndDoesNotDoubleCharge() {
        AppUser user = createUser("idem-test");
        AppUser admin = createAdmin();
        String key = idem();

        WalletTransaction first = walletService.adminCredit(
                user.getId(), admin.getId(), 1_000, WalletTransactionType.CREDIT_ADD, "first", key);
        WalletTransaction second = walletService.adminCredit(
                user.getId(), admin.getId(), 9_999, WalletTransactionType.CREDIT_ADD, "second attempt", key);

        assertThat(second.getId()).isEqualTo(first.getId());
        assertThat(wallets.findByUserId(user.getId()).orElseThrow().getBalanceCents()).isEqualTo(1_000);
        assertThat(transactions.findByWalletIdOrderByCreatedAtDesc(first.getWallet().getId())).hasSize(1);
    }

    @Test
    void debitBelowBalanceFailsWithConflict() {
        AppUser user = createUser("neg-balance");
        AppUser admin = createAdmin();
        walletService.adminCredit(user.getId(), admin.getId(), 500,
                WalletTransactionType.CREDIT_ADD, "seed", idem());

        // Insufficient balance surfaces as InsufficientWalletBalanceException,
        // which the GlobalExceptionHandler maps to HTTP 402 Payment Required.
        assertThatThrownBy(() -> walletService.debitForPurchase(
                user.getId(), 1_000, WalletTransactionType.PURCHASE, "ORDER", UUID.randomUUID(), idem()))
                .isInstanceOf(InsufficientWalletBalanceException.class);

        assertThat(wallets.findByUserId(user.getId()).orElseThrow().getBalanceCents()).isEqualTo(500);
    }

    @Test
    void adminAdjustmentCanReduceBalanceButNotBelowZero() {
        AppUser user = createUser("adj-test");
        AppUser admin = createAdmin();
        walletService.adminCredit(user.getId(), admin.getId(), 2_000,
                WalletTransactionType.CREDIT_ADD, "seed", idem());

        WalletTransaction debit = walletService.adminDebit(
                user.getId(), admin.getId(), 700,
                WalletTransactionType.ADMIN_ADJUSTMENT, "promo correction", idem());
        assertThat(debit.getAmountCents()).isEqualTo(-700);
        assertThat(debit.getBalanceAfterCents()).isEqualTo(1_300);

        // Cannot adjust below zero.
        assertThatThrownBy(() -> walletService.adminDebit(
                user.getId(), admin.getId(), 9_999,
                WalletTransactionType.ADMIN_ADJUSTMENT, "too much", idem()))
                .isInstanceOf(InsufficientWalletBalanceException.class);
        assertThat(wallets.findByUserId(user.getId()).orElseThrow().getBalanceCents()).isEqualTo(1_300);
    }

    @Test
    void refundIsModeledAsAdminCreditWithRefundType() {
        AppUser user = createUser("refund");
        AppUser admin = createAdmin();
        walletService.adminCredit(user.getId(), admin.getId(), 2_000,
                WalletTransactionType.CREDIT_ADD, "seed", idem());
        walletService.debitForPurchase(user.getId(), 500,
                WalletTransactionType.PURCHASE, "ORDER", UUID.randomUUID(), idem());

        WalletTransaction refund = walletService.adminCredit(
                user.getId(), admin.getId(), 500,
                WalletTransactionType.REFUND, "returned item", idem());

        assertThat(refund.getTransactionType()).isEqualTo(WalletTransactionType.REFUND);
        assertThat(refund.getAmountCents()).isEqualTo(500);
        assertThat(refund.getBalanceAfterCents()).isEqualTo(2_000);
    }

    @Test
    void zeroOrNegativeCreditAmountRejected() {
        AppUser user = createUser("amount-validation");
        AppUser admin = createAdmin();

        assertThatThrownBy(() -> walletService.adminCredit(
                user.getId(), admin.getId(), 0, WalletTransactionType.CREDIT_ADD, "n", idem()))
                .isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> walletService.adminCredit(
                user.getId(), admin.getId(), -100, WalletTransactionType.CREDIT_ADD, "n", idem()))
                .isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> walletService.adminDebit(
                user.getId(), admin.getId(), 0, WalletTransactionType.ADMIN_ADJUSTMENT, "n", idem()))
                .isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> walletService.debitForPurchase(
                user.getId(), -1, WalletTransactionType.PURCHASE, "ORDER", UUID.randomUUID(), idem()))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void transactionTypeMustMatchOperation() {
        AppUser user = createUser("type-validation");
        AppUser admin = createAdmin();

        // CREDIT must use a credit-shaped type, not PURCHASE.
        assertThatThrownBy(() -> walletService.adminCredit(
                user.getId(), admin.getId(), 100, WalletTransactionType.PURCHASE, "wrong", idem()))
                .isInstanceOf(ResponseStatusException.class);

        // DEBIT (admin) must be ADMIN_ADJUSTMENT, not CREDIT_ADD.
        assertThatThrownBy(() -> walletService.adminDebit(
                user.getId(), admin.getId(), 100, WalletTransactionType.CREDIT_ADD, "wrong", idem()))
                .isInstanceOf(ResponseStatusException.class);

        // PURCHASE debit cannot be ADMIN_ADJUSTMENT.
        assertThatThrownBy(() -> walletService.debitForPurchase(
                user.getId(), 100, WalletTransactionType.ADMIN_ADJUSTMENT, "ORDER", UUID.randomUUID(), idem()))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void getOrCreateWalletIsIdempotentAndReturnsExistingWallet() {
        AppUser user = createUser("get-or-create");
        Wallet first = walletService.getOrCreateWallet(user.getId());
        Wallet second = walletService.getOrCreateWallet(user.getId());
        assertThat(second.getId()).isEqualTo(first.getId());
    }

    @Test
    void requireWalletThrowsWhenWalletMissing() {
        UUID nonexistent = UUID.randomUUID();
        assertThatThrownBy(() -> walletService.requireWallet(nonexistent))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    /**
     * Concurrent debits must not oversell the wallet. Two threads each try to
     * spend 600 from a 1000-balance wallet using distinct idempotency keys;
     * exactly one debit succeeds, the other fails with an insufficient-balance
     * error, and the final balance is 400 (not -200).
     */
    @Test
    void concurrentDebitsCannotOversellWallet() throws Exception {
        AppUser user = createUser("concurrent-debit");
        AppUser admin = createAdmin();
        walletService.adminCredit(user.getId(), admin.getId(), 1_000,
                WalletTransactionType.CREDIT_ADD, "seed", idem());

        Callable<Boolean> attempt = () -> {
            try {
                walletService.debitForPurchase(
                        user.getId(), 600,
                        WalletTransactionType.PURCHASE,
                        "ORDER", UUID.randomUUID(), idem());
                return true;
            } catch (InsufficientWalletBalanceException ex) {
                return false;
            }
        };

        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Future<Boolean> f1 = pool.submit(attempt);
            Future<Boolean> f2 = pool.submit(attempt);
            AtomicInteger successes = new AtomicInteger();
            if (f1.get(15, TimeUnit.SECONDS)) successes.incrementAndGet();
            if (f2.get(15, TimeUnit.SECONDS)) successes.incrementAndGet();
            assertThat(successes.get()).isEqualTo(1);
        } finally {
            pool.shutdownNow();
        }

        long balance = wallets.findByUserId(user.getId()).orElseThrow().getBalanceCents();
        assertThat(balance).isEqualTo(400);
    }

    private AppUser createUser(String tag) {
        return users.save(new AppUser(
                tag + "-" + UUID.randomUUID() + "@example.com",
                passwordEncoder.encode("VeryStrongPassword123!"),
                "User " + tag,
                UserRole.USER));
    }

    private AppUser createAdmin() {
        return users.save(new AppUser(
                "admin-" + UUID.randomUUID() + "@example.com",
                passwordEncoder.encode("AdminStrongPassword123!"),
                "Admin",
                UserRole.ADMIN));
    }

    private String idem() {
        return "idem-" + UUID.randomUUID();
    }
}
