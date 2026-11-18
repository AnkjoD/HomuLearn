package com.homulearn.features.note.repositories;

import com.homulearn.features.note.entities.Note;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface NoteRepository extends JpaRepository<Note, Long> {
    List<Note> findByUserIdOrderByUpdatedAtDesc(Long userId);
    long countByUserId(Long userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Note n SET n.folder = null WHERE n.folder.id = :folderId")
    void clearFolder(@Param("folderId") Long folderId);
}
