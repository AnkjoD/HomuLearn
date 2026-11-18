import { useDashboard } from "../hooks/useDashboard";
import { useDispatch, useSelector } from "react-redux";
import { Alert, CircularProgress } from "@mui/material";
import { loadDashboardStats } from "../store/dashboardSlice";
import { loadGoals } from "../store/goalsSlice";
import { loadNotes } from "../store/notesSlice";
import React, { useEffect } from "react";
import { useTheme } from "@mui/material/styles";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  Button,
  IconButton,
} from "@mui/material";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import RadioButtonUncheckedRoundedIcon from "@mui/icons-material/RadioButtonUncheckedRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import LocalFireDepartmentRoundedIcon from "@mui/icons-material/LocalFireDepartmentRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import { useNavigate } from "react-router-dom";
const QUICK_ACTIONS = [
  { label: "Ôn tập ngay", path: "/review", emoji: "🎯" },
  { label: "Ghi chú mới", path: "/notes", emoji: "📝" },
  { label: "Pomodoro", path: "/pomodoro", emoji: "⏱" },
  { label: "Cộng đồng", path: "/community", emoji: "💬" },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Chào buổi sáng";
  if (h < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

function StatCard({ stat }) {
  return (
    <Card
      sx={{
        transition: "box-shadow 0.2s, border-color 0.2s",
        "&:hover": {
          borderColor: stat.color + "60",
          boxShadow: `0 4px 12px ${stat.color}20`,
        },
      }}
    >
      <CardContent
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          py: "16px !important",
        }}
      >
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: stat.bg,
            fontSize: 22,
            flexShrink: 0,
          }}
        >
          {stat.icon}
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2 }}>
            <span data-testid={`stat-${stat.key}`}>{stat.value}</span>
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {stat.label}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { stats, status, error, refresh } = useDashboard();
  const user = useSelector(s => s.auth.user);
  const goals = useSelector(s => s.goals.items);
  const notes = useSelector(s => s.notes.items);
  const goalsError = useSelector(s => s.goals.error);
  const notesError = useSelector(s => s.notes.listError);
  const cards = stats ? [
    { label: "Ghi chú đã tạo", value: stats.noteCount, key: "noteCount", icon: "📝", color: "#0F4C81", bg: "#0F4C8118" },
    { label: "Mục tiêu đang làm", value: stats.goalInProgress, key: "goalInProgress", icon: "🎯", color: "#946B25", bg: "#D4A54A18" },
    { label: "Mục tiêu hoàn thành", value: stats.goalDone, key: "goalDone", icon: "✅", color: "#16A34A", bg: "#16A34A18" },
    { label: "Phiên tập trung", value: stats.sessionCount, key: "sessionCount", icon: "⏱", color: "#0284C7", bg: "#0284C718" },
    { label: "Tổng phút tập trung", value: stats.totalMinutes, key: "totalMinutes", icon: "📖", color: "#7C3AED", bg: "#7C3AED18" },
  ] : [];

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",

          alignItems: "center",
          mb: 3,
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant="overline"
            color="primary.main"
            sx={{ letterSpacing: "0.18em", fontSize: 10 }}
          >
            HOMULEARN / GÓC HỌC TẬP
          </Typography>
          <Typography variant="h4" sx={{ mt: 0.5 }}>
            Hôm nay, mình học gì nhỉ?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Không cần vội. Mỗi bước nhỏ đều là một bước tiến.
          </Typography>
        </Box>
        <Chip
          label={isDark ? "☾ Homura · Tập trung" : "✿ Madoka · Hy vọng"}
          variant="outlined"
          sx={{
            display: { xs: "none", md: "flex" },
            color: "primary.main",
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        />
      </Box>
      <Box
        sx={{
          mb: 3,
          p: 2.5,
          minHeight: 185,
          borderRadius: "24px",
          background: isDark
            ? "linear-gradient(115deg, #34243F, #241B30)"
            : "linear-gradient(115deg, #F7DCE7, #FBEDF0)",
          border: "1px solid",
          borderColor: "divider",
          color: "text.primary",
          display: "flex",
          alignItems: "center",
          gap: 2,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            right: 24,
            top: "50%",
            transform: "translateY(-50%)",
            color: "primary.main",
            opacity: 0.13,
            fontSize: 160,
            lineHeight: 1,
            userSelect: "none",
          }}
        >
          {isDark ? "☾" : "✿"}
        </Box>
        <Box
          sx={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            bgcolor: "background.paper",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <LocalFireDepartmentRoundedIcon
            sx={{ color: "primary.main", fontSize: 28 }}
          />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="h5"
            fontWeight={700}
            sx={{ color: "text.primary" }}
          >
            {greeting()}, {user?.fullName || "bạn"}! 👋
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", mt: 0.25 }}
          >
            Tiến độ lấy từ tài khoản của bạn. Bấm làm mới để lấy cập nhật mới nhất.
          </Typography>
        </Box>
        <Button variant="outlined" onClick={refresh} disabled={status === "loading"}>Làm mới dữ liệu</Button>
      </Box>
      <Box sx={{ display: "flex", gap: 1.5, mb: 3, flexWrap: "wrap" }}>
        {QUICK_ACTIONS.map(({ label, path, emoji }) => (
          <Button
            key={path}
            variant="outlined"
            onClick={() => navigate(path)}
            sx={{
              borderRadius: "10px",
              textTransform: "none",
              fontWeight: 500,
              gap: 0.75,
              borderColor: "divider",
              color: "text.primary",
              "&:hover": {
                borderColor: "primary.main",
                bgcolor: "background.subtle",
              },
            }}
          >
            <span>{emoji}</span> {label}
          </Button>
        ))}
      </Box>
      {status === "loading" && <CircularProgress aria-label="Đang tải thống kê" size={24} />}
      {error && <Alert severity="error" action={<Button onClick={refresh}>Thử lại</Button>}>{error}</Alert>}
      <Grid container spacing={2} mb={3}>
        {cards.map((s) => (
          <Grid item xs={12} sm={6} md={3} key={s.label}>
            <StatCard stat={s} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}><Card><CardContent>
          <Typography variant="h6">Mục tiêu học tập</Typography>
          {goalsError && <Alert severity="error">{goalsError}</Alert>}
          {!goalsError && goals.length === 0 && <Typography color="text.secondary">Chưa có mục tiêu.</Typography>}
          <List>{goals.slice(0, 5).map(g => <ListItem key={g.id}><ListItemText primary={g.title} secondary={`${g.currentProgress}/${g.targetValue} ${g.unit || ""}`} /></ListItem>)}</List>
          <Button onClick={() => navigate("/goals")}>Quản lý mục tiêu</Button>
        </CardContent></Card></Grid>
        <Grid item xs={12} md={6}><Card><CardContent>
          <Typography variant="h6">Ghi chú gần đây</Typography>
          {notesError && <Alert severity="error">{notesError}</Alert>}
          {!notesError && notes.length === 0 && <Typography color="text.secondary">Chưa có ghi chú.</Typography>}
          <List>{notes.slice(0, 5).map(n => <ListItem key={n.id}><Button onClick={() => navigate(`/notes/${n.id}`)}>{n.title}</Button></ListItem>)}</List>
          <Button onClick={() => navigate("/notes")}>Tất cả ghi chú</Button>
        </CardContent></Card></Grid>
      </Grid>
    </Box>
  );
}
