package com.homulearn.features.pomodoro.services;

import com.homulearn.features.auth.entities.User;
import com.homulearn.features.auth.repositories.UserRepository;
import com.homulearn.features.pomodoro.dtos.SessionRequest;
import com.homulearn.features.pomodoro.dtos.SessionView;
import com.homulearn.features.pomodoro.entities.PomodoroSession;
import com.homulearn.features.pomodoro.repositories.PomodoroSessionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
@Transactional
public class PomodoroService {

    private final PomodoroSessionRepository sessions;
    private final UserRepository users;
    @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager entityManager;

    public PomodoroService(PomodoroSessionRepository sessions, UserRepository users) {
        this.sessions = sessions;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public SessionListView list(String email) {
        User user = resolveUser(email);
        List<SessionView> items = sessions.findByUserIdOrderByCompletedAtDesc(user.getId())
                .stream().map(SessionView::from).toList();
        return new SessionListView(items, (int) sessions.sumDurationByUserId(user.getId()));
    }

    public IdempotentResult<SessionView> save(String email, SessionRequest req, String idempotencyKey) {
        User user = resolveUser(email);
        entityManager.lock(user, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        if (idempotencyKey != null && !idempotencyKey.matches("[0-9a-fA-F-]{36}"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Idempotency-Key khong hop le");
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<PomodoroSession> existing = sessions.findByIdempotencyKey(idempotencyKey);
            if (existing.isPresent()) {
                if (!existing.get().getUser().getId().equals(user.getId()))
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Ma phien da duoc su dung");
                if (!existing.get().getDurationMinutes().equals(req.durationMinutes()))
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Ma phien co du lieu khac");
                return new IdempotentResult<>(SessionView.from(existing.get()), false);
            }
        }
        PomodoroSession s = new PomodoroSession();
        s.setUser(user);
        s.setDurationMinutes(req.durationMinutes());
        s.setStartedAt(req.startedAt() == null ? null : req.startedAt().withOffsetSameInstant(java.time.ZoneOffset.UTC).toLocalDateTime());
        if (req.startedAt() != null && req.completedAt() != null && req.startedAt().isAfter(req.completedAt()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thoi gian ket thuc truoc bat dau");
        s.setCompletedAt(req.completedAt() != null ? req.completedAt().withOffsetSameInstant(java.time.ZoneOffset.UTC).toLocalDateTime() : LocalDateTime.now(java.time.ZoneOffset.UTC));
        s.setIdempotencyKey(idempotencyKey);
        return new IdempotentResult<>(SessionView.from(sessions.save(s)), true);
    }

    private User resolveUser(String email) {
        return users.findByEmail(email.strip().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tai khoan khong ton tai"));
    }

    public record IdempotentResult<T>(T value, boolean isNew) {}
    public record SessionListView(List<SessionView> sessions, int totalMinutes) {}
}
