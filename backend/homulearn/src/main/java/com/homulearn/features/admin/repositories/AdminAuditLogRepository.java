package com.homulearn.features.admin.repositories;

import com.homulearn.features.admin.entities.AdminAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AdminAuditLogRepository extends JpaRepository<AdminAuditLog, Long> {
    List<AdminAuditLog> findTop50ByOrderByCreatedAtDescIdDesc();
}
