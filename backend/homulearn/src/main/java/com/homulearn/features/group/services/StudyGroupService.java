package com.homulearn.features.group.services;

import com.homulearn.features.auth.entities.User;
import com.homulearn.features.auth.repositories.UserRepository;
import com.homulearn.features.group.dtos.*;
import com.homulearn.features.group.entities.GroupMessage;
import com.homulearn.features.group.entities.StudyGroup;
import com.homulearn.features.group.entities.StudyGroupMember;
import com.homulearn.features.group.repositories.GroupMessageRepository;
import com.homulearn.features.group.repositories.StudyGroupMemberRepository;
import com.homulearn.features.group.repositories.StudyGroupRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

@Service
@Transactional
public class StudyGroupService {

    private static final String DEFAULT_COLOR = "#0F4C81";

    private final StudyGroupRepository groups;
    private final StudyGroupMemberRepository members;
    private final GroupMessageRepository messages;
    private final UserRepository users;

    public StudyGroupService(
        StudyGroupRepository groups,
        StudyGroupMemberRepository members,
        GroupMessageRepository messages,
        UserRepository users
    ) {
        this.groups = groups;
        this.members = members;
        this.messages = messages;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public List<GroupView> listGroups(String email) {
        User user = resolveUser(email);
        return groups.findAllByOrderByCreatedAtDesc().stream()
            .filter(g -> "PUBLIC".equalsIgnoreCase(g.getPrivacy())
                || members.existsByGroupIdAndUserId(g.getId(), user.getId()))
            .map(g -> toGroupView(g, user.getId()))
            .toList();
    }

    public GroupView createGroup(String email, GroupCreateRequest req) {
        User user = resolveUser(email);
        StudyGroup group = new StudyGroup();
        group.setName(req.name().strip());
        group.setDescription(req.description() == null ? "" : req.description().strip());
        group.setSubject(req.subject() == null || req.subject().isBlank() ? "Chung" : req.subject().strip());
        group.setPrivacy("PRIVATE".equalsIgnoreCase(req.privacy()) ? "PRIVATE" : "PUBLIC");
        group.setAvatarColor(req.avatarColor() == null || req.avatarColor().isBlank()
            ? DEFAULT_COLOR : req.avatarColor().strip());
        group.setCreatedBy(user);
        group.setCreatedAt(LocalDateTime.now(ZoneOffset.UTC));
        StudyGroup saved = groups.save(group);

        StudyGroupMember owner = new StudyGroupMember();
        owner.setGroup(saved);
        owner.setUser(user);
        owner.setRole("OWNER");
        owner.setJoinedAt(LocalDateTime.now(ZoneOffset.UTC));
        members.save(owner);

        return GroupView.of(saved, 1L, true, "OWNER", null);
    }

    public GroupView joinGroup(String email, Long groupId) {
        User user = resolveUser(email);
        StudyGroup group = resolveGroup(groupId);
        var existing = members.findByGroupIdAndUserId(groupId, user.getId());
        if (existing.isEmpty()) {
            if ("PRIVATE".equalsIgnoreCase(group.getPrivacy())) {
                throw new AccessDeniedException("Nhóm riêng tư không thể tự tham gia");
            }
            StudyGroupMember m = new StudyGroupMember();
            m.setGroup(group);
            m.setUser(user);
            m.setRole("MEMBER");
            m.setJoinedAt(LocalDateTime.now(ZoneOffset.UTC));
            members.save(m);
        }
        return toGroupView(group, user.getId());
    }

    public void leaveGroup(String email, Long groupId) {
        User user = resolveUser(email);
        resolveGroup(groupId);
        StudyGroupMember member = members.findByGroupIdAndUserId(groupId, user.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bạn chưa tham gia nhóm này"));
        if ("OWNER".equalsIgnoreCase(member.getRole())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Chủ nhóm không thể rời nhóm trước khi xóa nhóm"
            );
        }
        members.delete(member);
    }

    public void deleteGroup(String email, Long groupId) {
        User user = resolveUser(email);
        StudyGroup group = resolveGroup(groupId);
        StudyGroupMember member = members.findByGroupIdAndUserId(groupId, user.getId())
            .orElseThrow(() -> new AccessDeniedException("Bạn không có quyền xóa nhóm này"));
        if (!"OWNER".equalsIgnoreCase(member.getRole())) {
            throw new AccessDeniedException("Chỉ chủ nhóm mới có quyền xóa nhóm");
        }
        messages.deleteAllByGroupId(groupId);
        members.deleteAllByGroupId(groupId);
        groups.delete(group);
    }

    @Transactional(readOnly = true)
    public List<GroupMemberView> listMembers(String email, Long groupId) {
        User user = resolveUser(email);
        StudyGroup group = resolveGroup(groupId);
        if ("PRIVATE".equalsIgnoreCase(group.getPrivacy())
            && !members.existsByGroupIdAndUserId(groupId, user.getId())) {
            throw new AccessDeniedException("Bạn không có quyền xem thành viên nhóm này");
        }
        return members.findByGroupIdOrderByJoinedAtAsc(groupId).stream()
            .map(GroupMemberView::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<GroupMessageView> listMessages(String email, Long groupId, String query, Long beforeId, int limit) {
        User user = resolveUser(email);
        resolveGroup(groupId);
        requireMember(groupId, user.getId());
        int safeLimit = Math.min(Math.max(limit, 1), 100);
        var pageable = PageRequest.of(0, safeLimit);
        List<GroupMessage> descList;
        if (query != null && !query.isBlank()) {
            descList = messages.findByGroupIdAndContentContainingIgnoreCaseOrderByIdDesc(
                groupId, query.strip(), pageable);
        } else if (beforeId != null) {
            descList = messages.findByGroupIdAndIdLessThanOrderByIdDesc(groupId, beforeId, pageable);
        } else {
            descList = messages.findByGroupIdOrderByIdDesc(groupId, pageable);
        }
        List<GroupMessage> chronological = new ArrayList<>(descList);
        Collections.reverse(chronological);
        return chronological.stream()
            .map(m -> GroupMessageView.from(m, user.getId()))
            .toList();
    }

    public GroupMessageView sendMessage(String email, Long groupId, GroupMessageRequest req) {
        User user = resolveUser(email);
        StudyGroup group = resolveGroup(groupId);
        requireMember(groupId, user.getId());

        String clientMsgId = req.clientMessageId() == null || req.clientMessageId().isBlank()
            ? null : req.clientMessageId().strip();
        if (clientMsgId != null) {
            var existing = messages.findByGroupIdAndUserIdAndClientMessageId(groupId, user.getId(), clientMsgId);
            if (existing.isPresent()) {
                return GroupMessageView.from(existing.get(), user.getId());
            }
        }

        GroupMessage msg = new GroupMessage();
        msg.setGroup(group);
        msg.setUser(user);
        msg.setContent(req.content().strip());
        msg.setClientMessageId(clientMsgId);
        msg.setCreatedAt(LocalDateTime.now(ZoneOffset.UTC));
        return GroupMessageView.from(messages.save(msg), user.getId());
    }

    private GroupView toGroupView(StudyGroup group, Long userId) {
        var memberOpt = members.findByGroupIdAndUserId(group.getId(), userId);
        boolean joined = memberOpt.isPresent();
        String myRole = memberOpt.map(StudyGroupMember::getRole).orElse(null);
        long count = members.countByGroupId(group.getId());
        String lastMsg = joined
            ? messages.findTop1ByGroupIdOrderByCreatedAtDescIdDesc(group.getId())
                .map(GroupMessage::getContent)
                .orElse(null)
            : null;
        return GroupView.of(group, count, joined, myRole, lastMsg);
    }

    private User resolveUser(String email) {
        return users.findByEmail(email.strip().toLowerCase(Locale.ROOT))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tài khoản không tồn tại"));
    }

    private StudyGroup resolveGroup(Long groupId) {
        return groups.findById(groupId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nhóm học không tồn tại"));
    }

    private void requireMember(Long groupId, Long userId) {
        if (!members.existsByGroupIdAndUserId(groupId, userId)) {
            throw new AccessDeniedException("Bạn cần tham gia nhóm để xem và gửi tin nhắn");
        }
    }
}
