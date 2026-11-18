package com.homulearn.features.dashboard.services;

import com.homulearn.features.auth.entities.User;
import com.homulearn.features.auth.repositories.UserRepository;
import com.homulearn.features.dashboard.dtos.DashboardStats;
import com.homulearn.features.goal.repositories.GoalRepository;
import com.homulearn.features.note.repositories.NoteRepository;
import com.homulearn.features.pomodoro.repositories.PomodoroSessionRepository;
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
        this.users = users; this.notes = notes; this.goals = goals; this.sessions = sessions;
    }

    public DashboardStats stats(String email) {
        User user = users.findByEmail(email.strip().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tai khoan khong ton tai"));
        long uid = user.getId();
        return new DashboardStats(notes.countByUserId(uid), goals.countInProgressByUserId(uid),
                goals.countDoneByUserId(uid), sessions.countByUserId(uid), sessions.sumDurationByUserId(uid));
    }
}
