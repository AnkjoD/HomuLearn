package com.homulearn.app.goal;

import com.homulearn.app.entity.Goal;
import com.homulearn.app.entity.User;
import com.homulearn.app.repository.GoalRepository;
import com.homulearn.app.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;

@Service
@Transactional
public class GoalService {

    private final GoalRepository goals;
    private final UserRepository users;

    public GoalService(GoalRepository goals, UserRepository users) {
        this.goals = goals;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public List<GoalView> list(String email) {
        User user = resolveUser(email);
        return goals.findByUserId(user.getId()).stream().map(GoalView::from).toList();
    }

    public GoalView create(String email, GoalRequest req) {
        User user = resolveUser(email);
        Goal g = new Goal();
        g.setUser(user);
        g.setTitle(req.title().strip());
        g.setTargetValue(req.targetValue());
        int progress = req.currentProgress() == null ? 0 : req.currentProgress();
        if (progress > req.targetValue()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tiến độ vượt chỉ tiêu");
        g.setCurrentProgress(progress);
        g.setUnit(req.unit());
        g.setDeadline(req.deadline() == null ? null : req.deadline().withOffsetSameInstant(java.time.ZoneOffset.UTC).toLocalDateTime());
        return GoalView.from(goals.save(g));
    }

    public GoalView update(String email, Long id, GoalUpdateRequest req) {
        Goal g = resolveOwned(email, id);
        if (req.title() != null) {
            String t = req.title().strip();
            if (t.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title không được để trống");
            g.setTitle(t);
        }
        int target = req.targetValue() == null ? g.getTargetValue() : req.targetValue();
        int progress = req.currentProgress() == null ? g.getCurrentProgress() : req.currentProgress();
        if (progress < 0 || progress > target) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tiến độ vượt chỉ tiêu");
        g.setTargetValue(target);
        if (req.unit() != null) g.setUnit(req.unit().strip());
        if (Boolean.TRUE.equals(req.clearDeadline())) g.setDeadline(null);
        if (req.currentProgress() != null) {
            int p = req.currentProgress();
            if (p < 0 || p > g.getTargetValue())
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "currentProgress phải trong khoảng [0, targetValue]");
            g.setCurrentProgress(p);
        }
        if (req.deadline() != null) g.setDeadline(req.deadline() == null ? null : req.deadline().withOffsetSameInstant(java.time.ZoneOffset.UTC).toLocalDateTime());
        return GoalView.from(goals.save(g));
    }

    public void delete(String email, Long id) {
        Goal g = resolveOwned(email, id);
        goals.delete(g);
    }

    // --- helpers ---

    private User resolveUser(String email) {
        return users.findByEmail(email.strip().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tài khoản không tồn tại"));
    }

    private Goal resolveOwned(String email, Long id) {
        User user = resolveUser(email);
        // dùng findByIdAndUserId → 404 nếu không tồn tại hoặc không phải owner (không lộ 403)
        return goals.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Mục tiêu không tồn tại"));
    }
}
