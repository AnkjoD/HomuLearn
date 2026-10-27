/**
 * NoteDetail.jsx
 *
 * Hiển thị chi tiết một ghi chú từ API theo :id trong URL.
 * Giữ nguyên layout 2 cột (nội dung + AI chat) từ thiết kế cũ.
 * AI chat vẫn là mock local (ngoài MVP) — không thay đổi.
 *
 * Luồng dữ liệu:
 *   useParams → loadNote(id) → notesSlice.current → render
 *   editNote(id, data) → cập nhật current + items trong slice
 *
 * Edge cases:
 *   - 404: hiện Alert + nút Quay lại
 *   - 401: ProtectedRoute đã chặn trước, không cần xử lý thêm
 *   - Loading: CircularProgress toàn trang
 */
import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  Box,
  Typography,
  Paper,
  TextField,
  IconButton,
  Chip,
  Divider,
  List,
  ListItem,
  Avatar,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import SmartToyRoundedIcon from "@mui/icons-material/SmartToyRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { loadNote, editNote, clearCurrent, clearMutationError } from "../store/notesSlice";

// ---------------------------------------------------------------------------
// AI Chat — mock local, ngoài MVP
// ponytail: khi có AI endpoint thật, thay getAIResponse bằng fetch
// ---------------------------------------------------------------------------
const AI_RESPONSES = {
  default:
    "Câu hỏi hay! Hãy đặt câu hỏi cụ thể hơn về nội dung ghi chú để tôi trả lời chính xác nhé.",
};

function getAIResponse(msg) {
  return AI_RESPONSES["default"];
}

