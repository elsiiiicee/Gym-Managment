package com.unyt.legion.user;

import com.unyt.legion.security.SecurityUtils;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@Validated
public class AuthController {

    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    AuthService.AuthTokens register(@Valid @RequestBody RegisterRequest request) {
        return auth.register(request.email(), request.password(), request.fullName());
    }

    @PostMapping("/login")
    AuthService.AuthTokens login(@Valid @RequestBody LoginRequest request) {
        return auth.login(request.email(), request.password());
    }

    @PostMapping("/refresh")
    AuthService.AuthTokens refresh(@Valid @RequestBody RefreshRequest request) {
        return auth.refresh(request.refreshToken());
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void logout(@Valid @RequestBody RefreshRequest request) {
        auth.logout(request.refreshToken());
    }

    @PostMapping("/password/change")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        auth.changeOwnPassword(SecurityUtils.currentUserId(), request.currentPassword(), request.newPassword());
    }

    @PostMapping("/verify-email")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        auth.verifyEmail(request.token());
    }

    record RegisterRequest(
            @Email @NotBlank String email,
            @Size(min = 12, max = 128) String password,
            @NotBlank @Size(max = 120) String fullName) {
    }

    record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {
    }

    record RefreshRequest(@NotBlank String refreshToken) {
    }

    record ChangePasswordRequest(
            @NotBlank String currentPassword,
            @Size(min = 12, max = 128) String newPassword) {
    }

    record VerifyEmailRequest(@NotBlank String token) {
    }
}
