package com.unyt.legion.user;

import com.unyt.legion.config.AppProperties;
import com.unyt.legion.security.SecurityUtils;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/users/me")
public class ProfileController {

    private static final Set<String> IMAGE_TYPES = Set.of("image/jpeg", "image/png", "image/webp");

    private final UserRepository users;
    private final ProfileRepository profiles;
    private final AppProperties properties;
    private final AuthService authService;

    public ProfileController(
            UserRepository users,
            ProfileRepository profiles,
            AppProperties properties,
            AuthService authService) {
        this.users = users;
        this.profiles = profiles;
        this.properties = properties;
        this.authService = authService;
    }

    @GetMapping
    @Transactional
    ProfileResponse me() {
        UUID userId = SecurityUtils.currentUserId();
        AppUser user = users.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        Profile profile = getOrCreateProfile(user);
        return ProfileResponse.from(user, profile);
    }

    @PutMapping("/profile")
    @Transactional
    ProfileResponse update(@Valid @RequestBody UpdateProfileRequest request) {
        UUID userId = SecurityUtils.currentUserId();
        AppUser user = users.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        Profile profile = getOrCreateProfile(user);
        user.setFullName(request.displayName().trim());
        profile.setDisplayName(request.displayName().trim());
        profile.setPhone(request.phone());
        return ProfileResponse.from(user, profile);
    }

    /**
     * Some users (especially ones inserted via SQL seed, or admins seeded
     * before the bootstrap runner was added) may not have a Profile row.
     * Create one on first read so /api/users/me never 500s on a legitimate
     * authenticated user.
     */
    private Profile getOrCreateProfile(AppUser user) {
        return profiles.findByUserId(user.getId())
                .orElseGet(() -> profiles.save(new Profile(user, user.getFullName())));
    }

    @PostMapping("/avatar")
    @Transactional
    ProfileResponse uploadAvatar(@RequestParam("file") MultipartFile file) throws Exception {
        UUID userId = SecurityUtils.currentUserId();
        if (file.isEmpty() || file.getSize() > 2 * 1024 * 1024) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Avatar must be a non-empty image up to 2MB");
        }
        if (!IMAGE_TYPES.contains(file.getContentType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported avatar content type");
        }
        String filename = StringUtils.cleanPath(file.getOriginalFilename() == null ? "avatar" : file.getOriginalFilename());
        if (filename.contains("..")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid file name");
        }
        String extension = extensionFor(file.getContentType());
        Path directory = Path.of(properties.uploadDir(), "avatars").toAbsolutePath().normalize();
        Files.createDirectories(directory);
        Path target = directory.resolve(userId + "-" + UUID.randomUUID() + extension).normalize();
        if (!target.startsWith(directory)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid upload target");
        }
        file.transferTo(target);

        AppUser user = users.findById(userId).orElseThrow();
        Profile profile = profiles.findByUserId(userId).orElseThrow();
        profile.setAvatarPath(Path.of(properties.uploadDir(), "avatars", target.getFileName().toString()).toString());
        return ProfileResponse.from(user, profile);
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    void deactivate() {
        AppUser user = users.findById(SecurityUtils.currentUserId()).orElseThrow();
        authService.deactivateUser(user);
    }

    @PostMapping("/email-verification")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @Transactional
    void requestEmailVerification() {
        AppUser user = users.findById(SecurityUtils.currentUserId()).orElseThrow();
        authService.requestEmailVerification(user);
    }

    private String extensionFor(String contentType) {
        return switch (contentType) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> ".bin";
        };
    }

    record UpdateProfileRequest(
            @NotBlank @Size(max = 120) String displayName,
            @Pattern(regexp = "^[+0-9 .()\\-]{0,40}$") String phone) {
    }

    /**
     * Turn the on-disk path (e.g. "uploads/avatars/abc.png") into a URL
     * the SPA can hit ("/api/files/avatars/abc.png"). Returns null if no
     * avatar has been uploaded yet.
     */
    private static String toAvatarUrl(String diskPath) {
        if (diskPath == null || diskPath.isBlank()) return null;
        String normalized = diskPath.replace('\\', '/');
        int idx = normalized.lastIndexOf("avatars/");
        if (idx < 0) return null;
        String filename = normalized.substring(idx + "avatars/".length());
        if (filename.isBlank() || filename.contains("/")) return null;
        return "/api/files/avatars/" + filename;
    }

    record ProfileResponse(UUID id, String email, String fullName, String role,
            boolean active, String phone, String avatarPath, String avatarUrl) {
        static ProfileResponse from(AppUser user, Profile profile) {
            return new ProfileResponse(
                    user.getId(),
                    user.getEmail(),
                    user.getFullName(),
                    user.getRole().name(),
                    user.isActive(),
                    profile.getPhone(),
                    profile.getAvatarPath(),
                    toAvatarUrl(profile.getAvatarPath()));
        }
    }
}
