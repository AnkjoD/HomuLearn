package com.homulearn.features.community.repositories;

import com.homulearn.features.community.entities.PostReaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PostReactionRepository extends JpaRepository<PostReaction, Long> {
    long countByPostId(Long postId);
    Optional<PostReaction> findByPostIdAndUserId(Long postId, Long userId);
    boolean existsByPostIdAndUserId(Long postId, Long userId);
    void deleteAllByPostId(Long postId);
}
