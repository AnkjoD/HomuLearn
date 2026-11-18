package com.homulearn.features.group.dtos;

import com.homulearn.features.group.entities.StudyGroupMember;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

public record GroupMemberView(
    UUID id,
    String fullName,
    String major,
    String cohort,
    String avatarColor,
    String role,
    OffsetDateTime joinedAt
) {
    public static GroupMemberView from(StudyGroupMember member) {
        var user = member.getUser();
        return new GroupMemberView(
            user.getPublicId(),
            user.getFullName(),
            user.getMajor(),
            user.getCohort(),
            user.getAvatarColor(),
            member.getRole(),
            member.getJoinedAt().atOffset(ZoneOffset.UTC)
        );
    }
}
