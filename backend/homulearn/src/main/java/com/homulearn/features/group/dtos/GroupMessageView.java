package com.homulearn.features.group.dtos;

import com.homulearn.features.group.entities.GroupMessage;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

public record GroupMessageView(
    Long id,
    Long groupId,
    UUID senderId,
    String senderName,
    String senderAvatarColor,
    String content,
    boolean mine,
    OffsetDateTime createdAt
) {
    public static GroupMessageView from(GroupMessage msg, Long viewerUserId) {
        var sender = msg.getUser();
        return new GroupMessageView(
            msg.getId(),
            msg.getGroup().getId(),
            sender.getPublicId(),
            sender.getFullName(),
            sender.getAvatarColor(),
            msg.getContent(),
            viewerUserId != null && sender.getId().equals(viewerUserId),
            msg.getCreatedAt().atOffset(ZoneOffset.UTC)
        );
    }
}
