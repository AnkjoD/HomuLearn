package com.homulearn.features.note.controllers;

import com.homulearn.features.note.dtos.NoteFolderRequest;
import com.homulearn.features.note.dtos.NoteFolderView;
import com.homulearn.features.note.services.NoteFolderService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/note-folders")
public class NoteFolderController {

    private final NoteFolderService service;

    public NoteFolderController(NoteFolderService service) {
        this.service = service;
    }

    @GetMapping
    List<NoteFolderView> list(Authentication auth) {
        return service.list(auth.getName());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    NoteFolderView create(Authentication auth, @Valid @RequestBody NoteFolderRequest req) {
        return service.create(auth.getName(), req);
    }

    @PatchMapping("/{id}")
    NoteFolderView update(Authentication auth, @PathVariable Long id,
                          @Valid @RequestBody NoteFolderRequest req) {
        return service.update(auth.getName(), id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(Authentication auth, @PathVariable Long id) {
        service.delete(auth.getName(), id);
    }
}
