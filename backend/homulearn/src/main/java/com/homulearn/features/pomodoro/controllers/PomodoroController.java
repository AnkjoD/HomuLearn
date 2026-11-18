package com.homulearn.features.pomodoro.controllers;

import com.homulearn.features.pomodoro.dtos.SessionRequest;
import com.homulearn.features.pomodoro.dtos.SessionView;
import com.homulearn.features.pomodoro.services.PomodoroService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/pomodoro-sessions")
public class PomodoroController {

    private final PomodoroService service;

    public PomodoroController(PomodoroService service) { this.service = service; }

    @GetMapping
    PomodoroService.SessionListView list(Authentication auth) { return service.list(auth.getName()); }

    @PostMapping
    ResponseEntity<SessionView> save(
            Authentication auth,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody SessionRequest req) {
        PomodoroService.IdempotentResult<SessionView> result = service.save(auth.getName(), req, idempotencyKey);
        return ResponseEntity.status(result.isNew() ? HttpStatus.CREATED : HttpStatus.OK).body(result.value());
    }
}
