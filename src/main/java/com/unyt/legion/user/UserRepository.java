package com.unyt.legion.user;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<AppUser, UUID>, UserDetailsService {
    Optional<AppUser> findByEmail(String email);

    long countByRoleAndActiveTrue(UserRole role);

    @Override
    default UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        AppUser user = findByEmail(username)
                .filter(AppUser::isActive)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        return org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPasswordHash())
                .roles(user.getRole().name())
                .disabled(!user.isActive())
                .build();
    }
}
