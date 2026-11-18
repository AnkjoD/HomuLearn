package com.homulearn.features.group.entities;

import com.homulearn.features.auth.entities.User;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "study_groups")
@Data
public class StudyGroup {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 100)
    private String subject;

    @Column(nullable = false, length = 20)
    private String privacy = "PUBLIC";

    @Column(name = "avatar_color", nullable = false, length = 20)
    private String avatarColor = "#0F4C81";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    private LocalDateTime createdAt = LocalDateTime.now(java.time.ZoneOffset.UTC);
}
