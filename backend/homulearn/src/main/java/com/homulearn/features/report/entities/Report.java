package com.homulearn.features.report.entities;

import com.homulearn.features.auth.entities.User;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "reports")
@Data
public class Report {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reported_by")
    private User reportedBy;

    private String targetType;
    private Long targetId;

    @Column(columnDefinition = "TEXT")
    private String reason;

    private String status = "PENDING";
    private LocalDateTime createdAt = LocalDateTime.now();
}
