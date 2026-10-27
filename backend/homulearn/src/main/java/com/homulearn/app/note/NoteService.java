package com.homulearn.app.note;

import com.homulearn.app.entity.Note;
import com.homulearn.app.entity.User;
import com.homulearn.app.repository.NoteRepository;
import com.homulearn.app.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
@Transactional
public class NoteService {

    private final NoteRepository notes;
    private final UserRepository users;

    public NoteService(NoteRepository notes, UserRepository users) {
        this.notes = notes;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public List<NoteView> list(String email) {
        User user = resolveUser(email);
        return notes.findByUserIdOrderByUpdatedAtDesc(user.getId())
                .stream().map(NoteView::from).toList();
    }

    public NoteView create(String email, NoteRequest req) {
        User user = resolveUser(email);
        Note note = new Note();
        note.setUser(user);
        note.setTitle(req.title().strip());
        note.setContent(req.content());
        note.setCreatedAt(LocalDateTime.now());
        note.setUpdatedAt(LocalDateTime.now());
        return NoteView.from(notes.save(note));
    }

    @Transactional(readOnly = true)
    public NoteView get(String email, Long id) {
        return NoteView.from(resolveOwned(email, id));
    }

    public NoteView update(String email, Long id, NoteUpdateRequest req) {
        Note note = resolveOwned(email, id);
        if (req.title() != null) {
            String t = req.title().strip();
            if (t.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "title không được để trống");
            note.setTitle(t);
        }
        if (req.content() != null) note.setContent(req.content());
        note.setUpdatedAt(LocalDateTime.now());
        return NoteView.from(notes.save(note));
    }

    public void delete(String email, Long id) {
        Note note = resolveOwned(email, id);
        notes.delete(note);
    }

    // --- helpers ---

    private User resolveUser(String email) {
        return users.findByEmail(email.strip().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "Tài khoản không tồn tại"));
    }

    private Note resolveOwned(String email, Long id) {
        User user = resolveUser(email);
        Note note = notes.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Ghi chú không tồn tại"));
        if (!note.getUser().getId().equals(user.getId()))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Ghi chú không tồn tại");
        return note;
    }
}
