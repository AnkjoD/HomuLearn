import React, { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  IconButton,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tooltip,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  LinearProgress,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import PlayCircleOutlineRoundedIcon from "@mui/icons-material/PlayCircleOutlineRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import FiberManualRecordRoundedIcon from "@mui/icons-material/FiberManualRecordRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { addSession, setActiveSubject } from "../store/librarySlice";
import {
  loadNotes,
  addNote,
  removeNote,
  clearMutationError,
} from "../store/notesSlice";

// Màu nền card — chỉ dùng cho display, không lưu DB (backend không có trường color)
// ponytail: color là local state; nếu cần lưu server thì thêm trường vào Note entity
const NOTE_COLORS = [
  "#EFF6FF",
  "#F0FDF4",
  "#FFFBEB",
  "#FFF1F2",
  "#F5F3FF",
  "#F0F9FF",
];

// Folder chỉ là local UI filter — backend không có folder trong MVP
// ponytail: khi thêm folder vào DB, chuyển sang Redux + API
const INIT_FOLDERS = [
  { id: "f0", name: "Tất cả" },
];

const STATUS_COLOR = {
  ready: "success",
  processing: "warning",
  pending: "default",
};
const STATUS_LABEL = {
  ready: "Sẵn sàng",
  processing: "Đang xử lý",
  pending: "Chờ xử lý",
};
const PROCESSING_STEPS = [
  "Trích xuất transcript…",
  "Phân tích nội dung…",
  "Tạo ghi chú có cấu trúc…",
  "Hoàn tất ✓",
];

export default function Notes() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { subjects, activeSubjectId } = useSelector((s) => s.library);

  // --- Server state (notes từ API) ---
  const { items: notes, listStatus, listError, mutationStatus, mutationError } =
    useSelector((s) => s.notes);

  // --- Local UI state ---
  const [mainTab, setMainTab] = useState(0);
  const [folders] = useState(INIT_FOLDERS);
  const [activeFolderId, setActiveFolderId] = useState("f0");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    content: "",
    color: NOTE_COLORS[0],
  });
  const [titleError, setTitleError] = useState("");

  // Tab Tài liệu — giữ nguyên local state
  const [addOpen, setAddOpen] = useState(false);
  const [inputType, setInputType] = useState("youtube");
  const [inputVal, setInputVal] = useState("");
  const [targetSubject, setTargetSubject] = useState("");
  const [processingStep, setProcessingStep] = useState(-1);

  // Debounce search 300ms — tìm kiếm phía client, không thêm endpoint
  const searchTimer = useRef(null);
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  // Load notes khi mount tab Ghi chú
  useEffect(() => {
    if (mainTab === 0) {
      dispatch(loadNotes());
    }
  }, [dispatch, mainTab]);

  // Xóa lỗi mutation khi đóng dialog
  useEffect(() => {
    if (!noteOpen) {
      dispatch(clearMutationError());
      setTitleError("");
    }
  }, [noteOpen, dispatch]);

  // Filter phía client: search debounce, folder (local)
  const filtered = notes
    .filter((n) =>
      debouncedSearch === "" ||
      n.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (n.content || "").toLowerCase().includes(debouncedSearch.toLowerCase())
    )
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  // Tạo note mới qua API
  const handleAddNote = async () => {
    if (!draft.title.trim()) {
      setTitleError("Tiêu đề không được để trống");
      return;
    }
    setTitleError("");
    const result = await dispatch(
      addNote({ title: draft.title.trim(), content: draft.content || null })
    );
    if (addNote.fulfilled.match(result)) {
      setDraft({ title: "", content: "", color: NOTE_COLORS[0] });
      setNoteOpen(false);
    }
    // Nếu rejected: mutationError được set trong slice, hiện trong dialog
  };

  // Xóa note qua API
  const handleDeleteNote = (id) => {
    dispatch(removeNote(id));
  };

  // Xem chi tiết note
  const handleOpenNote = (id) => {
    navigate(`/notes/${id}`);
  };

  // --- Tab Tài liệu: giữ nguyên logic cũ ---
  const activeLib = subjects.find((s) => s.id === activeSubjectId);
  const handleSubmit = () => {
    if (!inputVal || !targetSubject) return;
    dispatch(
      addSession({
        subjectId: targetSubject,
        session: {
          id: `s${Date.now()}`,
          title: inputVal,
          status: "processing",
          createdAt: new Date().toISOString().slice(0, 10),
        },
      })
    );
    setProcessingStep(0);
    PROCESSING_STEPS.forEach((_, i) =>
      setTimeout(() => setProcessingStep(i), (i + 1) * 900)
    );
    setTimeout(
      () => {
        setProcessingStep(-1);
        setAddOpen(false);
        setInputVal("");
        setTargetSubject("");
      },
      PROCESSING_STEPS.length * 900 + 400
    );
  };

  const isSaving = mutationStatus === "saving";

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1.5,
          mb: 3,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Typography variant="h4" fontWeight={700}>
            Học tập &amp; Ghi chú
          </Typography>
          {/* Saving indicator */}
          {isSaving && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <CircularProgress size={14} />
              <Typography variant="caption" color="text.secondary">
                Đang lưu…
              </Typography>
            </Box>
          )}
        </Box>
        {mainTab === 0 && (
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => setNoteOpen(true)}
          >
            Ghi chú mới
          </Button>
        )}
        {mainTab === 1 && (
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => setAddOpen(true)}
          >
            Thêm tài liệu
          </Button>
        )}
      </Box>

      <Tabs value={mainTab} onChange={(_, v) => setMainTab(v)} sx={{ mb: 3 }}>
        <Tab label="📝 Ghi chú" />
        <Tab label="🎬 Tài liệu học" />
      </Tabs>

      {/* ==================== Tab Ghi chú ==================== */}
      {mainTab === 0 && (
        <Grid container spacing={2}>
          {/* Sidebar folder — local UI */}
          <Grid item xs={12} md={2.5}>
            <Card sx={{ position: "sticky", top: 80 }}>
              <CardContent sx={{ p: 1.5 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                  sx={{ px: 1, display: "block", mb: 0.5 }}
                >
                  MỤC
                </Typography>
                <List disablePadding dense>
                  {folders.map((f) => (
                    <ListItemButton
                      key={f.id}
                      selected={activeFolderId === f.id}
                      onClick={() => setActiveFolderId(f.id)}
                      sx={{ borderRadius: 1 }}
                    >
                      <FolderRoundedIcon
                        sx={{
                          fontSize: 16,
                          mr: 1,
                          color: "primary.main",
                          opacity: f.id === "f0" ? 0 : 1,
                        }}
                      />
                      <ListItemText
                        primary={f.name}
                        primaryTypographyProps={{
                          variant: "body2",
                          fontWeight: activeFolderId === f.id ? 600 : 400,
                        }}
                      />
                    </ListItemButton>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Danh sách notes */}
          <Grid item xs={12} md={9.5}>
            {/* Search */}
            <Box sx={{ display: "flex", gap: 1.5, mb: 2, flexWrap: "wrap", alignItems: "center" }}>
              <TextField
                size="small"
                placeholder="Tìm ghi chú…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ width: 220 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            {/* Loading */}
            {listStatus === "loading" && (
              <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                <CircularProgress />
              </Box>
            )}

            {/* Error */}
            {listStatus === "failed" && (
              <Alert
                severity="error"
                action={
                  <Button size="small" onClick={() => dispatch(loadNotes())}>
                    Thử lại
                  </Button>
                }
                sx={{ mb: 2 }}
              >
                {listError || "Không tải được ghi chú"}
              </Alert>
            )}

            {/* Empty */}
            {listStatus === "succeeded" && filtered.length === 0 && (
              <Box sx={{ textAlign: "center", py: 8 }}>
                <Typography color="text.secondary">
                  {debouncedSearch
                    ? `Không tìm thấy ghi chú cho "${debouncedSearch}"`
                    : "Chưa có ghi chú nào. Nhấn \"Ghi chú mới\" để bắt đầu."}
                </Typography>
              </Box>
            )}

            {/* Note cards */}
            {listStatus === "succeeded" && filtered.length > 0 && (
              <Grid container spacing={2}>
                {filtered.map((note, idx) => {
                  // Màu nền: xoay vòng theo index vì backend không lưu color
                  const color = NOTE_COLORS[idx % NOTE_COLORS.length];
                  const dateStr = note.updatedAt
                    ? new Date(note.updatedAt).toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                      })
                    : "";
                  return (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={note.id}>
                      <Card
                        data-testid="note-card"
                        sx={{
                          bgcolor: (theme) =>
                            theme.palette.mode === "dark"
                              ? color + "18"
                              : color,
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          position: "relative",
                          cursor: "pointer",
                        }}
                        onClick={() => handleOpenNote(note.id)}
                      >
                        {/* Delete button */}
                        <Box
                          sx={{ position: "absolute", top: 8, right: 8 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Tooltip title="Xoá">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteNote(note.id)}
                              disabled={isSaving}
                            >
                              <DeleteOutlineRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>

                        <CardContent sx={{ flex: 1, pt: 1.5 }}>
                          <Typography
                            variant="subtitle1"
                            fontWeight={700}
                            mb={1}
                            pr={4}
                          >
                            {note.title}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              whiteSpace: "pre-wrap",
                              fontSize: 13,
                              lineHeight: 1.6,
                              display: "-webkit-box",
                              WebkitLineClamp: 6,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {note.content}
                          </Typography>
                        </CardContent>
                        <Box sx={{ px: 2, pb: 1.5 }}>
                          <Typography variant="caption" color="text.disabled">
                            {dateStr}
                          </Typography>
                        </Box>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </Grid>
        </Grid>
      )}

      {/* ==================== Tab Tài liệu học ==================== */}
      {mainTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Typography
              variant="overline"
              color="text.secondary"
              mb={1}
              display="block"
            >
              Môn học
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {subjects.map((s) => {
                const done = s.sessions.filter(
                  (ss) => ss.status === "ready"
                ).length;
                return (
                  <Card
                    key={s.id}
                    sx={{
                      border:
                        activeSubjectId === s.id ? "2px solid" : "1px solid",
                      borderColor:
                        activeSubjectId === s.id ? "primary.main" : "divider",
                    }}
                  >
                    <CardActionArea
                      onClick={() => dispatch(setActiveSubject(s.id))}
                      sx={{ p: 1.5 }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                      >
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: 1.5,
                            bgcolor: s.color + "22",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 16,
                          }}
                        >
                          {s.icon}
                        </Box>
                        <Box>
                          <Typography variant="body1" fontWeight={600}>
                            {s.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {done}/{s.sessions.length} session
                          </Typography>
                        </Box>
                      </Box>
                    </CardActionArea>
                  </Card>
                );
              })}
            </Box>
          </Grid>
          <Grid item xs={12} md={8}>
            {activeLib ? (
              <Box>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  mb={1}
                  display="block"
                >
                  Sessions — {activeLib.name}
                </Typography>
                <Card>
                  <List disablePadding>
                    {activeLib.sessions.map((sess, i) => (
                      <React.Fragment key={sess.id}>
                        <ListItem
                          secondaryAction={
                            <Box sx={{ display: "flex", gap: 1 }}>
                              <Chip
                                label={STATUS_LABEL[sess.status]}
                                color={STATUS_COLOR[sess.status]}
                                size="small"
                              />
                              {sess.status === "ready" && (
                                <Button
                                  size="small"
                                  onClick={() =>
                                    navigate(`/notes/${sess.id}`)
                                  }
                                >
                                  Xem ghi chú
                                </Button>
                              )}
                            </Box>
                          }
                        >
                          <PlayCircleOutlineRoundedIcon
                            sx={{ mr: 2, color: "action.active" }}
                          />
                          <ListItemText
                            primary={sess.title}
                            secondary={sess.createdAt}
                            primaryTypographyProps={{ fontWeight: 500 }}
                          />
                        </ListItem>
                        {i < activeLib.sessions.length - 1 && (
                          <Divider variant="inset" component="li" />
                        )}
                      </React.Fragment>
                    ))}
                  </List>
                </Card>
              </Box>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 200,
                }}
              >
                <Typography color="text.secondary">
                  Chọn môn học bên trái để xem sessions
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>
      )}

      {/* ==================== Dialog: Tạo ghi chú mới ==================== */}
      <Dialog
        open={noteOpen}
        onClose={() => !isSaving && setNoteOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle fontWeight={700}>Ghi chú mới</DialogTitle>
        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            pt: "8px !important",
          }}
        >
          {/* Lỗi từ server (ví dụ validation 400) */}
          {mutationError && (
            <Alert severity="error">
              {mutationError.fieldErrors?.title || mutationError.message}
            </Alert>
          )}
          <TextField
            label="Tiêu đề"
            fullWidth
            required
            value={draft.title}
            onChange={(e) => {
              setDraft((d) => ({ ...d, title: e.target.value }));
              if (e.target.value.trim()) setTitleError("");
            }}
            error={!!titleError}
            helperText={titleError}
            inputProps={{ maxLength: 255 }}
          />
          <TextField
            label="Nội dung"
            fullWidth
            multiline
            rows={6}
            value={draft.content}
            onChange={(e) =>
              setDraft((d) => ({ ...d, content: e.target.value }))
            }
          />
          {/* Chọn màu nền — chỉ local, không lưu DB */}
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              mb={0.5}
              display="block"
            >
              Màu nền (chỉ hiển thị, không lưu server)
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              {NOTE_COLORS.map((c) => (
                <Box
                  key={c}
                  onClick={() => setDraft((d) => ({ ...d, color: c }))}
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    bgcolor: c,
                    border: "2px solid",
                    borderColor:
                      draft.color === c ? "primary.main" : "divider",
                    cursor: "pointer",
                  }}
                />
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoteOpen(false)} disabled={isSaving}>
            Huỷ
          </Button>
          <Button
            variant="contained"
            onClick={handleAddNote}
            disabled={isSaving || !draft.title.trim()}
            startIcon={
              isSaving ? <CircularProgress size={14} /> : <SaveRoundedIcon />
            }
          >
            {isSaving ? "Đang lưu…" : "Lưu"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ==================== Dialog: Thêm tài liệu (Tab 1) ==================== */}
      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle fontWeight={700}>Thêm nội dung mới</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
            <InputLabel>Loại nội dung</InputLabel>
            <Select
              value={inputType}
              onChange={(e) => setInputType(e.target.value)}
              label="Loại nội dung"
            >
              <MenuItem value="youtube">
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  <LinkRoundedIcon fontSize="small" /> Link YouTube
                </Box>
              </MenuItem>
              <MenuItem value="pdf">
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  <UploadFileRoundedIcon fontSize="small" /> Upload PDF/Slide
                </Box>
              </MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label={inputType === "youtube" ? "Dán link YouTube" : "Tên tài liệu"}
            placeholder={
              inputType === "youtube"
                ? "https://youtube.com/watch?v=..."
                : "Chương 3 - Tích phân..."
            }
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth>
            <InputLabel>Môn học</InputLabel>
            <Select
              value={targetSubject}
              onChange={(e) => setTargetSubject(e.target.value)}
              label="Môn học"
            >
              {subjects.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {processingStep >= 0 && (
            <Box mt={2}>
              {PROCESSING_STEPS.map((step, i) => (
                <Box
                  key={step}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mb: 1,
                    opacity: i > processingStep ? 0.4 : 1,
                  }}
                >
                  <FiberManualRecordRoundedIcon
                    sx={{
                      fontSize: 10,
                      color:
                        i < processingStep
                          ? "success.main"
                          : i === processingStep
                          ? "warning.main"
                          : "text.disabled",
                    }}
                  />
                  <Typography variant="body2">{step}</Typography>
                  {i === processingStep && (
                    <LinearProgress sx={{ flex: 1, ml: 1 }} />
                  )}
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Huỷ</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!inputVal || !targetSubject || processingStep >= 0}
          >
            {processingStep >= 0 ? "Đang xử lý…" : "Xử lý"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
