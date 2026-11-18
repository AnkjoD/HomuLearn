package com.homulearn.features.community.services;

import com.homulearn.features.auth.entities.User;
import com.homulearn.features.auth.repositories.UserRepository;
import com.homulearn.features.community.dtos.*;
import com.homulearn.features.community.entities.Comment;
import com.homulearn.features.community.entities.Post;
import com.homulearn.features.community.entities.PostBookmark;
import com.homulearn.features.community.entities.PostReaction;
import com.homulearn.features.community.repositories.CommentRepository;
import com.homulearn.features.community.repositories.PostBookmarkRepository;
import com.homulearn.features.community.repositories.PostReactionRepository;
import com.homulearn.features.community.repositories.PostRepository;
import com.homulearn.features.report.entities.Report;
import com.homulearn.features.report.repositories.ReportRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Service
@Transactional
public class CommunityService {
    private final PostRepository posts;
    private final CommentRepository comments;
    private final PostReactionRepository reactions;
    private final PostBookmarkRepository bookmarks;
    private final ReportRepository reports;
    private final UserRepository users;

    public CommunityService(
        PostRepository posts,
        CommentRepository comments,
        PostReactionRepository reactions,
        PostBookmarkRepository bookmarks,
        ReportRepository reports,
        UserRepository users
    ) {
        this.posts = posts;
        this.comments = comments;
        this.reactions = reactions;
        this.bookmarks = bookmarks;
        this.reports = reports;
        this.users = users;
    }

    private User getAuthenticatedUser(String email) {
        return users.findByEmail(email)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private PostView toPostView(Post post, Long viewerId) {
        long commentCount = comments.countByPostId(post.getId());
        long reactionCount = reactions.countByPostId(post.getId());
        boolean reacted = viewerId != null && reactions.existsByPostIdAndUserId(post.getId(), viewerId);
        boolean bookmarked = viewerId != null && bookmarks.existsByPostIdAndUserId(post.getId(), viewerId);
        return PostView.of(post, commentCount, reactionCount, reacted, bookmarked);
    }

    @Transactional(readOnly = true)
    public Page<PostView> listPosts(String email, String query, Pageable pageable) {
        Long viewerId = email == null ? null : users.findByEmail(email).map(User::getId).orElse(null);
        Page<Post> result;
        if (query != null && !query.strip().isEmpty()) {
            result = posts.searchByTitleOrContent(query.strip(), pageable);
        } else {
            result = posts.findAll(pageable);
        }
        return result.map(p -> toPostView(p, viewerId));
    }

    @Transactional(readOnly = true)
    public PostView getPost(String email, Long id) {
        Long viewerId = email == null ? null : users.findByEmail(email).map(User::getId).orElse(null);
        Post post = posts.findWithUserById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bài viết không tồn tại"));
        return toPostView(post, viewerId);
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
        post.setUpdatedAt(LocalDateTime.now(ZoneOffset.UTC));
        return toPostView(post, post.getUser().getId());
    }

    public void deletePost(String email, Long id) {
        Post post = posts.findWithUserById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bài viết không tồn tại"));
        if (!post.getUser().getEmail().equalsIgnoreCase(email)) {
            throw new AccessDeniedException("Bạn không có quyền xóa bài viết này");
        }
        reactions.deleteAllByPostId(id);
        bookmarks.deleteAllByPostId(id);
        comments.deleteAllByPostId(id);
        comments.flush();
        posts.delete(post);
    }

    public ReactionResult toggleReaction(String email, Long postId) {
        User user = getAuthenticatedUser(email);
        Post post = posts.findById(postId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bài viết không tồn tại"));
        var existing = reactions.findByPostIdAndUserId(postId, user.getId());
        boolean reacted;
        if (existing.isPresent()) {
            reactions.delete(existing.get());
            reactions.flush();
            reacted = false;
        } else {
            reactions.saveAndFlush(new PostReaction(post, user));
            reacted = true;
        }
        return new ReactionResult(postId, reactions.countByPostId(postId), reacted);
    }

    public BookmarkResult toggleBookmark(String email, Long postId) {
        User user = getAuthenticatedUser(email);
        Post post = posts.findById(postId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bài viết không tồn tại"));
        var existing = bookmarks.findByPostIdAndUserId(postId, user.getId());
        boolean bookmarked;
        if (existing.isPresent()) {
            bookmarks.delete(existing.get());
            bookmarked = false;
        } else {
            bookmarks.save(new PostBookmark(post, user));
            bookmarked = true;
        }
        return new BookmarkResult(postId, bookmarked);
    }

    public ReportResult reportPost(String email, Long postId, ReportRequest req) {
        User user = getAuthenticatedUser(email);
        if (!posts.existsById(postId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Bài viết không tồn tại");
        }
        if (reports.existsByReportedByIdAndTargetTypeAndTargetId(user.getId(), "POST", postId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bạn đã báo cáo bài viết này rồi");
        }
        Report report = new Report();
        report.setReportedBy(user);
        report.setTargetType("POST");
        report.setTargetId(postId);
        report.setReason(req.reason().strip());
        report.setStatus("PENDING");
        Report saved = reports.save(report);
        return new ReportResult(saved.getId(), saved.getStatus());
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
        comment.setUpdatedAt(LocalDateTime.now(ZoneOffset.UTC));
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
