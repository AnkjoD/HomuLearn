package com.homulearn.features.community.controllers;

import com.homulearn.features.community.dtos.*;
import com.homulearn.features.community.services.CommunityService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/v1/posts")
public class CommunityController {
    private final CommunityService service;

    public CommunityController(CommunityService service) {
        this.service = service;
    }

    @GetMapping
    public Page<PostView> listPosts(
        Authentication auth,
        @RequestParam(required = false) String q,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size
    ) {
        if (page < 0 || size < 1 || size > 100 || (long) page * size > Integer.MAX_VALUE)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phân trang không hợp lệ");
        String email = auth != null ? auth.getName() : null;
        return service.listPosts(email, q, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt", "id")));
    }

    @GetMapping("/{id}")
    public PostView getPost(Authentication auth, @PathVariable Long id) {
        String email = auth != null ? auth.getName() : null;
        return service.getPost(email, id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PostView createPost(Authentication auth, @Valid @RequestBody PostCreateRequest req) {
        return service.createPost(auth.getName(), req);
    }

    @PutMapping("/{id}")
    public PostView updatePost(Authentication auth, @PathVariable Long id, @Valid @RequestBody PostUpdateRequest req) {
        return service.updatePost(auth.getName(), id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePost(Authentication auth, @PathVariable Long id) {
        service.deletePost(auth.getName(), id);
    }

    @PostMapping("/{id}/reaction")
    public ReactionResult toggleReaction(Authentication auth, @PathVariable Long id) {
        return service.toggleReaction(auth.getName(), id);
    }

    @PostMapping("/{id}/bookmark")
    public BookmarkResult toggleBookmark(Authentication auth, @PathVariable Long id) {
        return service.toggleBookmark(auth.getName(), id);
    }

    @PostMapping("/{id}/report")
    @ResponseStatus(HttpStatus.CREATED)
    public ReportResult reportPost(Authentication auth, @PathVariable Long id, @Valid @RequestBody ReportRequest req) {
        return service.reportPost(auth.getName(), id, req);
    }

    @GetMapping("/{postId}/comments")
    public List<CommentView> listComments(@PathVariable Long postId) {
        return service.listComments(postId);
    }

    @PostMapping("/{postId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public CommentView createComment(Authentication auth, @PathVariable Long postId, @Valid @RequestBody CommentCreateRequest req) {
        return service.createComment(auth.getName(), postId, req);
    }

    @PutMapping("/{postId}/comments/{commentId}")
    public CommentView updateComment(
        Authentication auth,
        @PathVariable Long postId,
        @PathVariable Long commentId,
        @Valid @RequestBody CommentUpdateRequest req
    ) {
        return service.updateComment(auth.getName(), postId, commentId, req);
    }

    @DeleteMapping("/{postId}/comments/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteComment(
        Authentication auth,
        @PathVariable Long postId,
        @PathVariable Long commentId
    ) {
        service.deleteComment(auth.getName(), postId, commentId);
    }
}
