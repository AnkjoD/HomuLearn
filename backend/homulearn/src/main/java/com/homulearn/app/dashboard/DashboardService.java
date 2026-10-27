package com.homulearn.app.dashboard;

import com.homulearn.app.entity.User;
import com.homulearn.app.repository.GoalRepository;
import com.homulearn.app.repository.NoteRepository;
import com.homulearn.app.repository.PomodoroSessionRepository;
import com.homulearn.app.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    private final UserRepository users;
    private final NoteRepository notes;
    private final GoalRepository goals;
    private final PomodoroSessionRepository sessions;

    public DashboardService(UserRepository users, NoteRepository notes,
                            GoalRepository goals, PomodoroSessionRepository sessions) {
        this.users = users;
        this.notes = notes;
        this.goals = goals;
        this.sessions = sessions;
    }

    public DashboardStats stats(String email) {
        User user = users.findByEmail(email.strip().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tài khoản không tồn tại"));
        long userId = user.getId();

        long noteCount = notes.countByUserId(userId);

        return new DashboardStats(
                noteCount,
                goals.countInProgressByUserId(userId),
                goals.countDoneByUserId(userId),
                sessions.countByUserId(userId),
                sessions.sumDurationByUserId(userId)
        );
    }
}
