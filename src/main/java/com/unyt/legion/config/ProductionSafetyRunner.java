package com.unyt.legion.config;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
public class ProductionSafetyRunner implements ApplicationRunner {
    private final AppProperties properties;
    private final Environment environment;

    public ProductionSafetyRunner(AppProperties properties, Environment environment) {
        this.properties = properties;
        this.environment = environment;
    }

    // HS256 needs a 256-bit (32-byte) key to be cryptographically sound. A short
    // secret is brute-forceable, so reject it at startup rather than silently
    // running with a weak signing key.
    private static final int MIN_JWT_SECRET_BYTES = 32;

    @Override
    public void run(ApplicationArguments args) {
        boolean production = Arrays.asList(environment.getActiveProfiles()).contains("prod");
        if (!production) {
            return;
        }
        String jwtSecret = properties.security().jwtSecret();
        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new IllegalStateException("APP_JWT_SECRET must be set for the prod profile");
        }
        if (jwtSecret.getBytes(StandardCharsets.UTF_8).length < MIN_JWT_SECRET_BYTES) {
            throw new IllegalStateException(
                    "APP_JWT_SECRET must be at least " + MIN_JWT_SECRET_BYTES
                            + " bytes for HS256; provide a longer secret");
        }
    }
}
