package com.homulearn.features.note.repositories;

import com.homulearn.features.note.entities.NoteFolder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NoteFolderRepository extends JpaRepository<NoteFolder, Long> {
    List<NoteFolder> findByUserIdOrderByCreatedAtAsc(Long userId);
}
