package com.unyt.legion.wallet;

import com.unyt.legion.security.SecurityUtils;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/wallet")
public class WalletController {

    private final WalletService wallets;

    public WalletController(WalletService wallets) {
        this.wallets = wallets;
    }

    @GetMapping
    @Transactional(readOnly = true)
    WalletResponse current() {
        Wallet wallet = wallets.getOrCreateWallet(SecurityUtils.currentUserId());
        return WalletResponse.from(wallet);
    }

    @GetMapping("/transactions")
    @Transactional(readOnly = true)
    List<TransactionResponse> transactions() {
        Wallet wallet = wallets.getOrCreateWallet(SecurityUtils.currentUserId());
        return wallets.history(wallet.getId()).stream().map(TransactionResponse::from).toList();
    }

    record WalletResponse(UUID walletId, UUID userId, long balanceCents, Instant updatedAt) {
        static WalletResponse from(Wallet wallet) {
            return new WalletResponse(
                    wallet.getId(),
                    wallet.getUser().getId(),
                    wallet.getBalanceCents(),
                    wallet.getUpdatedAt());
        }
    }

    record TransactionResponse(
            UUID id,
            long amountCents,
            long balanceAfterCents,
            String transactionType,
            String referenceType,
            UUID referenceId,
            String notes,
            Instant createdAt) {
        static TransactionResponse from(WalletTransaction tx) {
            return new TransactionResponse(
                    tx.getId(),
                    tx.getAmountCents(),
                    tx.getBalanceAfterCents(),
                    tx.getTransactionType().name(),
                    tx.getReferenceType(),
                    tx.getReferenceId(),
                    tx.getNotes(),
                    tx.getCreatedAt());
        }
    }
}
