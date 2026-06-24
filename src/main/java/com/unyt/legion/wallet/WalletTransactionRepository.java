package com.unyt.legion.wallet;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, UUID> {
    Optional<WalletTransaction> findByWalletIdAndIdempotencyKey(UUID walletId, String idempotencyKey);

    List<WalletTransaction> findByWalletIdOrderByCreatedAtDesc(UUID walletId);

    // Admin: most recent transactions across all wallets, with wallet+user
    // eagerly fetched so DTO mapping doesn't trigger lazy access.
    @Query("""
            select t from WalletTransaction t
            join fetch t.wallet w
            join fetch w.user u
            order by t.createdAt desc
            """)
    List<WalletTransaction> findRecentForAdmin(Pageable pageable);
}
