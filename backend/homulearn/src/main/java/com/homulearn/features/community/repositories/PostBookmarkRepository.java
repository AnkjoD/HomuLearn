package com.homulearn.features.community.repositories;

import com.homulearn.features.community.entities.PostBookmark;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PostBookmarkRepository extends JpaRepository<PostBookmark, Long> {
    Optional<PostBookmark> findByPostIdAndUserId(Long postId, Long userId);
    boolean existsByPostIdAndUserId(Long postId, Long userId);
    void deleteAllByPostId(Long postId);
}
