package com.homulearn.features.goal.controllers;

import com.homulearn.features.goal.dtos.GoalRequest;
import com.homulearn.features.goal.dtos.GoalUpdateRequest;
import com.homulearn.features.goal.dtos.GoalView;
import com.homulearn.features.goal.services.GoalService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/goals")
public class GoalController {

    private final GoalService service;

    public GoalController(GoalService service) { this.service = service; }

    @GetMapping
    List<GoalView> list(Authentication auth) { return service.list(auth.getName()); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    GoalView create(Authentication auth, @Valid @RequestBody GoalRequest req) {
        return service.create(auth.getName(), req);
    }

    @PatchMapping("/{id}")
    GoalView update(Authentication auth, @PathVariable Long id, @Valid @RequestBody GoalUpdateRequest req) {
        return service.update(auth.getName(), id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(Authentication auth, @PathVariable Long id) { service.delete(auth.getName(), id); }
}
