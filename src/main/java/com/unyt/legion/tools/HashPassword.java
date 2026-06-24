package com.unyt.legion.tools;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * One-off utility for generating a bcrypt hash that matches Spring's
 * BCryptPasswordEncoder(12) — the same encoder used by SecurityConfig.
 *
 * Use this to set or reset an admin password directly in the database:
 *
 *   ./mvnw -q exec:java -Dexec.mainClass=com.unyt.legion.tools.HashPassword \
 *       -Dexec.args="MyPlainPassword123!"
 *
 * Pipe the printed hash into a SQL update:
 *
 *   update app_users set password_hash = '<paste hash>'
 *   where email = 'admin@gmail.com';
 */
public final class HashPassword {
    private HashPassword() {}

    public static void main(String[] args) {
        if (args.length != 1) {
            System.err.println("Usage: HashPassword <plain-text-password>");
            System.exit(1);
        }
        String hash = new BCryptPasswordEncoder(12).encode(args[0]);
        System.out.println(hash);
    }
}
