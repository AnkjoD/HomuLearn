package com.homulearn.features.community.dtos;

import com.homulearn.features.community.entities.Comment;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

public record CommentView(
    Long id,
    Long postId,
    String content,
    AuthorView author,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {
    public static CommentView from(Comment comment) {
        return new CommentView(
            comment.getId(),
            comment.getPost().getId(),
            comment.getContent(),
            AuthorView.from(comment.getUser()),
            comment.getCreatedAt().atOffset(ZoneOffset.UTC),
            comment.getUpdatedAt() == null ? null : comment.getUpdatedAt().atOffset(ZoneOffset.UTC)
        );
    }
}
