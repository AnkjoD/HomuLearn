package com.homulearn.features.dashboard.controllers;

import com.homulearn.features.dashboard.dtos.DashboardStats;
import com.homulearn.features.dashboard.services.DashboardService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {

    private final DashboardService service;

    public DashboardController(DashboardService service) { this.service = service; }

    @GetMapping("/stats")
    DashboardStats stats(Authentication auth) { return service.stats(auth.getName()); }
}
