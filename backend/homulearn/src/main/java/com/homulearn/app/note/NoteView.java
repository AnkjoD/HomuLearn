package com.homulearn.app.note;

import java.time.LocalDateTime;

public record NoteView(Long id, String title, String content,
                       LocalDateTime createdAt, LocalDateTime updatedAt) {

    public static NoteView from(com.homulearn.app.entity.Note n) {
        return new NoteView(n.getId(), n.getTitle(), n.getContent(),
                n.getCreatedAt(), n.getUpdatedAt());
    }
}
