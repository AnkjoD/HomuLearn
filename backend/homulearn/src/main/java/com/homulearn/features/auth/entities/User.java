 package com.homulearn.features.auth.entities;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")
@Data
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, updatable = false)
    private UUID publicId = UUID.randomUUID();

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    private String fullName;
    @Column(length = 100)
    private String major;
    @Column(length = 50)
    private String cohort;
    @Column(length = 200)
    private String bio;
    @Column(name = "avatar_color", length = 20)
    private String avatarColor;
    private String role = "STUDENT";
    private String status = "ACTIVE";
    private LocalDateTime createdAt = LocalDateTime.now();
}
