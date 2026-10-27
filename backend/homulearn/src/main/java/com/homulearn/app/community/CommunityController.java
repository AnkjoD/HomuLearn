package com.homulearn.app.community;

import com.homulearn.app.entity.Comment;
import com.homulearn.app.entity.Post;
import com.homulearn.app.entity.User;
import com.homulearn.app.repository.CommentRepository;
import com.homulearn.app.repository.PostRepository;
import com.homulearn.app.repository.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

// --- DTOs ---

record AuthorView(java.util.UUID id, String name) {
    public static AuthorView from(User user) {
        if (user == null) return null;
        return new AuthorView(user.getPublicId(), user.getFullName());
    }
}

record PostCreateRequest(
    @NotBlank(message = "Tiêu đề không được để trống")
    @Size(max = 255, message = "Tiêu đề tối đa 255 ký tự")
    String title,

    @NotBlank(message = "Nội dung không được để trống")
    @Size(max = 20000)
    String content
) {}

record PostUpdateRequest(
    @NotBlank(message = "Tiêu đề không được để trống")
    @Size(max = 255, message = "Tiêu đề tối đa 255 ký tự")
    String title,

    @NotBlank(message = "Nội dung không được để trống")
    @Size(max = 20000)
    String content
) {}

record PostView(
    Long id,
    String title,
    String content,
    AuthorView author,
    long commentCount,
    java.time.OffsetDateTime createdAt,
    java.time.OffsetDateTime updatedAt
) {
    public static PostView of(Post post, long commentCount) {
        return new PostView(
            post.getId(),
            post.getTitle(),
            post.getContent(),
            AuthorView.from(post.getUser()),
            commentCount,
            post.getCreatedAt().atOffset(java.time.ZoneOffset.UTC),
            post.getUpdatedAt() == null ? null : post.getUpdatedAt().atOffset(java.time.ZoneOffset.UTC)
        );
    }
}

record CommentCreateRequest(
    @NotBlank(message = "Nội dung bình luận không được để trống")
    @Size(max = 5000)
    String content
) {}

record CommentUpdateRequest(
    @NotBlank(message = "Nội dung bình luận không được để trống")
    @Size(max = 5000)
    String content
) {}

record CommentView(
    Long id,
    Long postId,
    String content,
    AuthorView author,
    java.time.OffsetDateTime createdAt,
    java.time.OffsetDateTime updatedAt
) {
    public static CommentView from(Comment comment) {
        return new CommentView(
            comment.getId(),
            comment.getPost().getId(),
            comment.getContent(),
            AuthorView.from(comment.getUser()),
            comment.getCreatedAt().atOffset(java.time.ZoneOffset.UTC),
            comment.getUpdatedAt() == null ? null : comment.getUpdatedAt().atOffset(java.time.ZoneOffset.UTC)
        );
    }
}

// --- Service ---

@Service
@Transactional
class CommunityService {
    private final PostRepository posts;
    private final CommentRepository comments;
    private final UserRepository users;

    public CommunityService(PostRepository posts, CommentRepository comments, UserRepository users) {
        this.posts = posts;
        this.comments = comments;
        this.users = users;
    }

    private User getAuthenticatedUser(String email) {
        return users.findByEmail(email)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    @Transactional(readOnly = true)
    public Page<PostView> listPosts(Pageable pageable) {
        return posts.findAll(pageable)
            .map(p -> PostView.of(p, comments.countByPostId(p.getId())));
    }

    @Transactional(readOnly = true)
    public PostView getPost(Long id) {
        Post post = posts.findWithUserById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bài viết không tồn tại"));
        return PostView.of(post, comments.countByPostId(post.getId()));
    }

    public PostView createPost(String email, PostCreateRequest req) {
        User author = getAuthenticatedUser(email);
        Post post = new Post(author, req.title().strip(), req.content().strip());
        Post saved = posts.save(post);
        return PostView.of(saved, 0L);
    }

    public PostView updatePost(String email, Long id, PostUpdateRequest req) {
        Post post = posts.findWithUserById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bài viết không tồn tại"));
        if (!post.getUser().getEmail().equalsIgnoreCase(email)) {
            throw new AccessDeniedException("Bạn không có quyền chỉnh sửa bài viết này");
        }
        post.setTitle(req.title().strip());
        post.setContent(req.content().strip());
        post.setUpdatedAt(LocalDateTime.now(java.time.ZoneOffset.UTC));
        return PostView.of(post, comments.countByPostId(post.getId()));
    }

    public void deletePost(String email, Long id) {
        Post post = posts.findWithUserById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bài viết không tồn tại"));
        if (!post.getUser().getEmail().equalsIgnoreCase(email)) {
            throw new AccessDeniedException("Bạn không có quyền xóa bài viết này");
        }
        comments.deleteAllByPostId(id);
        comments.flush();
        posts.delete(post);
    }

    @Transactional(readOnly = true)
    public List<CommentView> listComments(Long postId) {
        if (!posts.existsById(postId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Bài viết không tồn tại");
        }
        return comments.findAllByPostIdOrderByCreatedAtAsc(postId).stream()
            .map(CommentView::from)
            .toList();
    }

    public CommentView createComment(String email, Long postId, CommentCreateRequest req) {
        User author = getAuthenticatedUser(email);
        Post post = posts.findById(postId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bài viết không tồn tại"));
        Comment comment = new Comment(post, author, req.content().strip());
        Comment saved = comments.save(comment);
        return CommentView.from(saved);
    }

    public CommentView updateComment(String email, Long postId, Long commentId, CommentUpdateRequest req) {
        Comment comment = comments.findWithUserAndPostById(commentId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bình luận không tồn tại"));
        if (!comment.getPost().getId().equals(postId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bình luận không thuộc bài viết này");
        }
        if (!comment.getUser().getEmail().equalsIgnoreCase(email)) {
            throw new AccessDeniedException("Bạn không có quyền chỉnh sửa bình luận này");
        }
        comment.setContent(req.content().strip());
        comment.setUpdatedAt(LocalDateTime.now(java.time.ZoneOffset.UTC));
        return CommentView.from(comment);
    }

    public void deleteComment(String email, Long postId, Long commentId) {
        Comment comment = comments.findWithUserAndPostById(commentId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bình luận không tồn tại"));
        if (!comment.getPost().getId().equals(postId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bình luận không thuộc bài viết này");
        }
        if (!comment.getUser().getEmail().equalsIgnoreCase(email)) {
            throw new AccessDeniedException("Bạn không có quyền xóa bình luận này");
        }
        comments.delete(comment);
    }
}

// --- Controller ---

@RestController
@RequestMapping("/api/v1/posts")
public class CommunityController {
    private final CommunityService service;

    public CommunityController(CommunityService service) {
        this.service = service;
    }

    @GetMapping
    public Page<PostView> listPosts(@RequestParam(defaultValue = "0") int page,
                                    @RequestParam(defaultValue = "10") int size) {
        if (page < 0 || size < 1 || size > 100 || (long) page * size > Integer.MAX_VALUE)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phân trang không hợp lệ");
        return service.listPosts(PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt", "id")));
    }

    @GetMapping("/{id}")
    public PostView getPost(@PathVariable Long id) {
        return service.getPost(id);
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
