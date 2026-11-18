package com.homulearn.features.note.entities;

import com.homulearn.features.auth.entities.User;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "note_folders")
@Data
public class NoteFolder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 16)
    private String icon = "📁";

    @Column(name = "note_content", nullable = false, length = 500)
    private String noteContent = "";

    private LocalDateTime createdAt = LocalDateTime.now();
}
