package com.unyt.legion.user;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountTokenRepository extends JpaRepository<AccountToken, UUID> {
    Optional<AccountToken> findByTokenHash(String tokenHash);
}
