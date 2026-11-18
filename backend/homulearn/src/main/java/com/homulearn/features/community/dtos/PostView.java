package com.homulearn.features.community.dtos;

import com.homulearn.features.community.entities.Post;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

public record PostView(
    Long id,
    String title,
    String content,
    AuthorView author,
    long commentCount,
    long reactionCount,
    boolean reactedByMe,
    boolean bookmarkedByMe,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {
    public static PostView of(Post post, long commentCount) {
        return of(post, commentCount, 0L, false, false);
    }

    public static PostView of(
        Post post,
        long commentCount,
        long reactionCount,
        boolean reactedByMe,
        boolean bookmarkedByMe
    ) {
        return new PostView(
            post.getId(),
            post.getTitle(),
            post.getContent(),
            AuthorView.from(post.getUser()),
            commentCount,
            reactionCount,
            reactedByMe,
            bookmarkedByMe,
            post.getCreatedAt().atOffset(ZoneOffset.UTC),
            post.getUpdatedAt() == null ? null : post.getUpdatedAt().atOffset(ZoneOffset.UTC)
        );
    }
}
