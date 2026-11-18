import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useSelector } from "react-redux";
import {
  deleteAdminPost,
  fetchAdminAuditLogs,
  fetchAdminOverview,
  fetchAdminPosts,
  fetchAdminReports,
  fetchAdminUsers,
  resolveAdminReport,
  updateAdminUserStatus,
} from "../api/admin";

export default function Admin() {
  const user = useSelector((s) => s.auth.user);
  const [tab, setTab] = useState(0);
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [reports, setReports] = useState([]);
  const [logs, setLogs] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [postSearch, setPostSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [ov, us, ps, rp, lg] = await Promise.all([
        fetchAdminOverview(),
        fetchAdminUsers(),
        fetchAdminPosts(),
        fetchAdminReports(),
        fetchAdminAuditLogs(),
      ]);
      setOverview(ov);
      setUsers(us);
      setPosts(ps);
      setReports(rp);
      setLogs(lg);
    } catch (err) {
      setError(err.message || "Không tải được dữ liệu quản trị");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "ADMIN") {
      loadAll();
    } else {
      setLoading(false);
    }
  }, [user?.role]);

  if (user?.role !== "ADMIN") {
    return (
      <Alert severity="warning">
        Bạn không có quyền truy cập trang Quản trị (yêu cầu quyền ADMIN).
      </Alert>
    );
  }

  const handleToggleBan = async (u) => {
    const next = u.status === "BANNED" ? "ACTIVE" : "BANNED";
    setError("");
    try {
      const updated = await updateAdminUserStatus(u.id, next);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
      const [ov, lg] = await Promise.all([
        fetchAdminOverview(),
        fetchAdminAuditLogs(),
      ]);
      setOverview(ov);
      setLogs(lg);
    } catch (err) {
      setError(err.message || "Không cập nhật được trạng thái tài khoản");
    }
  };

  const handleResolveReport = async (r, status, deleteTarget) => {
    setError("");
    try {
      const updated = await resolveAdminReport(r.id, status, deleteTarget);
      setReports((prev) => prev.map((x) => (x.id === r.id ? updated : x)));
      const [ov, lg, ps] = await Promise.all([
        fetchAdminOverview(),
        fetchAdminAuditLogs(),
        fetchAdminPosts(),
      ]);
      setOverview(ov);
      setLogs(lg);
      setPosts(ps);
    } catch (err) {
      setError(err.message || "Không xử lý được báo cáo");
    }
  };

  const handleDeletePost = async (postId) => {
    setError("");
    try {
      await deleteAdminPost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      const [ov, lg] = await Promise.all([
        fetchAdminOverview(),
        fetchAdminAuditLogs(),
      ]);
      setOverview(ov);
      setLogs(lg);
    } catch (err) {
      setError(err.message || "Không xóa được bài viết");
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      !userSearch.trim() ||
      (u.fullName || "").toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(userSearch.toLowerCase()),
  );

  const filteredPosts = posts.filter(
    (p) =>
      !postSearch.trim() ||
      (p.title || "").toLowerCase().includes(postSearch.toLowerCase()) ||
      (p.authorName || "").toLowerCase().includes(postSearch.toLowerCase()),
  );

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={3}>
        Quản trị hệ thống
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {overview && (
            <Grid container spacing={2} mb={3}>
              {[
                { label: "Tổng người dùng", val: overview.totalUsers },
                { label: "Đang hoạt động", val: overview.activeUsers },
                { label: "Đang bị khóa", val: overview.bannedUsers },
                { label: "Báo cáo chờ xử lý", val: overview.pendingReports },
              ].map((s) => (
                <Grid item xs={6} md={3} key={s.label}>
                  <Card>
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">
                        {s.label}
                      </Typography>
                      <Typography variant="h4" fontWeight={700}>
                        {s.val}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
            <Tab label={`Người dùng (${users.length})`} />
            <Tab label={`Bài viết (${posts.length})`} />
            <Tab label={`Báo cáo (${reports.length})`} />
            <Tab label={`Nhật ký (${logs.length})`} />
          </Tabs>

          {tab === 0 && (
            <Box>
              <TextField
                size="small"
                placeholder="Tìm theo tên hoặc email…"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                sx={{ mb: 2, width: 280 }}
              />
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Họ tên</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell>Trạng thái</TableCell>
                      <TableCell align="right">Thao tác</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>{u.fullName}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          <Chip size="small" label={u.role} />
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            color={u.status === "BANNED" ? "error" : "success"}
                            label={u.status}
                          />
                        </TableCell>
                        <TableCell align="right">
                          {u.id !== user.id && (
                            <Button
                              size="small"
                              color={
                                u.status === "BANNED" ? "primary" : "error"
                              }
                              onClick={() => handleToggleBan(u)}
                            >
                              {u.status === "BANNED"
                                ? "Mở khóa"
                                : "Khóa tài khoản"}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {tab === 1 && (
            <Box>
              <TextField
                size="small"
                placeholder="Tìm bài viết theo tiêu đề hoặc tác giả…"
                value={postSearch}
                onChange={(e) => setPostSearch(e.target.value)}
                sx={{ mb: 2, width: 320 }}
              />
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Tiêu đề & Nội dung</TableCell>
                      <TableCell>Tác giả</TableCell>
                      <TableCell>Bình luận</TableCell>
                      <TableCell align="right">Thao tác</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredPosts.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            #{p.id} · {p.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {p.contentPreview}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {p.authorName} ({p.authorEmail})
                        </TableCell>
                        <TableCell>{p.commentCount}</TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            color="error"
                            onClick={() => handleDeletePost(p.id)}
                          >
                            Xóa bài
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {tab === 3 && (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Đối tượng</TableCell>
                    <TableCell>Lý do</TableCell>
                    <TableCell>Người báo cáo</TableCell>
                    <TableCell>Trạng thái</TableCell>
                    <TableCell align="right">Xử lý</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reports.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        {r.targetType} #{r.targetId}
                        {r.targetPreview ? ` — ${r.targetPreview}` : ""}
                      </TableCell>
                      <TableCell>{r.reason}</TableCell>
                      <TableCell>{r.reporterName}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={
                            r.status === "PENDING"
                              ? "warning"
                              : r.status === "RESOLVED"
                                ? "success"
                                : "default"
                          }
                          label={r.status}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {r.status === "PENDING" && (
                          <Box
                            sx={{
                              display: "flex",
                              gap: 1,
                              justifyContent: "flex-end",
                            }}
                          >
                            <Button
                              size="small"
                              color="error"
                              onClick={() =>
                                handleResolveReport(r, "RESOLVED", true)
                              }
                            >
                              Xóa bài & Xong
                            </Button>
                            <Button
                              size="small"
                              onClick={() =>
                                handleResolveReport(r, "DISMISSED", false)
                              }
                            >
                              Bỏ qua
                            </Button>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {tab === 3 && (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Admin</TableCell>
                    <TableCell>Hành động</TableCell>
                    <TableCell>Chi tiết</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>{l.adminName}</TableCell>
                      <TableCell>
                        <Chip size="small" label={l.action} />
                      </TableCell>
                      <TableCell>{l.detail}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}
    </Box>
  );
}
