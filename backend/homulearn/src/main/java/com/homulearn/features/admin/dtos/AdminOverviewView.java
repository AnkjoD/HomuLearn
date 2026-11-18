package com.homulearn.features.admin.dtos;

public record AdminOverviewView(
    long totalUsers,
    long activeUsers,
    long bannedUsers,
    long pendingReports,
    long totalPosts,
    long totalGroups
) {}
