package com.homulearn.features.note.dtos;

import com.homulearn.features.note.entities.NoteFolder;

import java.time.LocalDateTime;

public record NoteFolderView(Long id, String name, String icon, String noteContent, LocalDateTime createdAt) {

    public static NoteFolderView from(NoteFolder f) {
        return new NoteFolderView(f.getId(), f.getName(), f.getIcon(), f.getNoteContent(), f.getCreatedAt());
    }
}
