package com.unyt.legion.wallet;

import com.unyt.legion.user.AppUser;
import com.unyt.legion.user.UserRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class WalletService {

    private final WalletRepository wallets;
    private final WalletTransactionRepository transactions;
    private final UserRepository users;

    public WalletService(
            WalletRepository wallets,
            WalletTransactionRepository transactions,
            UserRepository users) {
        this.wallets = wallets;
        this.transactions = transactions;
        this.users = users;
    }

    @Transactional
    public Wallet getOrCreateWallet(UUID userId) {
        return wallets.findByUserId(userId).orElseGet(() -> {
            AppUser user = users.findById(userId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
            return wallets.save(new Wallet(user));
        });
    }

    @Transactional(readOnly = true)
    public Wallet requireWallet(UUID userId) {
        return wallets.findByUserId(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Wallet not found"));
    }

    @Transactional(readOnly = true)
    public List<WalletTransaction> history(UUID walletId) {
        return transactions.findByWalletIdOrderByCreatedAtDesc(walletId);
    }

    @Transactional
    public WalletTransaction adminCredit(
            UUID userId,
            UUID adminId,
            long amountCents,
            WalletTransactionType type,
            String notes,
            String idempotencyKey) {
        if (amountCents <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Amount must be positive");
        }
        if (type != WalletTransactionType.CREDIT_ADD
                && type != WalletTransactionType.REFUND
                && type != WalletTransactionType.ADMIN_ADJUSTMENT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Credit type not allowed for this operation");
        }
        return applyAdminMutation(userId, adminId, amountCents, type, notes, idempotencyKey);
    }

    @Transactional
    public WalletTransaction adminDebit(
            UUID userId,
            UUID adminId,
            long amountCents,
            WalletTransactionType type,
            String notes,
            String idempotencyKey) {
        if (amountCents <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Amount must be positive");
        }
        if (type != WalletTransactionType.ADMIN_ADJUSTMENT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Debit type not allowed for this operation");
        }
        return applyAdminMutation(userId, adminId, -amountCents, type, notes, idempotencyKey);
    }

    @Transactional
    public WalletTransaction debitForPurchase(
            UUID userId,
            long amountCents,
            WalletTransactionType type,
            String referenceType,
            UUID referenceId,
            String idempotencyKey) {
        if (amountCents <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Amount must be positive");
        }
        if (type != WalletTransactionType.PURCHASE && type != WalletTransactionType.MEMBERSHIP_PAYMENT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Debit type not allowed for purchase");
        }
        Wallet wallet = lockWallet(userId);
        return transactions.findByWalletIdAndIdempotencyKey(wallet.getId(), idempotencyKey)
                .orElseGet(() -> recordTransaction(
                        wallet, -amountCents, type, null, referenceType, referenceId, null, idempotencyKey));
    }

    /**
     * Refund a previously-debited amount back to the member's wallet.
     * Used by BookingService when a member cancels a booking they paid for.
     * Idempotent on idempotencyKey.
     */
    @Transactional
    public WalletTransaction refundPurchase(
            UUID userId,
            long amountCents,
            String referenceType,
            UUID referenceId,
            String notes,
            String idempotencyKey) {
        if (amountCents <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Refund amount must be positive");
        }
        Wallet wallet = lockWallet(userId);
        return transactions.findByWalletIdAndIdempotencyKey(wallet.getId(), idempotencyKey)
                .orElseGet(() -> recordTransaction(
                        wallet, amountCents, WalletTransactionType.REFUND,
                        null, referenceType, referenceId, notes, idempotencyKey));
    }

    private WalletTransaction applyAdminMutation(
            UUID userId,
            UUID adminId,
            long signedAmount,
            WalletTransactionType type,
            String notes,
            String idempotencyKey) {
        Wallet wallet = lockWallet(userId);
        return transactions.findByWalletIdAndIdempotencyKey(wallet.getId(), idempotencyKey)
                .orElseGet(() -> recordTransaction(
                        wallet, signedAmount, type, adminId, null, null, notes, idempotencyKey));
    }

    private Wallet lockWallet(UUID userId) {
        return wallets.findByUserIdForUpdate(userId)
                .orElseGet(() -> {
                    AppUser user = users.findById(userId)
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
                    // First mutation for this user. Persist + flush so the row is visible
                    // for the pessimistic select-for-update on the same row, then re-fetch.
                    wallets.saveAndFlush(new Wallet(user));
                    return wallets.findByUserIdForUpdate(userId)
                            .orElseThrow(() -> new ResponseStatusException(
                                    HttpStatus.INTERNAL_SERVER_ERROR, "Wallet vanished after creation"));
                });
    }

    private WalletTransaction recordTransaction(
            Wallet wallet,
            long signedAmount,
            WalletTransactionType type,
            UUID adminId,
            String referenceType,
            UUID referenceId,
            String notes,
            String idempotencyKey) {
        long newBalance = wallet.getBalanceCents() + signedAmount;
        if (newBalance < 0) {
            // Negative signedAmount on a debit means abs() is what the caller
            // tried to spend. Surface both balance and required so the SPA
            // can show "Need $X more" without a second round-trip.
            throw new InsufficientWalletBalanceException(
                    wallet.getBalanceCents(),
                    Math.abs(signedAmount));
        }
        wallet.setBalanceCents(newBalance);
        wallets.save(wallet);
        return transactions.save(new WalletTransaction(
                wallet,
                signedAmount,
                newBalance,
                type,
                adminId,
                referenceType,
                referenceId,
                notes,
                idempotencyKey));
    }
}
