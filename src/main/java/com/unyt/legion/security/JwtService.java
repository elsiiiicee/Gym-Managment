package com.unyt.legion.security;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.unyt.legion.config.AppProperties;
import com.unyt.legion.user.AppUser;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};

    private final AppProperties properties;
    private final ObjectMapper mapper = new ObjectMapper();

    public JwtService(AppProperties properties) {
        this.properties = properties;
    }

    public TokenPair createAccessToken(AppUser user) {
        Instant expiresAt = Instant.now().plusSeconds(properties.security().accessTokenMinutes() * 60);
        Map<String, Object> payload = new HashMap<>();
        payload.put("sub", user.getId().toString());
        payload.put("email", user.getEmail());
        payload.put("role", user.getRole().name());
        payload.put("iat", Instant.now().getEpochSecond());
        payload.put("exp", expiresAt.getEpochSecond());
        return new TokenPair(sign(payload), expiresAt);
    }

    public Optional<JwtClaims> validate(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3) {
                return Optional.empty();
            }
            String signedPart = parts[0] + "." + parts[1];
            String expected = hmac(signedPart);
            if (!MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), parts[2].getBytes(StandardCharsets.UTF_8))) {
                return Optional.empty();
            }
            Map<String, Object> payload = mapper.readValue(Base64.getUrlDecoder().decode(parts[1]), MAP_TYPE);
            long exp = ((Number) payload.get("exp")).longValue();
            if (Instant.now().isAfter(Instant.ofEpochSecond(exp))) {
                return Optional.empty();
            }
            return Optional.of(new JwtClaims(
                    String.valueOf(payload.get("sub")),
                    String.valueOf(payload.get("email")),
                    String.valueOf(payload.get("role"))));
        } catch (Exception ex) {
            return Optional.empty();
        }
    }

    private String sign(Map<String, Object> payload) {
        try {
            String header = base64(mapper.writeValueAsBytes(Map.of("alg", "HS256", "typ", "JWT")));
            String body = base64(mapper.writeValueAsBytes(payload));
            String signedPart = header + "." + body;
            return signedPart + "." + hmac(signedPart);
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to sign JWT", ex);
        }
    }

    private String hmac(String value) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(properties.security().jwtSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return base64(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
    }

    private static String base64(byte[] data) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(data);
    }

    public record TokenPair(String token, Instant expiresAt) {
    }

    public record JwtClaims(String subject, String email, String role) {
    }
}
