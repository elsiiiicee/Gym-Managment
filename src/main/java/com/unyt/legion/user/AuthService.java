package com.unyt.legion.user;

import com.unyt.legion.config.AppProperties;
import com.unyt.legion.security.JwtService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private final UserRepository users;
    private final ProfileRepository profiles;
    private final RefreshTokenRepository refreshTokens;
    private final AccountTokenRepository accountTokens;
    private final PasswordResetAuditRepository passwordResetAudits;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AppProperties properties;
    private final SecureRandom random = new SecureRandom();

    public AuthService(
            UserRepository users,
            ProfileRepository profiles,
            RefreshTokenRepository refreshTokens,
            AccountTokenRepository accountTokens,
            PasswordResetAuditRepository passwordResetAudits,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            AppProperties properties) {
        this.users = users;
        this.profiles = profiles;
        this.refreshTokens = refreshTokens;
        this.accountTokens = accountTokens;
        this.passwordResetAudits = passwordResetAudits;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.properties = properties;
    }

    @Transactional
    public AuthTokens register(String email, String password, String fullName) {
        String normalizedEmail = normalizeEmail(email);
        if (users.findByEmail(normalizedEmail).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }
        AppUser user = users.save(new AppUser(
                normalizedEmail,
                passwordEncoder.encode(password),
                fullName.trim(),
                UserRole.USER));
        profiles.save(new Profile(user, user.getFullName()));
        queueAccountToken(user, AccountTokenType.EMAIL_VERIFICATION);
        return issueTokens(user);
    }

    @Transactional
    public AuthTokens login(String email, String password) {
        AppUser user = users.findByEmail(normalizeEmail(email))
                .filter(AppUser::isActive)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }
        return issueTokens(user);
    }

    @Transactional
    public AuthTokens refresh(String refreshToken) {
        RefreshToken token = refreshTokens.findByTokenHash(hash(refreshToken))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token"));
        if (!token.isUsable() || !token.getUser().isActive()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token");
        }
        token.setRevokedAt(Instant.now());
        return issueTokens(token.getUser());
    }

    @Transactional
    public void logout(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return;
        }
        refreshTokens.findByTokenHash(hash(refreshToken)).ifPresent(token -> token.setRevokedAt(Instant.now()));
    }

    /**
     * Admin-driven password reset. Replaces the prior email-token flow:
     * customer contacts the gym physically, an authenticated admin sets a
     * temporary password, all active refresh tokens are revoked so the user
     * must log in again, and the action is recorded in the audit table.
     */
    @Transactional
    public PasswordResetAudit adminResetPassword(
            java.util.UUID targetUserId,
            java.util.UUID adminUserId,
            String temporaryPassword,
            String reason) {
        AppUser admin = users.findById(adminUserId)
                .filter(candidate -> candidate.getRole() == UserRole.ADMIN && candidate.isActive())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin role required"));
        AppUser target = users.findById(targetUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Target user not found"));
        target.setPasswordHash(passwordEncoder.encode(temporaryPassword));
        refreshTokens.findByUserIdAndRevokedAtIsNull(target.getId())
                .forEach(token -> token.setRevokedAt(Instant.now()));
        return passwordResetAudits.save(new PasswordResetAudit(target.getId(), admin.getId(), reason));
    }

    /**
     * Authenticated user changes their own password (used after an admin issues
     * a temporary one). Requires the current password and invalidates all
     * existing refresh tokens.
     */
    @Transactional
    public void changeOwnPassword(java.util.UUID userId, String currentPassword, String newPassword) {
        AppUser user = users.findById(userId)
                .filter(AppUser::isActive)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required"));
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Current password is incorrect");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        refreshTokens.findByUserIdAndRevokedAtIsNull(user.getId())
                .forEach(token -> token.setRevokedAt(Instant.now()));
    }

    @Transactional
    public void requestEmailVerification(AppUser user) {
        queueAccountToken(user, AccountTokenType.EMAIL_VERIFICATION);
    }

    @Transactional
    public void verifyEmail(String token) {
        AccountToken accountToken = accountTokens.findByTokenHash(hash(token))
                .filter(candidate -> candidate.isUsable(AccountTokenType.EMAIL_VERIFICATION))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid verification token"));
        accountToken.getUser().setEmailVerified(true);
        accountToken.setConsumedAt(Instant.now());
    }

    @Transactional
    public void deactivateUser(AppUser user) {
        user.setActive(false);
    }

    public String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to hash token", ex);
        }
    }

    private AuthTokens issueTokens(AppUser user) {
        JwtService.TokenPair access = jwtService.createAccessToken(user);
        String refresh = randomToken();
        Instant refreshExpiresAt = Instant.now().plusSeconds(properties.security().refreshTokenDays() * 86_400);
        refreshTokens.save(new RefreshToken(user, hash(refresh), refreshExpiresAt));
        return new AuthTokens(access.token(), access.expiresAt(), refresh, refreshExpiresAt, user.getRole().name());
    }

    /**
     * Issues a single-use account token (currently only email verification).
     *
     * NOTE (v1): there is no email delivery wired up — tokens are persisted but
     * not sent. Email verification is therefore not exercised end-to-end in v1;
     * account actions like password reset are admin-driven (see
     * {@link #adminResetPassword}). When SMTP delivery is added, send the token
     * here. The previous fire-and-forget {@code mail_outbox} write was removed
     * because nothing consumed that table.
     */
    private void queueAccountToken(AppUser user, AccountTokenType type) {
        String token = randomToken();
        Instant expiresAt = Instant.now().plusSeconds(86_400);
        accountTokens.save(new AccountToken(user, type, hash(token), expiresAt));
    }

    private String randomToken() {
        byte[] bytes = new byte[48];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    public record AuthTokens(
            String accessToken,
            Instant accessTokenExpiresAt,
            String refreshToken,
            Instant refreshTokenExpiresAt,
            String role) {
    }
}
