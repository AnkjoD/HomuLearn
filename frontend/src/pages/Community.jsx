import React, { useState, useEffect, useRef } from "react";
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
  InputAdornment,
} from "@mui/material";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import BookmarkRoundedIcon from "@mui/icons-material/BookmarkRounded";
import BookmarkBorderRoundedIcon from "@mui/icons-material/BookmarkBorderRounded";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
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
  toggleReaction,
  toggleBookmark,
  submitPostReport,
  clearSelectedPost,
  setSearchQuery,
} from "../store/communitySlice";

export default function Community() {
  const dispatch = useDispatch();
  const { posts, page, totalPages, status, searchQuery, comments, commentsStatus, submitting, commentSubmitting, error, commentsError, detailError, selectedPost } =
    useSelector((s) => s.community);
  const currentUser = useSelector((s) => s.auth.user);

  // Search input state
  const [searchInput, setSearchInput] = useState(searchQuery || "");
  const prevSearchRef = useRef(searchInput);

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

  // Modal báo cáo bài viết
  const [reportPostId, setReportPostId] = useState(null);
  const [reportReason, setReportReason] = useState("");
  const [reportError, setReportError] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportNotice, setReportNotice] = useState("");

  // Load initial posts
  useEffect(() => {
    dispatch(loadPosts({ page: 0, size: 10, query: searchInput }));
    return () => { dispatch(clearSelectedPost()); };
  }, [dispatch]);

  // Debounced search (400ms)
  useEffect(() => {
    if (prevSearchRef.current === searchInput) {
      return;
    }
    prevSearchRef.current = searchInput;
    const timer = setTimeout(() => {
      dispatch(setSearchQuery(searchInput));
      dispatch(loadPosts({ page: 0, size: 10, query: searchInput }));
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput, dispatch]);

  const handleClearSearch = () => {
    prevSearchRef.current = "";
    setSearchInput("");
    dispatch(setSearchQuery(""));
    dispatch(loadPosts({ page: 0, size: 10, query: "" }));
  };

  const handlePageChange = (_, newPage) => {
    dispatch(loadPosts({ page: newPage - 1, size: 10, query: searchInput }));
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
      dispatch(loadPosts({ page: editingPostId ? page : 0, size: 10, query: searchInput }));
    } catch (err) {
      setPostError(err?.message || "Không thể lưu bài viết");
    }
  };

  const handleDeletePost = async (id, e) => {
    e?.stopPropagation();
    if (!window.confirm("Bạn có chắc chắn muốn xóa bài viết này?")) return;
    try {
      await dispatch(removePost(id)).unwrap();
      dispatch(loadPosts({ page: posts.length === 1 ? Math.max(0, page - 1) : page, size: 10, query: searchInput }));
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

      {/* Thanh tìm kiếm */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Tìm kiếm bài viết theo tiêu đề hoặc nội dung..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          data-testid="community-search-input"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: searchInput ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={handleClearSearch}
                  data-testid="clear-search-btn"
                  edge="end"
                >
                  <ClearRoundedIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />
      </Box>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => dispatch(loadPosts({ page, size: 10, query: searchInput }))}
              data-testid="retry-btn"
            >
              Thử lại
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Danh sách bài đăng */}
      {status === "loading" && posts.length === 0 ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }} data-testid="posts-loading">
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
            {searchInput.trim() ? "Không tìm thấy bài viết phù hợp" : "Chưa có bài viết nào"}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {searchInput.trim()
              ? `Không có kết quả nào cho "${searchInput.trim()}". Thử tìm với từ khóa khác.`
              : "Hãy là người đầu tiên chia sẻ câu hỏi hoặc kiến thức với cộng đồng!"}
          </Typography>
          {searchInput.trim() ? (
            <Button
              variant="outlined"
              onClick={handleClearSearch}
              data-testid="empty-clear-search-btn"
            >
              Xóa bộ lọc tìm kiếm
            </Button>
          ) : (
            <Button
              variant="outlined"
              startIcon={<AddRoundedIcon />}
              onClick={handleOpenCreatePost}
            >
              Tạo bài đăng ngay
            </Button>
          )}
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
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      mb: 1.5,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <Avatar
                        sx={{
                          width: 38,
                          height: 38,
                          bgcolor: "primary.main",
                          fontSize: "0.95rem",
                          fontWeight: 600,
                        }}
                      >
                        {post.author?.name
                          ? post.author.name.charAt(0).toUpperCase()
                          : "U"}
                      </Avatar>
                      <Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Typography variant="subtitle2" fontWeight={700}>
                            {post.author?.name || "Người dùng"}
                          </Typography>
                          {isOwner && (
                            <Chip
                              label="Tác giả"
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{ height: 20, fontSize: "0.7rem" }}
                            />
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(post.createdAt).toLocaleDateString("vi-VN", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Typography>
                      </Box>
                    </Box>

                    {isOwner && (
                      <Box onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="Chỉnh sửa">
                          <IconButton
                            size="small"
                            onClick={(e) => handleOpenEditPost(post, e)}
                            data-testid={`edit-post-${post.id}`}
                          >
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Xóa">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => handleDeletePost(post.id, e)}
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
                      gap: 1.5,
                      color: "text.secondary",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      size="small"
                      color={post.reactedByMe ? "error" : "inherit"}
                      startIcon={
                        post.reactedByMe ? (
                          <FavoriteRoundedIcon fontSize="small" />
                        ) : (
                          <FavoriteBorderRoundedIcon fontSize="small" />
                        )
                      }
                      onClick={() => dispatch(toggleReaction(post.id))}
                      data-testid={`react-post-${post.id}`}
                    >
                      {post.reactionCount || 0}
                    </Button>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <ChatBubbleOutlineRoundedIcon fontSize="small" />
                      <Typography variant="caption" fontWeight={600}>
                        {post.commentCount || 0} bình luận
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1 }} />
                    <Tooltip title={post.bookmarkedByMe ? "Bỏ lưu" : "Lưu bài viết"}>
                      <IconButton
                        size="small"
                        color={post.bookmarkedByMe ? "primary" : "default"}
                        onClick={() => dispatch(toggleBookmark(post.id))}
                        data-testid={`bookmark-post-${post.id}`}
                      >
                        {post.bookmarkedByMe ? (
                          <BookmarkRoundedIcon fontSize="small" />
                        ) : (
                          <BookmarkBorderRoundedIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                    {!isOwner && (
                      <Tooltip title="Báo cáo vi phạm">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setReportPostId(post.id);
                            setReportReason("");
                            setReportError("");
                          }}
                          data-testid={`report-post-${post.id}`}
                        >
                          <FlagOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
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
            disabled={submitting}
            data-testid="submit-post-btn"
          >
            {submitting ? "Đang lưu..." : editingPostId ? "Cập nhật" : "Đăng bài"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Chi tiết & Thảo luận */}
      <Dialog
        open={detailModalOpen}
        onClose={handleCloseDetail}
        maxWidth="md"
        fullWidth
        scroll="paper"
      >
        {activePost && (
          <>
            <DialogTitle
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                pb: 1,
              }}
            >
              <Typography variant="h6" fontWeight={700}>
                {selectedPost?.title || activePost.title}
              </Typography>
              <IconButton onClick={handleCloseDetail} size="small">
                <CloseRoundedIcon />
              </IconButton>
            </DialogTitle>

            <DialogContent dividers>
              {/* Chi tiết bài viết */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      bgcolor: "primary.main",
                      fontSize: "0.9rem",
                    }}
                  >
                    {(selectedPost || activePost).author?.name
                      ? (selectedPost || activePost).author.name
                          .charAt(0)
                          .toUpperCase()
                      : "U"}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700}>
                      {(selectedPost || activePost).author?.name || "Người dùng"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(
                        (selectedPost || activePost).createdAt
                      ).toLocaleDateString("vi-VN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Typography>
                  </Box>
                </Box>

                <Typography
                  variant="body1"
                  sx={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}
                >
                  {(selectedPost || activePost).content}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Phần Bình luận */}
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                Bình luận ({comments.length})
              </Typography>

              {/* Form gửi bình luận */}
              <Box sx={{ display: "flex", gap: 1, mb: 3 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Viết câu trả lời hoặc thảo luận..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  disabled={commentSubmitting}
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
                  disabled={!commentText.trim() || commentSubmitting}
                  data-testid="send-comment-btn"
                >
                  Gửi
                </Button>
              </Box>

              {commentsError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {commentsError}
                </Alert>
              )}

              {/* Danh sách bình luận */}
              {commentsStatus === "loading" ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : comments.length === 0 ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  align="center"
                  sx={{ py: 3 }}
                  data-testid="empty-comments"
                >
                  Chưa có bình luận nào. Hãy là người đầu tiên thảo luận!
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {comments.map((c) => {
                    const isCommentOwner =
                      currentUser && c.author?.id === currentUser.id;
                    return (
                      <Paper
                        key={c.id}
                        elevation={0}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: "action.hover",
                        }}
                        data-testid={`comment-item-${c.id}`}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Avatar
                              sx={{
                                width: 24,
                                height: 24,
                                bgcolor: "secondary.main",
                                fontSize: "0.75rem",
                              }}
                            >
                              {c.author?.name
                                ? c.author.name.charAt(0).toUpperCase()
                                : "U"}
                            </Avatar>
                            <Typography variant="caption" fontWeight={700}>
                              {c.author?.name || "Người dùng"}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(c.createdAt).toLocaleDateString("vi-VN", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </Typography>
                          </Box>

                          {isCommentOwner && (
                            <Box>
                              <IconButton
                                size="small"
                                onClick={() => handleStartEditComment(c)}
                                data-testid={`edit-comment-${c.id}`}
                              >
                                <EditRoundedIcon fontSize="inherit" />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteComment(c.id)}
                                data-testid={`delete-comment-${c.id}`}
                              >
                                <DeleteOutlineRoundedIcon fontSize="inherit" />
                              </IconButton>
                            </Box>
                          )}
                        </Box>

                        {editingCommentId === c.id ? (
                          <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
                            <TextField
                              fullWidth
                              size="small"
                              value={editCommentText}
                              onChange={(e) => setEditCommentText(e.target.value)}
                              disabled={commentSubmitting}
                              data-testid={`edit-comment-input-${c.id}`}
                            />
                            <Box sx={{ display: "flex", gap: 0.5 }}>
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

      {/* Dialog báo cáo bài viết */}
      <Dialog
        open={reportPostId !== null}
        onClose={() => !reportSubmitting && setReportPostId(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle fontWeight={700}>Báo cáo bài viết</DialogTitle>
        <DialogContent sx={{ pt: "8px !important" }}>
          {reportError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {reportError}
            </Alert>
          )}
          <TextField
            label="Lý do báo cáo"
            placeholder="VD: Spam, ngôn từ không phù hợp…"
            fullWidth
            multiline
            rows={3}
            required
            value={reportReason}
            onChange={(e) => {
              setReportReason(e.target.value);
              if (e.target.value.trim()) setReportError("");
            }}
            inputProps={{ maxLength: 500 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportPostId(null)} disabled={reportSubmitting}>
            Hủy
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={reportSubmitting || !reportReason.trim()}
            onClick={async () => {
              setReportSubmitting(true);
              setReportError("");
              const res = await dispatch(
                submitPostReport({ postId: reportPostId, reason: reportReason.trim() })
              );
              setReportSubmitting(false);
              if (submitPostReport.fulfilled.match(res)) {
                setReportPostId(null);
                setReportNotice("Đã gửi báo cáo tới quản trị viên.");
              } else {
                setReportError(res.payload || "Không gửi được báo cáo");
              }
            }}
          >
            {reportSubmitting ? "Đang gửi…" : "Gửi báo cáo"}
          </Button>
        </DialogActions>
      </Dialog>

      {reportNotice && (
        <Alert
          severity="success"
          onClose={() => setReportNotice("")}
          sx={{ position: "fixed", bottom: 24, right: 24, zIndex: 1400 }}
        >
          {reportNotice}
        </Alert>
      )}
    </Box>
  );
}
