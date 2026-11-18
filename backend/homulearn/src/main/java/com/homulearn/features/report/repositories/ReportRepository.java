package com.homulearn.features.report.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import com.homulearn.features.report.entities.Report;

import java.util.List;

public interface ReportRepository extends JpaRepository<Report, Long> {
    List<Report> findByStatus(String status);
    List<Report> findAllByOrderByCreatedAtDesc();
    long countByStatus(String status);
    boolean existsByReportedByIdAndTargetTypeAndTargetId(Long userId, String targetType, Long targetId);
}
