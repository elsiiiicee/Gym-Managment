package com.unyt.legion.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private final Map<String, Window> windows = new ConcurrentHashMap<>();
    private final AtomicInteger requestsSinceCleanup = new AtomicInteger();
    private final int authMaxRequests;
    private final int authWindowSeconds;
    private final int apiMaxRequests;
    private final int apiWindowSeconds;

    public RateLimitingFilter(
            @Value("${app.rate-limit.auth-max:30}") int authMaxRequests,
            @Value("${app.rate-limit.auth-window-seconds:300}") int authWindowSeconds,
            @Value("${app.rate-limit.api-max:600}") int apiMaxRequests,
            @Value("${app.rate-limit.api-window-seconds:60}") int apiWindowSeconds) {
        this.authMaxRequests = authMaxRequests;
        this.authWindowSeconds = authWindowSeconds;
        this.apiMaxRequests = apiMaxRequests;
        this.apiWindowSeconds = apiWindowSeconds;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        if (!path.startsWith("/api/")) {
            filterChain.doFilter(request, response);
            return;
        }

        Limit limit = path.startsWith("/api/auth/")
                ? new Limit(authMaxRequests, authWindowSeconds)
                : new Limit(apiMaxRequests, apiWindowSeconds);
        // getRemoteAddr() reflects the real client IP when the app runs behind a
        // trusted proxy with server.forward-headers-strategy=framework (set in
        // the prod profile). NOTE: this limiter is per-instance and in-memory;
        // with >1 replica the effective limit is multiplied. For strict global
        // limits, move enforcement to the gateway/CDN or back this with Redis.
        String key = request.getRemoteAddr() + ":" + (path.startsWith("/api/auth/") ? "auth" : "api");
        if (!allow(key, limit)) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Too Many Requests\",\"message\":\"Rate limit exceeded\"}");
            return;
        }

        if (requestsSinceCleanup.incrementAndGet() % 1000 == 0) {
            cleanup();
        }
        filterChain.doFilter(request, response);
    }

    private boolean allow(String key, Limit limit) {
        long now = Instant.now().getEpochSecond();
        Window window = windows.compute(key, (unused, current) -> {
            if (current == null || now >= current.resetAt()) {
                return new Window(now + limit.windowSeconds(), new AtomicInteger(0));
            }
            return current;
        });
        return window.count().incrementAndGet() <= limit.maxRequests();
    }

    private void cleanup() {
        long now = Instant.now().getEpochSecond();
        Iterator<Map.Entry<String, Window>> iterator = windows.entrySet().iterator();
        while (iterator.hasNext()) {
            if (now >= iterator.next().getValue().resetAt()) {
                iterator.remove();
            }
        }
    }

    private record Limit(int maxRequests, int windowSeconds) {
    }

    private record Window(long resetAt, AtomicInteger count) {
    }
}
