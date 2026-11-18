package com.homulearn.features.goal.services;

import com.homulearn.features.auth.entities.User;
import com.homulearn.features.auth.repositories.UserRepository;
import com.homulearn.features.goal.dtos.GoalRequest;
import com.homulearn.features.goal.dtos.GoalUpdateRequest;
import com.homulearn.features.goal.dtos.GoalView;
import com.homulearn.features.goal.entities.Goal;
import com.homulearn.features.goal.repositories.GoalRepository;
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
        return goals.findByUserId(resolveUser(email).getId()).stream().map(GoalView::from).toList();
    }

    public GoalView create(String email, GoalRequest req) {
        User user = resolveUser(email);
        Goal g = new Goal();
        g.setUser(user);
        g.setTitle(req.title().strip());
        g.setTargetValue(req.targetValue());
        int progress = req.currentProgress() == null ? 0 : req.currentProgress();
        if (progress > req.targetValue()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tien do vuot chi tieu");
        g.setCurrentProgress(progress);
        g.setUnit(req.unit());
        g.setDeadline(req.deadline() == null ? null : req.deadline().withOffsetSameInstant(java.time.ZoneOffset.UTC).toLocalDateTime());
        return GoalView.from(goals.save(g));
    }

    public GoalView update(String email, Long id, GoalUpdateRequest req) {
        Goal g = resolveOwned(email, id);
        if (req.title() != null) {
            String t = req.title().strip();
            if (t.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title khong duoc de trong");
            g.setTitle(t);
        }
        int target = req.targetValue() == null ? g.getTargetValue() : req.targetValue();
        if (req.unit() != null) g.setUnit(req.unit().strip());
        if (Boolean.TRUE.equals(req.clearDeadline())) g.setDeadline(null);
        int nextProgress = req.currentProgress() == null ? g.getCurrentProgress() : req.currentProgress();
        if (nextProgress < 0 || nextProgress > target) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "currentProgress phai trong khoang [0, targetValue]");
        }
        g.setCurrentProgress(nextProgress);
        g.setTargetValue(target);
        if (req.deadline() != null) g.setDeadline(req.deadline().withOffsetSameInstant(java.time.ZoneOffset.UTC).toLocalDateTime());
        return GoalView.from(goals.save(g));
    }

    public void delete(String email, Long id) { goals.delete(resolveOwned(email, id)); }

    private User resolveUser(String email) {
        return users.findByEmail(email.strip().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tai khoan khong ton tai"));
    }

    private Goal resolveOwned(String email, Long id) {
        return goals.findByIdAndUserId(id, resolveUser(email).getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Muc tieu khong ton tai"));
    }
}
