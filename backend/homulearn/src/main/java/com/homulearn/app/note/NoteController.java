package com.homulearn.app.note;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/notes")
public class NoteController {

    private final NoteService service;

    public NoteController(NoteService service) { this.service = service; }

    @GetMapping
    Map<String, Object> list(Authentication auth,
                             @RequestParam(defaultValue = "0") int page,
                             @RequestParam(defaultValue = "20") int size) {
        List<NoteView> all = service.list(auth.getName());
        int total = all.size();
        int safeSize = Math.min(Math.max(size, 1), 100);
        int safePage = Math.max(page, 0);
        int from = safePage * safeSize;
        List<NoteView> items = from >= total ? List.of()
                : all.subList(from, Math.min(from + safeSize, total));
        int totalPages = safeSize == 0 ? 0 : (int) Math.ceil((double) total / safeSize);
        return Map.of("items", items, "page", safePage, "size", safeSize,
                "totalItems", total, "totalPages", totalPages);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    NoteView create(Authentication auth, @Valid @RequestBody NoteRequest req) {
        return service.create(auth.getName(), req);
    }

    @GetMapping("/{id}")
    NoteView get(Authentication auth, @PathVariable Long id) {
        return service.get(auth.getName(), id);
    }

    @PatchMapping("/{id}")
    NoteView update(Authentication auth, @PathVariable Long id,
                    @Valid @RequestBody NoteUpdateRequest req) {
        return service.update(auth.getName(), id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(Authentication auth, @PathVariable Long id) {
        service.delete(auth.getName(), id);
    }
}