function ChatMessage({ msg }) {
  const isUser = msg.role === "user";
  return (
    <Box
      sx={{
        display: "flex",
        gap: 1,
        alignItems: "flex-start",
        flexDirection: isUser ? "row-reverse" : "row",
        mb: 2,
      }}
    >
      <Avatar
        sx={{
          width: 28,
          height: 28,
          bgcolor: isUser ? "primary.main" : "secondary.main",
          fontSize: 14,
          flexShrink: 0,
        }}
      >
        {isUser ? (
          <PersonRoundedIcon sx={{ fontSize: 16 }} />
        ) : (
          <SmartToyRoundedIcon sx={{ fontSize: 16 }} />
        )}
      </Avatar>
      <Paper
        variant="outlined"
        sx={{
          p: 1.5,
          maxWidth: "80%",
          bgcolor: isUser ? "primary.main" : "background.subtle",
          color: isUser ? "primary.contrastText" : "text.primary",
          border: "none",
          borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
        }}
      >
        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
          {msg.content}
        </Typography>
      </Paper>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// NoteDetail
// ---------------------------------------------------------------------------
export default function NoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { current: note, currentStatus, currentError, mutationStatus, mutationError } =
    useSelector((s) => s.notes);

  // AI chat — local state
  const [messages, setMessages] = useState([
    {
      role: "ai",
      content: "Xin chào! Tôi là AI assistant. Hỏi tôi về nội dung ghi chú này nhé!",
    },
  ]);
  const [input, setInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const chatBottomRef = useRef(null);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState({ title: "", content: "" });
  const [editTitleError, setEditTitleError] = useState("");

  const isSaving = mutationStatus === "saving";

  // Load note khi mount hoặc id thay đổi
  useEffect(() => {
    dispatch(loadNote(id));
    return () => {
      dispatch(clearCurrent());
    };
  }, [dispatch, id]);

  // Scroll chat xuống cuối khi có tin mới
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Xóa lỗi mutation khi đóng dialog edit
  useEffect(() => {
    if (!editOpen) {
      dispatch(clearMutationError());
      setEditTitleError("");
    }
  }, [editOpen, dispatch]);

  // Mở dialog edit với dữ liệu hiện tại
  const openEdit = () => {
    if (!note) return;
    setEditDraft({ title: note.title, content: note.content || "" });
    setEditOpen(true);
  };

  // Lưu chỉnh sửa qua API
  const handleSaveEdit = async () => {
    if (!editDraft.title.trim()) {
      setEditTitleError("Tiêu đề không được để trống");
      return;
    }
    setEditTitleError("");
    const result = await dispatch(
      editNote({
        id,
        data: {
          title: editDraft.title.trim(),
          content: editDraft.content,
        },
      })
    );
    if (editNote.fulfilled.match(result)) {
      setEditOpen(false);
    }
  };

  // AI chat send
  const sendMessage = () => {
    if (!input.trim() || aiLoading) return;
    const userMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setAiLoading(true);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: getAIResponse(userMsg.content) },
      ]);
      setAiLoading(false);
    }, 1000);
  };

  // ---------------------------------------------------------------------------
  // Render states
  // ---------------------------------------------------------------------------

  if (currentStatus === "loading" || currentStatus === "idle") {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 12 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (currentStatus === "failed") {
    const is404 = currentError?.status === 404;
    return (
      <Box sx={{ py: 4 }}>
        <Alert severity={is404 ? "warning" : "error"} sx={{ mb: 2 }}>
          {is404
            ? "Ghi chú không tồn tại hoặc bạn không có quyền truy cập."
            : currentError?.message || "Không tải được ghi chú"}
        </Alert>
        <Button
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => navigate("/notes")}
        >
          Quay lại danh sách
        </Button>
      </Box>
    );
  }

  if (!note) return null;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", lg: "row" },
        height: { lg: "calc(100vh - 128px)" },
        gap: 2,
      }}
    >
      {/* ==================== Nội dung ghi chú ==================== */}
      <Box sx={{ flex: 1, overflowY: "auto", pr: 1 }}>
        {/* Back + Edit */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <Button
            size="small"
            startIcon={<ArrowBackRoundedIcon />}
            onClick={() => navigate("/notes")}
          >
            Danh sách
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button
            size="small"
            variant="outlined"
            startIcon={<EditRoundedIcon />}
            onClick={openEdit}
          >
            Chỉnh sửa
          </Button>
        </Box>

        {/* Metadata */}
        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          <Chip
            label={
              note.updatedAt
                ? `Cập nhật ${new Date(note.updatedAt).toLocaleDateString("vi-VN")}`
                : "—"
            }
            size="small"
            variant="outlined"
          />
        </Box>

        <Typography variant="h4" fontWeight={700} mb={3}>
          {note.title}
        </Typography>

        <Divider sx={{ mb: 3 }} />

        <Typography
          variant="body1"
          sx={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}
        >
          {note.content || (
            <Typography color="text.secondary" fontStyle="italic">
              Ghi chú này chưa có nội dung.
            </Typography>
          )}
        </Typography>
      </Box>

      {/* ==================== AI Chat (mock) ==================== */}
      <Paper
        variant="outlined"
        sx={{
          width: { xs: "100%", lg: 360 },
          minHeight: 420,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            p: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <SmartToyRoundedIcon color="secondary" />
          <Typography variant="h6" fontWeight={600}>
            AI Hỏi &amp; Đáp
          </Typography>
          <Chip
            label={note.title}
            size="small"
            sx={{ ml: "auto", maxWidth: 130 }}
          />
        </Box>

        <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
          {messages.map((msg, i) => (
            <ChatMessage key={i} msg={msg} />
          ))}
          {aiLoading && (
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <CircularProgress size={14} />
              <Typography variant="caption" color="text.secondary">
                AI đang suy nghĩ…
              </Typography>
            </Box>
          )}
          <div ref={chatBottomRef} />
        </Box>

        <Box
          sx={{
            p: 1.5,
            borderTop: "1px solid",
            borderColor: "divider",
            display: "flex",
            gap: 1,
          }}
        >
          <TextField
            fullWidth
            multiline
            maxRows={3}
            size="small"
            placeholder="Hỏi về ghi chú này… (Enter gửi)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <IconButton
            color="primary"
            onClick={sendMessage}
            disabled={!input.trim() || aiLoading}
          >
            <SendRoundedIcon />
          </IconButton>
        </Box>
      </Paper>

      {/* ==================== Dialog: Chỉnh sửa ghi chú ==================== */}
      <Dialog
        open={editOpen}
        onClose={() => !isSaving && setEditOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle fontWeight={700}>Chỉnh sửa ghi chú</DialogTitle>
        <DialogContent
          sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}
        >
          {mutationError && (
            <Alert severity="error">
              {mutationError.fieldErrors?.title || mutationError.message}
            </Alert>
          )}
          <TextField
            label="Tiêu đề"
            fullWidth
            required
            value={editDraft.title}
            onChange={(e) => {
              setEditDraft((d) => ({ ...d, title: e.target.value }));
              if (e.target.value.trim()) setEditTitleError("");
            }}
            error={!!editTitleError}
            helperText={editTitleError}
            inputProps={{ maxLength: 255 }}
          />
          <TextField
            label="Nội dung"
            fullWidth
            multiline
            rows={8}
            value={editDraft.content}
            onChange={(e) =>
              setEditDraft((d) => ({ ...d, content: e.target.value }))
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)} disabled={isSaving}>
            Huỷ
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveEdit}
            disabled={isSaving || !editDraft.title.trim()}
            startIcon={
              isSaving ? <CircularProgress size={14} /> : <SaveRoundedIcon />
            }
          >
            {isSaving ? "Đang lưu…" : "Lưu"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
