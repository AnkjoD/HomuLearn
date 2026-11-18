package com.homulearn.features.admin.services;

import com.homulearn.features.admin.dtos.*;
import com.homulearn.features.admin.entities.AdminAuditLog;
import com.homulearn.features.admin.repositories.AdminAuditLogRepository;
import com.homulearn.features.auth.entities.User;
import com.homulearn.features.auth.repositories.UserRepository;
import com.homulearn.features.community.entities.Post;
import com.homulearn.features.community.repositories.CommentRepository;
import com.homulearn.features.community.repositories.PostBookmarkRepository;
import com.homulearn.features.community.repositories.PostReactionRepository;
import com.homulearn.features.community.repositories.PostRepository;
import com.homulearn.features.group.repositories.StudyGroupRepository;
import com.homulearn.features.report.entities.Report;
import com.homulearn.features.report.repositories.ReportRepository;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@Transactional
public class AdminService {

    private static final Set<String> VALID_USER_STATUSES = Set.of("ACTIVE", "BANNED");
    private static final Set<String> VALID_REPORT_STATUSES = Set.of("RESOLVED", "DISMISSED");

    private final UserRepository users;
    private final ReportRepository reports;
    private final PostRepository posts;
    private final CommentRepository comments;
    private final PostReactionRepository reactions;
    private final PostBookmarkRepository bookmarks;
    private final StudyGroupRepository groups;
    private final AdminAuditLogRepository auditLogs;

    public AdminService(
        UserRepository users,
        ReportRepository reports,
        PostRepository posts,
        CommentRepository comments,
        PostReactionRepository reactions,
        PostBookmarkRepository bookmarks,
        StudyGroupRepository groups,
        AdminAuditLogRepository auditLogs
    ) {
        this.users = users;
        this.reports = reports;
        this.posts = posts;
        this.comments = comments;
        this.reactions = reactions;
        this.bookmarks = bookmarks;
        this.groups = groups;
        this.auditLogs = auditLogs;
    }

    @Transactional(readOnly = true)
    public AdminOverviewView getOverview() {
        return new AdminOverviewView(
            users.count(),
            users.countByStatus("ACTIVE"),
            users.countByStatus("BANNED"),
            reports.countByStatus("PENDING"),
            posts.count(),
            groups.count()
        );
    }

    @Transactional(readOnly = true)
    public List<AdminUserView> listUsers() {
        return users.findAllByOrderByCreatedAtDesc().stream()
            .map(AdminUserView::from)
            .toList();
    }

    public AdminUserView updateUserStatus(String adminEmail, UUID targetPublicId, AdminUserStatusRequest req) {
        User admin = resolveAdmin(adminEmail);
        String nextStatus = req.status().strip().toUpperCase(Locale.ROOT);
        if (!VALID_USER_STATUSES.contains(nextStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Trạng thái không hợp lệ (ACTIVE hoặc BANNED)");
        }
        User target = users.findByPublicId(targetPublicId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Người dùng không tồn tại"));
        if (target.getId().equals(admin.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không thể tự khóa tài khoản của chính mình");
        }
        target.setStatus(nextStatus);
        User saved = users.save(target);

        recordAudit(
            admin,
            "BANNED".equals(nextStatus) ? "BAN_USER" : "UNBAN_USER",
            "USER",
            saved.getId(),
            "Cập nhật trạng thái " + saved.getEmail() + " -> " + nextStatus
        );
        return AdminUserView.from(saved);
    }

    @Transactional(readOnly = true)
    public List<AdminReportView> listReports() {
        return reports.findAllByOrderByCreatedAtDesc().stream()
            .map(this::toReportView)
            .toList();
    }

    public AdminReportView resolveReport(String adminEmail, Long reportId, AdminReportResolveRequest req) {
        User admin = resolveAdmin(adminEmail);
        String nextStatus = req.status().strip().toUpperCase(Locale.ROOT);
        if (!VALID_REPORT_STATUSES.contains(nextStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Trạng thái không hợp lệ (RESOLVED hoặc DISMISSED)");
        }
        Report report = reports.findById(reportId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Báo cáo không tồn tại"));

        if ("RESOLVED".equals(nextStatus) && req.deleteTarget() && "POST".equalsIgnoreCase(report.getTargetType())) {
            posts.findById(report.getTargetId()).ifPresent(post -> {
                reactions.deleteAllByPostId(post.getId());
                bookmarks.deleteAllByPostId(post.getId());
                comments.deleteAllByPostId(post.getId());
                comments.flush();
                posts.delete(post);
            });
        }

        report.setStatus(nextStatus);
        Report saved = reports.save(report);
        recordAudit(
            admin,
            "RESOLVED".equals(nextStatus) ? "RESOLVE_REPORT" : "DISMISS_REPORT",
            report.getTargetType(),
            report.getTargetId(),
            "Xử lý report #" + report.getId() + " -> " + nextStatus + (req.deleteTarget() ? " (đã xóa bài)" : "")
        );
        return toReportView(saved);
    }

    @Transactional(readOnly = true)
    public List<AdminAuditLogView> listAuditLogs() {
        return auditLogs.findTop50ByOrderByCreatedAtDescIdDesc().stream()
            .map(AdminAuditLogView::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<AdminPostView> listPosts() {
        return posts.findAll(Sort.by(Sort.Direction.DESC, "createdAt", "id")).stream()
            .map(p -> AdminPostView.of(p, comments.countByPostId(p.getId())))
            .toList();
    }

    public void deletePost(String adminEmail, Long postId) {
        User admin = resolveAdmin(adminEmail);
        Post post = posts.findById(postId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bài viết không tồn tại"));
        String title = post.getTitle();
        reactions.deleteAllByPostId(postId);
        bookmarks.deleteAllByPostId(postId);
        comments.deleteAllByPostId(postId);
        comments.flush();
        posts.delete(post);
        recordAudit(admin, "DELETE_POST", "POST", postId, "Xóa bài viết: " + title);
    }

    private AdminReportView toReportView(Report r) {
        String reporterName = r.getReportedBy() != null ? r.getReportedBy().getFullName() : "Ẩn danh";
        String preview = null;
        if ("POST".equalsIgnoreCase(r.getTargetType()) && r.getTargetId() != null) {
            preview = posts.findById(r.getTargetId()).map(Post::getTitle).orElse("(Bài viết đã bị xóa)");
        }
        return new AdminReportView(
            r.getId(),
            r.getTargetType(),
            r.getTargetId(),
            r.getReason(),
            r.getStatus(),
            reporterName,
            preview,
            r.getCreatedAt() == null ? null : r.getCreatedAt().atOffset(ZoneOffset.UTC)
        );
    }

    private User resolveAdmin(String email) {
        return users.findByEmail(email.strip().toLowerCase(Locale.ROOT))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tài khoản không tồn tại"));
    }

    private void recordAudit(User admin, String action, String targetType, Long targetId, String detail) {
        AdminAuditLog log = new AdminAuditLog();
        log.setAdmin(admin);
        log.setAction(action);
        log.setTargetType(targetType);
        log.setTargetId(targetId);
        log.setDetail(detail);
        log.setCreatedAt(LocalDateTime.now(ZoneOffset.UTC));
        auditLogs.save(log);
    }
}
