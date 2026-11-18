package com.homulearn.features.admin.dtos;

import com.homulearn.features.community.entities.Post;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

public record AdminPostView(
    Long id,
    String title,
    String contentPreview,
    String authorName,
    String authorEmail,
    long commentCount,
    OffsetDateTime createdAt
) {
    public static AdminPostView of(Post p, long commentCount) {
        String content = p.getContent() == null ? "" : p.getContent();
        String preview = content.length() > 120 ? content.substring(0, 120) + "…" : content;
        return new AdminPostView(
            p.getId(),
            p.getTitle(),
            preview,
            p.getUser() != null ? p.getUser().getFullName() : "Ẩn danh",
            p.getUser() != null ? p.getUser().getEmail() : "",
            commentCount,
            p.getCreatedAt() == null ? null : p.getCreatedAt().atOffset(ZoneOffset.UTC)
        );
    }
}
