package com.homulearn.features.dashboard.dtos;

public record DashboardStats(
        long noteCount,
        long goalInProgress,
        long goalDone,
        long sessionCount,
        long totalMinutes
) {}
