package com.homulearn.features.goal.entities;

import com.homulearn.features.auth.entities.User;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "goals")
@Data
public class Goal {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    private String title;
    private Integer currentProgress = 0;
    private Integer targetValue;
    private String unit;
    private LocalDateTime deadline;
    private LocalDateTime createdAt = LocalDateTime.now();

    @Transient
    public String getStatus() {
        return (currentProgress != null && targetValue != null && currentProgress >= targetValue)
                ? "DONE" : "IN_PROGRESS";
    }
}
