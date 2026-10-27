package com.homulearn.app.pomodoro;

import com.homulearn.app.entity.PomodoroSession;
import com.homulearn.app.entity.User;
import com.homulearn.app.repository.PomodoroSessionRepository;
import com.homulearn.app.repository.UserRepository;
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
        long total = sessions.sumDurationByUserId(user.getId());
        return new SessionListView(items, (int) total);
    }

    /**
     * Idempotency: nếu cùng idempotencyKey đã tồn tại trong DB → trả session cũ (HTTP 200).
     * Nếu key mới → lưu session mới (HTTP 201).
     * Controller phân biệt bằng boolean returned flag.
     */
    public IdempotentResult<SessionView> save(String email, SessionRequest req, String idempotencyKey) {
        User user = resolveUser(email);
        entityManager.lock(user, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        if (idempotencyKey != null && !idempotencyKey.matches("[0-9a-fA-F-]{36}"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Idempotency-Key không hợp lệ");
        // Khóa user tuần tự hóa các retry đồng thời của cùng tài khoản.
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<PomodoroSession> existing = sessions.findByIdempotencyKey(idempotencyKey);
            if (existing.isPresent()) {
                if (!existing.get().getUser().getId().equals(user.getId()))
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Mã phiên đã được sử dụng");
                if (!existing.get().getDurationMinutes().equals(req.durationMinutes()))
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Mã phiên có dữ liệu khác");
                return new IdempotentResult<>(SessionView.from(existing.get()), false); // false = đã có, 200
            }
        }

        PomodoroSession s = new PomodoroSession();
        s.setUser(user);
        s.setDurationMinutes(req.durationMinutes());
        s.setStartedAt(req.startedAt() == null ? null : req.startedAt().withOffsetSameInstant(java.time.ZoneOffset.UTC).toLocalDateTime());
        if (req.startedAt() != null && req.completedAt() != null && req.startedAt().isAfter(req.completedAt()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thời gian kết thúc trước bắt đầu");
        s.setCompletedAt(req.completedAt() != null ? req.completedAt().withOffsetSameInstant(java.time.ZoneOffset.UTC).toLocalDateTime() : LocalDateTime.now(java.time.ZoneOffset.UTC));
        s.setIdempotencyKey(idempotencyKey);
        return new IdempotentResult<>(SessionView.from(sessions.save(s)), true); // true = mới, 201
    }

    private User resolveUser(String email) {
        return users.findByEmail(email.strip().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tài khoản không tồn tại"));
    }

    public record IdempotentResult<T>(T value, boolean isNew) {}
    public record SessionListView(List<SessionView> sessions, int totalMinutes) {}
}
