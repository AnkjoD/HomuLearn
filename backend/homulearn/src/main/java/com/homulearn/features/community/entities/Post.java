package com.homulearn.features.community.entities;

import com.homulearn.features.auth.entities.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "posts")
@Getter @Setter @NoArgsConstructor
public class Post {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now(java.time.ZoneOffset.UTC);

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public Post(User user, String title, String content) {
        this.user = user; this.title = title; this.content = content;
        this.createdAt = LocalDateTime.now(java.time.ZoneOffset.UTC);
    }
}
