import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import PersonAddRoundedIcon from "@mui/icons-material/PersonAddRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import ExploreRoundedIcon from "@mui/icons-material/ExploreRounded";
import ExitToAppRoundedIcon from "@mui/icons-material/ExitToAppRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import {
  createGroup,
  deleteGroup,
  fetchGroupMembers,
  fetchGroupMessages,
  fetchGroups,
  joinGroup,
  leaveGroup,
  sendGroupMessage,
} from "../api/groups";

const AVATAR_COLORS = [
  "#0F4C81",
  "#FDB813",
  "#16A34A",
  "#0284C7",
  "#DC2626",
  "#7C3AED",
  "#EA580C",
];

function makeClientMsgId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function initials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export default function Groups() {
  const [tab, setTab] = useState(0);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [msgSearch, setMsgSearch] = useState("");
  const [debouncedMsgSearch, setDebouncedMsgSearch] = useState("");
  const [msgInput, setMsgInput] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [pendingClientMsgId, setPendingClientMsgId] = useState(null);
  const chatEndRef = useRef(null);
  const shouldScrollBottomRef = useRef(true);

  const [searchDiscover, setSearchDiscover] = useState("");

  // Create group dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState({
    name: "",
    subject: "",
    description: "",
    privacy: "PUBLIC",
    avatarColor: AVATAR_COLORS[0],
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Members dialog
  const [membersOpen, setMembersOpen] = useState(false);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const loadAllGroups = async () => {
    setLoading(true);
    setError("");
    try {
      const list = await fetchGroups();
      setGroups(list);
      setSelectedGroupId((prev) => {
        if (prev && list.some((g) => g.id === prev && g.joined)) return prev;
        const firstJoined = list.find((g) => g.joined);
        return firstJoined ? firstJoined.id : null;
      });
    } catch (err) {
      setError(err.message || "Không tải được danh sách nhóm học");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllGroups();
  }, []);

  const PAGE_SIZE = 30;

  const loadMessagesForGroup = async (groupId, query = "", silent = false) => {
    if (!groupId) {
      setMessages([]);
      setHasMoreOlder(false);
      return;
    }
    if (!silent) {
      setMessagesLoading(true);
      shouldScrollBottomRef.current = true;
    }
    try {
      const list = await fetchGroupMessages(groupId, { query, limit: PAGE_SIZE });
      if (silent && !query.trim()) {
        // Khi polling: giữ lại các tin cũ hơn đã tải thêm, chỉ nối các tin mới hơn
        setMessages((prev) => {
          const map = new Map(prev.map((m) => [m.id, m]));
          for (const m of list) map.set(m.id, m);
          return Array.from(map.values()).sort((a, b) => a.id - b.id);
        });
      } else {
        setMessages(list);
        setHasMoreOlder(!query.trim() && list.length === PAGE_SIZE);
      }
    } catch (err) {
      if (!silent) setActionError(err.message || "Không tải được tin nhắn");
    } finally {
      if (!silent) setMessagesLoading(false);
    }
  };

  const handleLoadOlder = async () => {
    if (!selectedGroupId || loadingOlder || !hasMoreOlder || messages.length === 0) return;
    setLoadingOlder(true);
    shouldScrollBottomRef.current = false;
    try {
      const oldestId = messages[0].id;
      const older = await fetchGroupMessages(selectedGroupId, {
        beforeId: oldestId,
        limit: PAGE_SIZE,
      });
      setMessages((prev) => [...older, ...prev]);
      setHasMoreOlder(older.length === PAGE_SIZE);
    } catch (err) {
      setActionError(err.message || "Không tải được tin nhắn cũ hơn");
    } finally {
      setLoadingOlder(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => setDebouncedMsgSearch(msgSearch), 300);
    return () => clearTimeout(t);
  }, [msgSearch]);

  useEffect(() => {
    setMsgSearch("");
    setDebouncedMsgSearch("");
  }, [selectedGroupId]);

  useEffect(() => {
    if (!selectedGroupId) {
      setMessages([]);
      setHasMoreOlder(false);
      return;
    }
    loadMessagesForGroup(selectedGroupId, debouncedMsgSearch, false);
    const timer = setInterval(() => {
      loadMessagesForGroup(selectedGroupId, debouncedMsgSearch, true);
    }, 5000);
    return () => clearInterval(timer);
  }, [selectedGroupId, debouncedMsgSearch]);

  useEffect(() => {
    if (shouldScrollBottomRef.current) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  const myGroups = groups.filter((g) => g.joined);
  const discoverGroups = groups
    .filter((g) => !g.joined)
    .filter(
      (g) =>
        !searchDiscover.trim() ||
        g.name.toLowerCase().includes(searchDiscover.toLowerCase()) ||
        (g.subject || "").toLowerCase().includes(searchDiscover.toLowerCase()) ||
        (g.description || "").toLowerCase().includes(searchDiscover.toLowerCase())
    );

  const activeGroup = myGroups.find((g) => g.id === selectedGroupId) || null;

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!createDraft.name.trim()) return;
    setCreateSubmitting(true);
    setActionError("");
    try {
      const created = await createGroup({
        name: createDraft.name.trim(),
        subject: createDraft.subject.trim() || "Chung",
        description: createDraft.description.trim(),
        privacy: createDraft.privacy,
        avatarColor: createDraft.avatarColor,
      });
      setGroups((prev) => [created, ...prev]);
      setSelectedGroupId(created.id);
      setCreateOpen(false);
      setCreateDraft({
        name: "",
        subject: "",
        description: "",
        privacy: "PUBLIC",
        avatarColor: AVATAR_COLORS[0],
      });
      setTab(0);
    } catch (err) {
      setActionError(err.message || "Không tạo được nhóm");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleJoinGroup = async (groupId) => {
    setActionError("");
    try {
      const updated = await joinGroup(groupId);
      setGroups((prev) => prev.map((g) => (g.id === groupId ? updated : g)));
      setSelectedGroupId(groupId);
      setTab(0);
    } catch (err) {
      setActionError(err.message || "Không thể tham gia nhóm");
    }
  };

  const handleLeaveGroup = async (groupId) => {
    setActionError("");
    try {
      await leaveGroup(groupId);
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? { ...g, joined: false, myRole: null, memberCount: Math.max(0, g.memberCount - 1) }
            : g
        )
      );
      if (selectedGroupId === groupId) {
        const next = myGroups.find((g) => g.id !== groupId);
        setSelectedGroupId(next ? next.id : null);
      }
    } catch (err) {
      setActionError(err.message || "Không thể rời nhóm");
    }
  };

  const handleDeleteGroup = async (groupId) => {
    setActionError("");
    try {
      await deleteGroup(groupId);
      const remaining = groups.filter((g) => g.id !== groupId);
      setGroups(remaining);
      if (selectedGroupId === groupId) {
        const next = remaining.find((g) => g.joined);
        setSelectedGroupId(next ? next.id : null);
      }
    } catch (err) {
      setActionError(err.message || "Không thể xóa nhóm");
    }
  };

  const handleOpenMembers = async (groupId) => {
    setMembersOpen(true);
    setMembersLoading(true);
    try {
      const list = await fetchGroupMembers(groupId);
      setMembers(list);
    } catch (err) {
      setActionError(err.message || "Không tải được danh sách thành viên");
    } finally {
      setMembersLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const content = msgInput.trim();
    if (!content || !activeGroup || sendingMsg) return;
    const clientMsgId = pendingClientMsgId || makeClientMsgId();
    setPendingClientMsgId(clientMsgId);
    setSendingMsg(true);
    setActionError("");
    try {
      const sent = await sendGroupMessage(activeGroup.id, content, clientMsgId);
      setMessages((prev) =>
        prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]
      );
      setGroups((prev) =>
        prev.map((g) => (g.id === activeGroup.id ? { ...g, lastMsg: sent.content } : g))
      );
      setMsgInput("");
      setPendingClientMsgId(null);
    } catch (err) {
      setActionError(
        err.message || "Gửi tin nhắn thất bại — bạn có thể bấm Gửi lại"
      );
    } finally {
      setSendingMsg(false);
    }
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1.5,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Nhóm học
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tạo nhóm học, tham gia thảo luận và nhắn tin trực tiếp với thành viên
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={() => setCreateOpen(true)}
        >
          Tạo nhóm mới
        </Button>
      </Box>

      {error && (
        <Alert
          severity="error"
          action={<Button size="small" onClick={loadAllGroups}>Thử lại</Button>}
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}
      {actionError && (
        <Alert severity="error" onClose={() => setActionError("")} sx={{ mb: 2 }}>
          {actionError}
        </Alert>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab
          icon={<PeopleAltRoundedIcon fontSize="small" />}
          iconPosition="start"
          label={`Nhóm của tôi (${myGroups.length})`}
        />
        <Tab
          icon={<ExploreRoundedIcon fontSize="small" />}
          iconPosition="start"
          label={`Khám phá (${discoverGroups.length})`}
        />
      </Tabs>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : tab === 0 ? (
        myGroups.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: "center" }} variant="outlined">
            <GroupsRoundedIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
            <Typography variant="h6" gutterBottom>
              Bạn chưa tham gia nhóm học nào
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Hãy tạo nhóm mới hoặc sang tab Khám phá để tham gia cùng bạn bè.
            </Typography>
            <Button variant="contained" onClick={() => setTab(1)}>
              Khám phá nhóm học
            </Button>
          </Paper>
        ) : (
          <Grid container spacing={2.5}>
            {/* Danh sách nhóm đã tham gia */}
            <Grid item xs={12} md={4}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {myGroups.map((g) => (
                  <Card
                    key={g.id}
                    onClick={() => setSelectedGroupId(g.id)}
                    sx={{
                      cursor: "pointer",
                      border: selectedGroupId === g.id ? "2px solid" : "1px solid",
                      borderColor:
                        selectedGroupId === g.id ? "primary.main" : "divider",
                    }}
                  >
                    <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: g.avatarColor || "#0F4C81" }}>
                          {initials(g.name)}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                            <Typography variant="subtitle1" fontWeight={700} noWrap>
                              {g.name}
                            </Typography>
                            {g.privacy === "PRIVATE" ? (
                              <LockRoundedIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                            ) : (
                              <PublicRoundedIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                            )}
                          </Box>
                          <Typography variant="caption" color="text.secondary" display="block" noWrap>
                            {g.lastMsg || g.description || "Chưa có tin nhắn nào"}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1.5 }}>
                        <Chip size="small" label={g.subject || "Chung"} />
                        <Chip size="small" variant="outlined" label={`${g.memberCount} thành viên`} />
                        {g.myRole === "OWNER" && (
                          <Chip size="small" color="primary" label="Chủ nhóm" />
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Grid>

            {/* Khung chat nhóm */}
            <Grid item xs={12} md={8}>
              {activeGroup && (
                <Card sx={{ display: "flex", flexDirection: "column", height: 560 }}>
                  <Box
                    sx={{
                      p: 2,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <Avatar sx={{ bgcolor: activeGroup.avatarColor || "#0F4C81" }}>
                        {initials(activeGroup.name)}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={700}>
                          {activeGroup.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {activeGroup.description || activeGroup.subject}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                      <TextField
                        size="small"
                        placeholder="Tìm tin nhắn…"
                        value={msgSearch}
                        onChange={(e) => setMsgSearch(e.target.value)}
                        sx={{ width: 170 }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchRoundedIcon fontSize="small" />
                            </InputAdornment>
                          ),
                        }}
                      />
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<PeopleAltRoundedIcon />}
                        onClick={() => handleOpenMembers(activeGroup.id)}
                      >
                        Thành viên ({activeGroup.memberCount})
                      </Button>
                      {activeGroup.myRole === "OWNER" ? (
                        <Tooltip title="Xóa nhóm">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteGroup(activeGroup.id)}
                          >
                            <DeleteOutlineRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Rời nhóm">
                          <IconButton
                            size="small"
                            onClick={() => handleLeaveGroup(activeGroup.id)}
                          >
                            <ExitToAppRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>

                  {/* Tin nhắn */}
                  <Box
                    onScroll={(e) => {
                      if (e.currentTarget.scrollTop === 0 && hasMoreOlder && !loadingOlder) {
                        handleLoadOlder();
                      }
                    }}
                    sx={{ flex: 1, overflowY: "auto", p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}
                  >
                    {hasMoreOlder && !messagesLoading && (
                      <Box sx={{ display: "flex", justifyContent: "center" }}>
                        <Button size="small" onClick={handleLoadOlder} disabled={loadingOlder}>
                          {loadingOlder ? "Đang tải…" : "Tải tin nhắn cũ hơn"}
                        </Button>
                      </Box>
                    )}
                    {messagesLoading ? (
                      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                        <CircularProgress size={24} />
                      </Box>
                    ) : messages.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" textAlign="center" py={6}>
                        Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!
                      </Typography>
                    ) : (
                      messages.map((m) => (
                        <Box
                          key={m.id}
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: m.mine ? "flex-end" : "flex-start",
                          }}
                        >
                          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.25 }}>
                            {m.mine ? "Bạn" : m.senderName}
                          </Typography>
                          <Paper
                            sx={{
                              px: 1.75,
                              py: 1,
                              maxWidth: "75%",
                              bgcolor: m.mine ? "primary.main" : "action.hover",
                              color: m.mine ? "primary.contrastText" : "text.primary",
                              borderRadius: 2,
                            }}
                          >
                            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                              {m.content}
                            </Typography>
                          </Paper>
                        </Box>
                      ))
                    )}
                    <div ref={chatEndRef} />
                  </Box>

                  <Divider />
                  <Box
                    component="form"
                    onSubmit={handleSendMessage}
                    sx={{ p: 1.5, display: "flex", gap: 1 }}
                  >
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="Nhập tin nhắn cho nhóm…"
                      value={msgInput}
                      onChange={(e) => {
                        setMsgInput(e.target.value);
                        setPendingClientMsgId(null);
                      }}
                      disabled={sendingMsg}
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={sendingMsg || !msgInput.trim()}
                      endIcon={
                        sendingMsg ? <CircularProgress size={14} /> : <SendRoundedIcon />
                      }
                    >
                      {pendingClientMsgId ? "Gửi lại" : "Gửi"}
                    </Button>
                  </Box>
                </Card>
              )}
            </Grid>
          </Grid>
        )
      ) : (
        <Box>
          <TextField
            size="small"
            placeholder="Tìm nhóm theo tên, môn học…"
            value={searchDiscover}
            onChange={(e) => setSearchDiscover(e.target.value)}
            sx={{ mb: 3, width: { xs: "100%", sm: 320 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          {discoverGroups.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: "center" }} variant="outlined">
              <Typography color="text.secondary">
                Không có nhóm công khai nào khác để tham gia.
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={2.5}>
              {discoverGroups.map((g) => (
                <Grid item xs={12} sm={6} md={4} key={g.id}>
                  <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                    <CardContent sx={{ flex: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
                        <Avatar sx={{ bgcolor: g.avatarColor || "#0F4C81" }}>
                          {initials(g.name)}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1" fontWeight={700}>
                            {g.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {g.subject || "Chung"} · {g.memberCount} thành viên
                          </Typography>
                        </Box>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {g.description || "Nhóm học tập trên HomuLearn."}
                      </Typography>
                    </CardContent>
                    <Box sx={{ p: 2, pt: 0 }}>
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<PersonAddRoundedIcon />}
                        onClick={() => handleJoinGroup(g.id)}
                      >
                        Tham gia nhóm
                      </Button>
                    </Box>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* Dialog tạo nhóm mới */}
      <Dialog open={createOpen} onClose={() => !createSubmitting && setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Tạo nhóm học mới</DialogTitle>
        <Box component="form" onSubmit={handleCreateGroup}>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
            <TextField
              label="Tên nhóm"
              fullWidth
              required
              value={createDraft.name}
              onChange={(e) => setCreateDraft((d) => ({ ...d, name: e.target.value }))}
              inputProps={{ maxLength: 120 }}
            />
            <TextField
              label="Môn học / Chủ đề"
              placeholder="VD: Giải tích, CNTT, Tiếng Anh…"
              fullWidth
              value={createDraft.subject}
              onChange={(e) => setCreateDraft((d) => ({ ...d, subject: e.target.value }))}
              inputProps={{ maxLength: 100 }}
            />
            <TextField
              label="Mô tả nhóm"
              fullWidth
              multiline
              rows={3}
              value={createDraft.description}
              onChange={(e) => setCreateDraft((d) => ({ ...d, description: e.target.value }))}
              inputProps={{ maxLength: 1000 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={createDraft.privacy === "PRIVATE"}
                  onChange={(e) =>
                    setCreateDraft((d) => ({
                      ...d,
                      privacy: e.target.checked ? "PRIVATE" : "PUBLIC",
                    }))
                  }
                />
              }
              label="Nhóm riêng tư (người ngoài không tự tham gia)"
            />
            <Box>
              <Typography variant="caption" color="text.secondary" mb={0.75} display="block">
                Màu đại diện
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                {AVATAR_COLORS.map((c) => (
                  <Box
                    key={c}
                    onClick={() => setCreateDraft((d) => ({ ...d, avatarColor: c }))}
                    sx={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      bgcolor: c,
                      cursor: "pointer",
                      border: "2.5px solid",
                      borderColor: createDraft.avatarColor === c ? "text.primary" : "transparent",
                    }}
                  />
                ))}
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)} disabled={createSubmitting}>
              Hủy
            </Button>
            <Button type="submit" variant="contained" disabled={createSubmitting || !createDraft.name.trim()}>
              {createSubmitting ? "Đang tạo…" : "Tạo nhóm"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Dialog thành viên */}
      <Dialog open={membersOpen} onClose={() => setMembersOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Thành viên nhóm</DialogTitle>
        <DialogContent>
          {membersLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <List disablePadding>
              {members.map((m) => (
                <ListItem key={m.id} disableGutters>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: m.avatarColor || "primary.main" }}>
                      {initials(m.fullName)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={m.fullName}
                    secondary={[m.major, m.cohort].filter(Boolean).join(" · ") || "Thành viên"}
                  />
                  {m.role === "OWNER" && (
                    <Chip size="small" color="primary" label="Chủ nhóm" />
                  )}
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMembersOpen(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
