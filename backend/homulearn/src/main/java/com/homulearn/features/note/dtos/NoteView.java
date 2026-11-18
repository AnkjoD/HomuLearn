package com.homulearn.features.note.dtos;

import java.time.LocalDateTime;

public record NoteView(Long id, String title, String content, Long folderId,
                       LocalDateTime createdAt, LocalDateTime updatedAt) {

    public static NoteView from(com.homulearn.features.note.entities.Note n) {
        Long fId = n.getFolder() != null ? n.getFolder().getId() : null;
        return new NoteView(n.getId(), n.getTitle(), n.getContent(), fId,
                n.getCreatedAt(), n.getUpdatedAt());
    }
}
