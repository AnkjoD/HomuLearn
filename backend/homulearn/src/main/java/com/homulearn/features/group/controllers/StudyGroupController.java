package com.homulearn.features.group.controllers;

import com.homulearn.features.group.dtos.*;
import com.homulearn.features.group.services.StudyGroupService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/groups")
public class StudyGroupController {

    private final StudyGroupService service;

    public StudyGroupController(StudyGroupService service) {
        this.service = service;
    }

    @GetMapping
    public List<GroupView> listGroups(Authentication auth) {
        return service.listGroups(auth.getName());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public GroupView createGroup(Authentication auth, @Valid @RequestBody GroupCreateRequest req) {
        return service.createGroup(auth.getName(), req);
    }

    @PostMapping("/{id}/join")
    public GroupView joinGroup(Authentication auth, @PathVariable Long id) {
        return service.joinGroup(auth.getName(), id);
    }

    @PostMapping("/{id}/leave")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void leaveGroup(Authentication auth, @PathVariable Long id) {
        service.leaveGroup(auth.getName(), id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteGroup(Authentication auth, @PathVariable Long id) {
        service.deleteGroup(auth.getName(), id);
    }

    @GetMapping("/{id}/members")
    public List<GroupMemberView> listMembers(Authentication auth, @PathVariable Long id) {
        return service.listMembers(auth.getName(), id);
    }

    @GetMapping("/{id}/messages")
    public List<GroupMessageView> listMessages(
        Authentication auth,
        @PathVariable Long id,
        @RequestParam(required = false) String q,
        @RequestParam(required = false) Long beforeId,
        @RequestParam(defaultValue = "30") int limit
    ) {
        return service.listMessages(auth.getName(), id, q, beforeId, limit);
    }

    @PostMapping("/{id}/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public GroupMessageView sendMessage(
        Authentication auth,
        @PathVariable Long id,
        @Valid @RequestBody GroupMessageRequest req
    ) {
        return service.sendMessage(auth.getName(), id, req);
    }
}
