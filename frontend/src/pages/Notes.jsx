import React, { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  IconButton,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  InputAdornment,
  Tooltip,
  List,
  ListItemButton,
  ListItemText,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import {
  loadNotes,
  addNote,
  removeNote,
  loadFolders,
  addFolder,
  editFolder,
  removeFolder,
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

const FOLDER_ICONS = ["📁", "📚", "💻", "🧪", "📐", "📝", "🎯", "🧠", "📌", "🎨"];

export default function Notes() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // --- Server state (notes & folders từ API) ---
  const {
    items: notes,
    folders,
    listStatus,
    listError,
    mutationStatus,
    mutationError,
  } = useSelector((s) => s.notes);

  // --- Local UI state ---
  // "ALL" | "UNFILED" | number (folderId)
  const [activeFolderId, setActiveFolderId] = useState("ALL");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    content: "",
    folderId: "",
    color: NOTE_COLORS[0],
  });
  const [titleError, setTitleError] = useState("");

  // Dialog tạo/sửa thư mục
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [folderDraft, setFolderDraft] = useState({
    name: "",
    icon: FOLDER_ICONS[0],
    noteContent: "",
  });
  const [folderError, setFolderError] = useState("");

  // Debounce search 300ms — tìm kiếm phía client, không thêm endpoint
  const searchTimer = useRef(null);
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  // Load notes và folders khi mount
  useEffect(() => {
    dispatch(loadNotes());
    dispatch(loadFolders());
  }, [dispatch]);

  // Xóa lỗi mutation khi đóng dialog
  useEffect(() => {
    if (!noteOpen) {
      dispatch(clearMutationError());
      setTitleError("");
    }
  }, [noteOpen, dispatch]);

  const folderMap = Object.fromEntries(folders.map((f) => [f.id, f]));

  // Filter phía client: thư mục + search debounce
  const filtered = notes
    .filter((n) => {
      if (activeFolderId === "UNFILED") return n.folderId == null;
      if (activeFolderId !== "ALL") return n.folderId === activeFolderId;
      return true;
    })
    .filter(
      (n) =>
        debouncedSearch === "" ||
        n.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (n.content || "").toLowerCase().includes(debouncedSearch.toLowerCase()),
    )
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  // Mở dialog tạo ghi chú mới (mặc định chọn thư mục đang xem, hoặc ngoài thư mục)
  const handleOpenNewNote = () => {
    const defaultFolder =
      typeof activeFolderId === "number" ? String(activeFolderId) : "";
    setDraft({ title: "", content: "", folderId: defaultFolder, color: NOTE_COLORS[0] });
    setNoteOpen(true);
  };

  // Tạo note mới qua API
  const handleAddNote = async () => {
    if (!draft.title.trim()) {
      setTitleError("Tiêu đề không được để trống");
      return;
    }
    setTitleError("");
    const result = await dispatch(
      addNote({
        title: draft.title.trim(),
        content: draft.content || null,
        folderId: draft.folderId ? Number(draft.folderId) : null,
      }),
    );
    if (addNote.fulfilled.match(result)) {
      setDraft({ title: "", content: "", folderId: "", color: NOTE_COLORS[0] });
      setNoteOpen(false);
    }
    // Nếu rejected: mutationError được set trong slice, hiện trong dialog
  };

  const handleOpenCreateFolder = () => {
    setEditingFolder(null);
    setFolderDraft({ name: "", icon: FOLDER_ICONS[0], noteContent: "" });
    setFolderError("");
    setFolderDialogOpen(true);
  };

  const handleOpenEditFolder = (folder, e) => {
    e.stopPropagation();
    setEditingFolder(folder);
    setFolderDraft({
      name: folder.name,
      icon: folder.icon || FOLDER_ICONS[0],
      noteContent: folder.noteContent || "",
    });
    setFolderError("");
    setFolderDialogOpen(true);
  };

  const handleSaveFolder = async () => {
    if (!folderDraft.name.trim()) {
      setFolderError("Tên thư mục không được để trống");
      return;
    }
    setFolderError("");
    const payload = {
      name: folderDraft.name.trim(),
      icon: folderDraft.icon,
      noteContent: folderDraft.noteContent.trim(),
    };
    const result = editingFolder
      ? await dispatch(editFolder({ id: editingFolder.id, data: payload }))
      : await dispatch(addFolder(payload));
    if (
      (editingFolder && editFolder.fulfilled.match(result)) ||
      (!editingFolder && addFolder.fulfilled.match(result))
    ) {
      setFolderDialogOpen(false);
      if (!editingFolder && result.payload?.id) {
        setActiveFolderId(result.payload.id);
      }
    } else {
      setFolderError(result.payload || "Không lưu được thư mục");
    }
  };

  const handleDeleteFolder = async (folderId, e) => {
    e.stopPropagation();
    const result = await dispatch(removeFolder(folderId));
    if (removeFolder.fulfilled.match(result) && activeFolderId === folderId) {
      setActiveFolderId("ALL");
    }
  };

  // Xóa note qua API
  const handleDeleteNote = (id) => {
    dispatch(removeNote(id));
  };

  // Xem chi tiết note
  const handleOpenNote = (id) => {
    navigate(`/notes/${id}`);
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
            Ghi chú
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
        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={handleOpenNewNote}
        >
          Ghi chú mới
        </Button>
      </Box>

      {/* ==================== Danh sách Ghi chú & Thư mục ==================== */}
      <Grid container spacing={2}>
        {/* Sidebar folder */}
        <Grid item xs={12} md={2.5}>
          <Card sx={{ position: "sticky", top: 80 }}>
            <CardContent sx={{ p: 1.5 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  px: 1,
                  mb: 0.5,
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                >
                  THƯ MỤC
                </Typography>
                <Tooltip title="Tạo thư mục">
                  <IconButton
                    size="small"
                    aria-label="Tạo thư mục"
                    onClick={handleOpenCreateFolder}
                  >
                    <AddRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <List disablePadding dense>
                <ListItemButton
                  selected={activeFolderId === "ALL"}
                  onClick={() => setActiveFolderId("ALL")}
                  sx={{ borderRadius: 1 }}
                >
                  <Box component="span" sx={{ mr: 1, fontSize: 16 }}>📋</Box>
                  <ListItemText
                    primary={`Tất cả (${notes.length})`}
                    primaryTypographyProps={{
                      variant: "body2",
                      fontWeight: activeFolderId === "ALL" ? 600 : 400,
                    }}
                  />
                </ListItemButton>
                <ListItemButton
                  selected={activeFolderId === "UNFILED"}
                  onClick={() => setActiveFolderId("UNFILED")}
                  sx={{ borderRadius: 1 }}
                >
                  <Box component="span" sx={{ mr: 1, fontSize: 16 }}>📄</Box>
                  <ListItemText
                    primary={`Ngoài thư mục (${notes.filter((n) => n.folderId == null).length})`}
                    primaryTypographyProps={{
                      variant: "body2",
                      fontWeight: activeFolderId === "UNFILED" ? 600 : 400,
                    }}
                  />
                </ListItemButton>
                {folders.map((f) => {
                  const count = notes.filter((n) => n.folderId === f.id).length;
                  return (
                    <ListItemButton
                      key={f.id}
                      selected={activeFolderId === f.id}
                      onClick={() => setActiveFolderId(f.id)}
                      sx={{
                        borderRadius: 1,
                        "& .folder-actions": { opacity: 0 },
                        "&:hover .folder-actions": { opacity: 1 },
                      }}
                    >
                      <Box component="span" sx={{ mr: 1, fontSize: 16 }}>
                        {f.icon || "📁"}
                      </Box>
                      <ListItemText
                        primary={`${f.name} (${count})`}
                        primaryTypographyProps={{
                          variant: "body2",
                          noWrap: true,
                          fontWeight: activeFolderId === f.id ? 600 : 400,
                        }}
                      />
                      <Box className="folder-actions" sx={{ display: "flex", ml: 0.5 }}>
                        <IconButton
                          size="small"
                          aria-label={`Sửa thư mục ${f.name}`}
                          onClick={(e) => handleOpenEditFolder(f, e)}
                        >
                          <EditRoundedIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          aria-label={`Xoá thư mục ${f.name}`}
                          onClick={(e) => handleDeleteFolder(f.id, e)}
                        >
                          <DeleteOutlineRoundedIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Box>
                    </ListItemButton>
                  );
                })}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Danh sách notes */}
        <Grid item xs={12} md={9.5}>
          {/* Ghi chú của thư mục đang chọn */}
          {typeof activeFolderId === "number" && folderMap[activeFolderId] && (
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {folderMap[activeFolderId].icon || "📁"} {folderMap[activeFolderId].name}
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<EditRoundedIcon fontSize="small" />}
                    onClick={(e) => handleOpenEditFolder(folderMap[activeFolderId], e)}
                  >
                    Sửa thư mục
                  </Button>
                </Box>
                {folderMap[activeFolderId].noteContent && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}>
                    {folderMap[activeFolderId].noteContent}
                  </Typography>
                )}
              </CardContent>
            </Card>
          )}

          {/* Search */}
          <Box
            sx={{
              display: "flex",
              gap: 1.5,
              mb: 2,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
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
                  : 'Chưa có ghi chú nào. Nhấn "Ghi chú mới" để bắt đầu.'}
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
                          theme.palette.mode === "dark" ? color + "18" : color,
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
                      <Box sx={{ px: 2, pb: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                        <Typography variant="caption" color="text.disabled">
                          {dateStr}
                        </Typography>
                        {note.folderId != null && folderMap[note.folderId] && (
                          <Chip
                            size="small"
                            label={`${folderMap[note.folderId].icon || "📁"} ${folderMap[note.folderId].name}`}
                            sx={{ height: 20, fontSize: 11 }}
                          />
                        )}
                      </Box>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Grid>
      </Grid>

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
          <FormControl fullWidth size="small">
            <InputLabel>Thư mục</InputLabel>
            <Select
              label="Thư mục"
              value={draft.folderId}
              onChange={(e) =>
                setDraft((d) => ({ ...d, folderId: e.target.value }))
              }
            >
              <MenuItem value="">📄 Ngoài thư mục (không thuộc thư mục nào)</MenuItem>
              {folders.map((f) => (
                <MenuItem key={f.id} value={String(f.id)}>
                  {f.icon || "📁"} {f.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
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
                    borderColor: draft.color === c ? "primary.main" : "divider",
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

      {/* ==================== Dialog: Tạo / Sửa thư mục ==================== */}
      <Dialog
        open={folderDialogOpen}
        onClose={() => setFolderDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle fontWeight={700}>
          {editingFolder ? "Sửa thư mục" : "Tạo thư mục mới"}
        </DialogTitle>
        <DialogContent
          sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}
        >
          {folderError && <Alert severity="error">{folderError}</Alert>}
          <TextField
            label="Tên thư mục"
            fullWidth
            required
            autoFocus
            value={folderDraft.name}
            onChange={(e) => {
              setFolderDraft((d) => ({ ...d, name: e.target.value }));
              if (e.target.value.trim()) setFolderError("");
            }}
            inputProps={{ maxLength: 100 }}
          />
          <TextField
            label="Ghi chú thư mục (tuỳ chọn)"
            fullWidth
            multiline
            rows={3}
            value={folderDraft.noteContent}
            onChange={(e) =>
              setFolderDraft((d) => ({ ...d, noteContent: e.target.value }))
            }
            inputProps={{ maxLength: 500 }}
            helperText={`${folderDraft.noteContent.length}/500`}
          />
          <Box>
            <Typography variant="caption" color="text.secondary" mb={0.75} display="block">
              Chọn icon cho thư mục
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {FOLDER_ICONS.map((ic) => (
                <Button
                  key={ic}
                  variant={folderDraft.icon === ic ? "contained" : "outlined"}
                  size="small"
                  onClick={() => setFolderDraft((d) => ({ ...d, icon: ic }))}
                  sx={{ minWidth: 40, fontSize: 18, px: 1 }}
                >
                  {ic}
                </Button>
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFolderDialogOpen(false)}>Huỷ</Button>
          <Button
            variant="contained"
            onClick={handleSaveFolder}
            disabled={!folderDraft.name.trim()}
          >
            Lưu
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
