package com.homulearn.features.note.services;

import com.homulearn.features.auth.entities.User;
import com.homulearn.features.auth.repositories.UserRepository;
import com.homulearn.features.note.dtos.NoteFolderRequest;
import com.homulearn.features.note.dtos.NoteFolderView;
import com.homulearn.features.note.entities.NoteFolder;
import com.homulearn.features.note.repositories.NoteFolderRepository;
import com.homulearn.features.note.repositories.NoteRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
@Transactional
public class NoteFolderService {

    private static final String DEFAULT_ICON = "📁";

    private final NoteFolderRepository folders;
    private final NoteRepository notes;
    private final UserRepository users;

    public NoteFolderService(NoteFolderRepository folders, NoteRepository notes, UserRepository users) {
        this.folders = folders;
        this.notes = notes;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public List<NoteFolderView> list(String email) {
        User user = resolveUser(email);
        return folders.findByUserIdOrderByCreatedAtAsc(user.getId())
                .stream().map(NoteFolderView::from).toList();
    }

    public NoteFolderView create(String email, NoteFolderRequest req) {
        User user = resolveUser(email);
        NoteFolder folder = new NoteFolder();
        folder.setUser(user);
        folder.setName(req.name().strip());
        folder.setIcon(normalizeIcon(req.icon()));
        folder.setNoteContent(normalizeNoteContent(req.noteContent()));
        folder.setCreatedAt(LocalDateTime.now());
        return NoteFolderView.from(folders.save(folder));
    }

    public NoteFolderView update(String email, Long id, NoteFolderRequest req) {
        NoteFolder folder = resolveOwned(email, id);
        folder.setName(req.name().strip());
        if (req.icon() != null && !req.icon().isBlank()) {
            folder.setIcon(req.icon().strip());
        }
        if (req.noteContent() != null) {
            folder.setNoteContent(req.noteContent().strip());
        }
        return NoteFolderView.from(folders.save(folder));
    }

    public void delete(String email, Long id) {
        NoteFolder folder = resolveOwned(email, id);
        notes.clearFolder(folder.getId());
        folders.delete(folder);
    }

    private String normalizeIcon(String icon) {
        if (icon == null || icon.isBlank()) return DEFAULT_ICON;
        return icon.strip();
    }

    private String normalizeNoteContent(String noteContent) {
        if (noteContent == null) return "";
        return noteContent.strip();
    }

    private User resolveUser(String email) {
        return users.findByEmail(email.strip().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "Tài khoản không tồn tại"));
    }

    private NoteFolder resolveOwned(String email, Long id) {
        User user = resolveUser(email);
        NoteFolder folder = folders.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Thư mục không tồn tại"));
        if (!folder.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Thư mục không tồn tại");
        }
        return folder;
    }
}
