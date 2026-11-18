package com.homulearn.features.auth.repositories;

import com.homulearn.features.auth.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByPublicId(UUID publicId);
    long countByStatus(String status);
    List<User> findAllByOrderByCreatedAtDesc();
}
