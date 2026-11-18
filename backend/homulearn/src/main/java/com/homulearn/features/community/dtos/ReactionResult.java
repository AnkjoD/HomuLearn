package com.homulearn.features.community.dtos;

public record ReactionResult(Long postId, long reactionCount, boolean reactedByMe) {}
