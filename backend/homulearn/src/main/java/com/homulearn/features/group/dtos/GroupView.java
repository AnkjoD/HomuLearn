package com.homulearn.features.group.dtos;

import com.homulearn.features.group.entities.StudyGroup;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

public record GroupView(
    Long id,
    String name,
    String description,
    String subject,
    String privacy,
    String avatarColor,
    long memberCount,
    boolean joined,
    String myRole,
    String lastMsg,
    OffsetDateTime createdAt
) {
    public static GroupView of(
        StudyGroup group,
        long memberCount,
        boolean joined,
        String myRole,
        String lastMsg
    ) {
        return new GroupView(
            group.getId(),
            group.getName(),
            group.getDescription(),
            group.getSubject(),
            group.getPrivacy(),
            group.getAvatarColor(),
            memberCount,
            joined,
            myRole,
            lastMsg,
            group.getCreatedAt().atOffset(ZoneOffset.UTC)
        );
    }
}
