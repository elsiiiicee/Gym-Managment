package com.unyt.legion.wallet;

import com.unyt.legion.security.SecurityUtils;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/wallets")
public class AdminWalletController {

    private final WalletService wallets;
    private final WalletRepository walletRepo;
    private final WalletTransactionRepository txRepo;

    public AdminWalletController(WalletService wallets, WalletRepository walletRepo, WalletTransactionRepository txRepo) {
        this.wallets = wallets;
        this.walletRepo = walletRepo;
        this.txRepo = txRepo;
    }

    @GetMapping
    @Transactional(readOnly = true)
    List<WalletSummary> listAll() {
        return walletRepo.findAllForAdmin().stream()
                .map(WalletSummary::from)
                .toList();
    }

    @GetMapping("/transactions/recent")
    @Transactional(readOnly = true)
    List<RecentTxn> recentTransactions(@RequestParam(defaultValue = "20") @Min(1) int limit) {
        int capped = Math.min(limit, 100);
        return txRepo.findRecentForAdmin(PageRequest.of(0, capped)).stream()
                .map(RecentTxn::from)
                .toList();
    }

    @GetMapping("/{userId}")
    @Transactional(readOnly = true)
    WalletController.WalletResponse get(@PathVariable UUID userId) {
        Wallet wallet = wallets.getOrCreateWallet(userId);
        return WalletController.WalletResponse.from(wallet);
    }

    @GetMapping("/{userId}/transactions")
    @Transactional(readOnly = true)
    List<WalletController.TransactionResponse> transactions(@PathVariable UUID userId) {
        Wallet wallet = wallets.getOrCreateWallet(userId);
        return wallets.history(wallet.getId()).stream()
                .map(WalletController.TransactionResponse::from)
                .toList();
    }

    @PostMapping("/{userId}/credit")
    @ResponseStatus(HttpStatus.CREATED)
    TransactionResult credit(@PathVariable UUID userId, @Valid @RequestBody CreditRequest request) {
        WalletTransaction tx = wallets.adminCredit(
                userId,
                SecurityUtils.currentUserId(),
                request.amountCents(),
                request.type() == null ? WalletTransactionType.CREDIT_ADD : request.type(),
                request.notes(),
                request.idempotencyKey());
        return TransactionResult.from(tx);
    }

    @PostMapping("/{userId}/debit")
    @ResponseStatus(HttpStatus.CREATED)
    TransactionResult debit(@PathVariable UUID userId, @Valid @RequestBody DebitRequest request) {
        WalletTransaction tx = wallets.adminDebit(
                userId,
                SecurityUtils.currentUserId(),
                request.amountCents(),
                WalletTransactionType.ADMIN_ADJUSTMENT,
                request.notes(),
                request.idempotencyKey());
        return TransactionResult.from(tx);
    }

    record CreditRequest(
            @Positive long amountCents,
            WalletTransactionType type,
            @Size(max = 500) String notes,
            @NotBlank @Size(max = 120) String idempotencyKey) {
    }

    record DebitRequest(
            @Positive long amountCents,
            @NotNull @Size(max = 500) String notes,
            @NotBlank @Size(max = 120) String idempotencyKey) {
    }

    record TransactionResult(
            UUID transactionId,
            UUID walletId,
            long amountCents,
            long balanceAfterCents,
            String transactionType,
            UUID createdByAdminId,
            String notes,
            Instant createdAt) {
        static TransactionResult from(WalletTransaction tx) {
            return new TransactionResult(
                    tx.getId(),
                    tx.getWallet().getId(),
                    tx.getAmountCents(),
                    tx.getBalanceAfterCents(),
                    tx.getTransactionType().name(),
                    tx.getCreatedByAdminId(),
                    tx.getNotes(),
                    tx.getCreatedAt());
        }
    }

    record WalletSummary(
            UUID userId,
            String memberName,
            String memberEmail,
            long balanceCents,
            Instant updatedAt) {
        static WalletSummary from(Wallet w) {
            return new WalletSummary(
                    w.getUser().getId(),
                    w.getUser().getFullName(),
                    w.getUser().getEmail(),
                    w.getBalanceCents(),
                    w.getUpdatedAt());
        }
    }

    record RecentTxn(
            UUID transactionId,
            UUID userId,
            String memberName,
            long amountCents,
            String transactionType,
            String notes,
            Instant createdAt) {
        static RecentTxn from(WalletTransaction tx) {
            return new RecentTxn(
                    tx.getId(),
                    tx.getWallet().getUser().getId(),
                    tx.getWallet().getUser().getFullName(),
                    tx.getAmountCents(),
                    tx.getTransactionType().name(),
                    tx.getNotes(),
                    tx.getCreatedAt());
        }
    }
}
