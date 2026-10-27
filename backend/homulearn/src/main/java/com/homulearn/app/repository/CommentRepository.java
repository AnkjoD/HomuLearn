package com.homulearn.app.repository;

import com.homulearn.app.entity.Comment;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {
    @EntityGraph(attributePaths = {"user"})
    List<Comment> findAllByPostIdOrderByCreatedAtAsc(Long postId);

    @EntityGraph(attributePaths = {"user", "post"})
    Optional<Comment> findWithUserAndPostById(Long id);

    long countByPostId(Long postId);
    void deleteAllByPostId(Long postId);
}
