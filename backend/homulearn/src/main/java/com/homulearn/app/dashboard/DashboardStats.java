package com.homulearn.app.dashboard;

public record DashboardStats(
        long noteCount,
        long goalInProgress,
        long goalDone,
        long sessionCount,
        long totalMinutes
) {}
