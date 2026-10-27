import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Chip,
  Button,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Paper,
  CircularProgress,
  Alert,
  Pagination,
  Stack,
  Divider,
} from "@mui/material";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { useDispatch, useSelector } from "react-redux";
import {
  loadPosts,
  addPost,
  editPost,
  removePost,
  loadPost,
  loadComments,
  addComment,
  editComment,
  removeComment,
  clearSelectedPost,
} from "../store/communitySlice";

export default function Community() {
  const dispatch = useDispatch();
  const { posts, page, totalPages, status, comments, commentsStatus, submitting, commentSubmitting, error, commentsError, detailError, selectedPost } =
    useSelector((s) => s.community);
  const currentUser = useSelector((s) => s.auth.user);

  // Modal tạo / sửa bài
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState(null);
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postError, setPostError] = useState("");

  // Modal chi tiết & bình luận
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [activePost, setActivePost] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState("");

  useEffect(() => {
    dispatch(loadPosts({ page: 0, size: 10 }));
    return () => { dispatch(clearSelectedPost()); };
  }, [dispatch]);

  const handlePageChange = (_, newPage) => {
    dispatch(loadPosts({ page: newPage - 1, size: 10 }));
  };

  // Mở modal tạo bài mới
  const handleOpenCreatePost = () => {
    setEditingPostId(null);
    setPostTitle("");
    setPostContent("");
    setPostError("");
    setPostModalOpen(true);
  };

  // Mở modal sửa bài
  const handleOpenEditPost = (post, e) => {
    e?.stopPropagation();
    setEditingPostId(post.id);
    setPostTitle(post.title);
    setPostContent(post.content);
    setPostError("");
    setPostModalOpen(true);
  };

  const handleSavePost = async () => {
    if (!postTitle.trim() || !postContent.trim()) {
      setPostError("Vui lòng điền đủ tiêu đề và nội dung.");
      return;
    }
    setPostError("");
    try {
      if (editingPostId) {
        await dispatch(
          editPost({
            id: editingPostId,
            data: { title: postTitle.trim(), content: postContent.trim() },
          })
        ).unwrap();
      } else {
        await dispatch(
          addPost({ title: postTitle.trim(), content: postContent.trim() })
        ).unwrap();
      }
      setPostModalOpen(false);
      dispatch(loadPosts({ page: editingPostId ? page : 0, size: 10 }));
    } catch (err) {
      setPostError(err?.message || "Không thể lưu bài viết");
    }
  };

  const handleDeletePost = async (id, e) => {
    e?.stopPropagation();
    if (!window.confirm("Bạn có chắc chắn muốn xóa bài viết này?")) return;
    try {
      await dispatch(removePost(id)).unwrap();
      dispatch(loadPosts({ page: posts.length === 1 ? Math.max(0, page - 1) : page, size: 10 }));
      if (activePost?.id === id) {
        setDetailModalOpen(false);
        setActivePost(null);
      }
    } catch (err) {
      alert(err || "Lỗi xóa bài");
    }
  };

  // Mở xem chi tiết bài & danh sách bình luận
  const handleOpenDetail = (post) => {
    setActivePost(post);
    setCommentText("");
    setEditingCommentId(null);
    setDetailModalOpen(true);
    dispatch(loadPost(post.id));
    dispatch(loadComments(post.id));
  };

  const handleCloseDetail = () => {
    if (commentSubmitting) return;
    setDetailModalOpen(false);
    setActivePost(null);
    dispatch(clearSelectedPost());
  };

  // Gửi bình luận mới
  const handleSendComment = async () => {
    if (!commentText.trim() || !activePost || commentSubmitting) return;
    try {
      await dispatch(
        addComment({ postId: activePost.id, content: commentText.trim() })
      ).unwrap();
      setCommentText("");
    } catch (err) {
      /* Slice exposes the error; keep the typed comment. */
    }
  };

  // Sửa bình luận
  const handleStartEditComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditCommentText(comment.content);
  };

  const handleSaveEditComment = async (commentId) => {
    if (!editCommentText.trim() || commentSubmitting) return;
    try {
      await dispatch(
        editComment({
          postId: activePost.id,
          commentId,
          content: editCommentText.trim(),
        })
      ).unwrap();
      setEditingCommentId(null);
    } catch (err) {
      /* Slice exposes the error; keep the edit form. */
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Xóa bình luận này?")) return;
    try {
      await dispatch(
        removeComment({ postId: activePost.id, commentId })
      ).unwrap();
    } catch (err) {
      /* Slice exposes the error. */
    }
  };

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Cộng đồng HomuLearn
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Trao đổi câu hỏi, kiến thức và thảo luận học tập.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={handleOpenCreatePost}
          disabled={submitting}
          data-testid="create-post-btn"
        >
          Đăng bài mới
        </Button>
      </Box>

      {error && <Alert severity="error" action={<Button onClick={() => dispatch(loadPosts({ page, size: 10 }))}>Thử lại</Button>}>{error}</Alert>}
      {/* Danh sách bài đăng */}
      {status === "loading" && posts.length === 0 ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : posts.length === 0 && status !== "failed" ? (
        <Paper
          data-testid="empty-posts"
          sx={{
            p: 6,
            textAlign: "center",
            borderRadius: 3,
            bgcolor: "background.paper",
            border: "1px dashed",
            borderColor: "divider",
          }}
        >
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Chưa có bài viết nào
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Hãy là người đầu tiên chia sẻ câu hỏi hoặc kiến thức với cộng đồng!
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddRoundedIcon />}
            onClick={handleOpenCreatePost}
          >
            Tạo bài đăng ngay
          </Button>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {posts.map((post) => {
            const isOwner =
              currentUser && post.author?.id === currentUser.id;
            return (
              <Card
                key={post.id}
                data-testid={`post-card-${post.id}`}
                sx={{
                  cursor: "pointer",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    boxShadow: 3,
                    borderColor: "primary.main",
                  },
                }}
                onClick={() => handleOpenDetail(post)}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 1.5,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <Avatar sx={{ bgcolor: "primary.main", width: 36, height: 36 }}>
                        {(post.author?.name || "U")[0].toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {post.author?.name || "Người dùng ẩn danh"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(post.createdAt).toLocaleString("vi-VN")}
                        </Typography>
                      </Box>
                    </Box>
                    {isOwner && (
                      <Box onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="Chỉnh sửa">
                          <IconButton
                            size="small"
                            onClick={(e) => handleOpenEditPost(post, e)}
                            disabled={submitting}
                            data-testid={`edit-post-${post.id}`}
                          >
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Xóa bài">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => handleDeletePost(post.id, e)}
                            disabled={submitting}
                            data-testid={`delete-post-${post.id}`}
                          >
                            <DeleteOutlineRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                  </Box>

                  <Typography
                    variant="h6"
                    fontWeight={700}
                    gutterBottom
                    data-testid={`post-title-${post.id}`}
                  >
                    {post.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      mb: 2,
                    }}
                  >
                    {post.content}
                  </Typography>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      color: "text.secondary",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <ChatBubbleOutlineRoundedIcon fontSize="small" />
                      <Typography variant="caption" fontWeight={600}>
                        {post.commentCount || 0} bình luận
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      {/* Phân trang */}
      {totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <Pagination
            disabled={submitting || status === "loading"}
            count={totalPages}
            page={page + 1}
            onChange={handlePageChange}
            color="primary"
          />
        </Box>
      )}

      {/* Dialog Tạo/Sửa bài */}
      <Dialog
        open={postModalOpen}
        onClose={() => !submitting && setPostModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingPostId ? "Chỉnh sửa bài viết" : "Tạo bài viết mới"}
        </DialogTitle>
        <DialogContent dividers>
          {postError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {postError}
            </Alert>
          )}
          <TextField
            autoFocus
            label="Tiêu đề bài viết"
            fullWidth
            required
            margin="normal"
            value={postTitle}
            onChange={(e) => setPostTitle(e.target.value)}
            inputProps={{ maxLength: 255 }}
            data-testid="post-title-input"
          />
          <TextField
            label="Nội dung"
            fullWidth
            required
            multiline
            rows={5}
            margin="normal"
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            data-testid="post-content-input"
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setPostModalOpen(false)}
            disabled={submitting}
          >
            Hủy
          </Button>
          <Button
            variant="contained"
            onClick={handleSavePost}
            disabled={submitting || !postTitle.trim() || !postContent.trim()}
            data-testid="save-post-btn"
          >
            {submitting ? "Đang lưu..." : editingPostId ? "Cập nhật" : "Đăng bài"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Chi tiết bài viết & Bình luận */}
      <Dialog
        open={detailModalOpen}
        onClose={handleCloseDetail}
        maxWidth="md"
        fullWidth
      >
        {activePost && (
          <>
            <DialogTitle
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  {selectedPost?.title || activePost.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Đăng bởi {activePost.author?.name || "Ẩn danh"} lúc{" "}
                  {new Date(activePost.createdAt).toLocaleString("vi-VN")}
                </Typography>
              </Box>
              <IconButton aria-label="Đóng chi tiết" onClick={handleCloseDetail} size="small">
                <CloseRoundedIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Typography
                variant="body1"
                sx={{ whiteSpace: "pre-wrap", mb: 3 }}
                data-testid="detail-post-content"
              >
                {selectedPost?.content || activePost.content}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Bình luận ({comments.length})
              </Typography>

              {detailError && <Alert severity="error" action={<Button onClick={() => dispatch(loadPost(activePost.id))}>Tải lại bài</Button>}>{detailError}</Alert>}
              {commentsError && <Alert severity="error" action={<Button onClick={() => dispatch(loadComments(activePost.id))}>Tải lại bình luận</Button>}>{commentsError}</Alert>}
              {/* Form gửi bình luận */}
              <Box sx={{ display: "flex", gap: 1, mb: 3, mt: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Bình luận của bạn"
                  inputProps={{ maxLength: 5000 }}
                  disabled={commentSubmitting || Boolean(detailError)}
                  placeholder="Viết bình luận của bạn..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendComment();
                    }
                  }}
                  data-testid="comment-input"
                />
                <Button
                  variant="contained"
                  endIcon={<SendRoundedIcon />}
                  onClick={handleSendComment}
                  disabled={!commentText.trim() || commentSubmitting || Boolean(detailError)}
                  data-testid="send-comment-btn"
                >
                  Gửi
                </Button>
              </Box>

              {/* Danh sách bình luận */}
              {commentsStatus === "loading" ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : comments.length === 0 && commentsStatus !== "failed" ? (
                <Typography variant="body2" color="text.secondary" align="center" py={2}>
                  Chưa có bình luận nào. Hãy bắt đầu cuộc trò chuyện!
                </Typography>
              ) : (
                <Stack spacing={2} data-testid="comments-list">
                  {comments.map((c) => {
                    const isCommentOwner =
                      currentUser && c.author?.id === currentUser.id;
                    const isEditing = editingCommentId === c.id;

                    return (
                      <Paper
                        key={c.id}
                        data-testid={`comment-item-${c.id}`}
                        variant="outlined"
                        sx={{ p: 1.5, borderRadius: 2 }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            mb: 0.5,
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
                              {(c.author?.name || "U")[0].toUpperCase()}
                            </Avatar>
                            <Typography variant="subtitle2" fontSize={13} fontWeight={600}>
                              {c.author?.name || "Người dùng"}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(c.createdAt).toLocaleTimeString("vi-VN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </Typography>
                          </Box>
                          {isCommentOwner && !isEditing && (
                            <Box>
                              <IconButton
                                size="small"
                                onClick={() => handleStartEditComment(c)}
                                disabled={commentSubmitting}
                              data-testid={`edit-comment-${c.id}`}
                              >
                                <EditRoundedIcon fontSize="small" sx={{ fontSize: 16 }} />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteComment(c.id)}
                                disabled={commentSubmitting}
                              data-testid={`delete-comment-${c.id}`}
                              >
                                <DeleteOutlineRoundedIcon
                                  fontSize="small"
                                  sx={{ fontSize: 16 }}
                                />
                              </IconButton>
                            </Box>
                          )}
                        </Box>

                        {isEditing ? (
                          <Box sx={{ mt: 1 }}>
                            <TextField
                              fullWidth
                              size="small"
                              value={editCommentText}
                              onChange={(e) => setEditCommentText(e.target.value)}
                              disabled={commentSubmitting}
                              data-testid={`edit-comment-input-${c.id}`}
                            />
                            <Box sx={{ display: "flex", gap: 1, mt: 1, justifyContent: "flex-end" }}>
                              <Button
                                size="small"
                                onClick={() => setEditingCommentId(null)}
                              >
                                Hủy
                              </Button>
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => handleSaveEditComment(c.id)}
                                disabled={commentSubmitting}
                              data-testid={`save-edit-comment-${c.id}`}
                              >
                                Lưu
                              </Button>
                            </Box>
                          </Box>
                        ) : (
                          <Typography
                            variant="body2"
                            sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}
                            data-testid={`comment-content-${c.id}`}
                          >
                            {c.content}
                          </Typography>
                        )}
                      </Paper>
                    );
                  })}
                </Stack>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDetail}>Đóng</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
