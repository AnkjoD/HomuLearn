package com.homulearn.features.admin.controllers;

import com.homulearn.features.admin.dtos.*;
import com.homulearn.features.admin.services.AdminService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {

    private final AdminService service;

    public AdminController(AdminService service) {
        this.service = service;
    }

    @GetMapping("/overview")
    public AdminOverviewView overview() {
        return service.getOverview();
    }

    @GetMapping("/users")
    public List<AdminUserView> listUsers() {
        return service.listUsers();
    }

    @PatchMapping("/users/{publicId}/status")
    public AdminUserView updateUserStatus(
        Authentication auth,
        @PathVariable UUID publicId,
        @Valid @RequestBody AdminUserStatusRequest req
    ) {
        return service.updateUserStatus(auth.getName(), publicId, req);
    }

    @GetMapping("/reports")
    public List<AdminReportView> listReports() {
        return service.listReports();
    }

    @PatchMapping("/reports/{id}")
    public AdminReportView resolveReport(
        Authentication auth,
        @PathVariable Long id,
        @Valid @RequestBody AdminReportResolveRequest req
    ) {
        return service.resolveReport(auth.getName(), id, req);
    }

    @GetMapping("/audit-logs")
    public List<AdminAuditLogView> listAuditLogs() {
        return service.listAuditLogs();
    }

    @GetMapping("/posts")
    public List<AdminPostView> listPosts() {
        return service.listPosts();
    }

    @DeleteMapping("/posts/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePost(Authentication auth, @PathVariable Long id) {
        service.deletePost(auth.getName(), id);
    }
}
