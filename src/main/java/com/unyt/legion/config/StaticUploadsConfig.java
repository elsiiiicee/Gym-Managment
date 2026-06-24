package com.unyt.legion.config;

import java.nio.file.Path;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Serves uploaded files (currently just avatars) over HTTP so the SPA can
 * use them as image src URLs.
 *
 * Lives under /api/files/** so the Next.js dev proxy (/api/* -> 8080)
 * picks it up without extra config. SecurityConfig permits GETs to
 * /api/files/** publicly.
 */
@Configuration
public class StaticUploadsConfig implements WebMvcConfigurer {

    private final AppProperties properties;

    public StaticUploadsConfig(AppProperties properties) {
        this.properties = properties;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String avatarLocation = Path.of(properties.uploadDir(), "avatars")
                .toAbsolutePath()
                .normalize()
                .toUri()
                .toString();
        registry.addResourceHandler("/api/files/avatars/**")
                .addResourceLocations(avatarLocation)
                .setCachePeriod(60 * 60); // 1h
    }
}
