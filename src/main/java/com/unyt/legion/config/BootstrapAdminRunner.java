package com.unyt.legion.config;

import com.unyt.legion.user.AppUser;
import com.unyt.legion.user.Profile;
import com.unyt.legion.user.ProfileRepository;
import com.unyt.legion.user.UserRepository;
import com.unyt.legion.user.UserRole;
import java.util.Locale;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class BootstrapAdminRunner implements CommandLineRunner {

    private final AppProperties properties;
    private final UserRepository users;
    private final ProfileRepository profiles;
    private final PasswordEncoder passwordEncoder;

    public BootstrapAdminRunner(
            AppProperties properties,
            UserRepository users,
            ProfileRepository profiles,
            PasswordEncoder passwordEncoder) {
        this.properties = properties;
        this.users = users;
        this.profiles = profiles;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        String email = properties.bootstrap().adminEmail();
        String password = properties.bootstrap().adminPassword();
        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            return;
        }
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        users.findByEmail(normalizedEmail).ifPresentOrElse(existing -> {}, () -> {
            AppUser admin = new AppUser(normalizedEmail, passwordEncoder.encode(password), "System Admin", UserRole.ADMIN);
            users.save(admin);
            profiles.save(new Profile(admin, "System Admin"));
        });
    }
}
