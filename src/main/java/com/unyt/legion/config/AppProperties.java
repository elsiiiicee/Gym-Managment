package com.unyt.legion.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        Security security,
        Cors cors,
        String uploadDir,
        Bootstrap bootstrap) {

    public AppProperties {
        security = security == null
                ? new Security("", 30, 14)
                : security;
        cors = cors == null
                ? new Cors("http://localhost:3000,http://127.0.0.1:3000")
                : cors;
        uploadDir = uploadDir == null || uploadDir.isBlank() ? "uploads" : uploadDir;
        bootstrap = bootstrap == null ? new Bootstrap("", "") : bootstrap;
    }

    public record Security(String jwtSecret, long accessTokenMinutes, long refreshTokenDays) {
        public Security {
            jwtSecret = jwtSecret == null ? "" : jwtSecret;
            accessTokenMinutes = accessTokenMinutes <= 0 ? 30 : accessTokenMinutes;
            refreshTokenDays = refreshTokenDays <= 0 ? 14 : refreshTokenDays;
        }
    }

    public record Cors(String allowedOrigins) {
        public Cors {
            allowedOrigins = allowedOrigins == null || allowedOrigins.isBlank()
                    ? "http://localhost:3000,http://127.0.0.1:3000"
                    : allowedOrigins;
        }
    }

    public record Bootstrap(String adminEmail, String adminPassword) {
        public Bootstrap {
            adminEmail = adminEmail == null ? "" : adminEmail;
            adminPassword = adminPassword == null ? "" : adminPassword;
        }
    }
}
