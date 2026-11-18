package com.homulearn.features.community.entities;

import com.homulearn.features.auth.entities.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "post_bookmarks")
@Getter @Setter @NoArgsConstructor
public class PostBookmark {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now(java.time.ZoneOffset.UTC);

    public PostBookmark(Post post, User user) {
        this.post = post;
        this.user = user;
    }
}
