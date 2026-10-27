import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTheme } from "@mui/material/styles";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Slider,
  IconButton,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
} from "@mui/material";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import SkipNextRoundedIcon from "@mui/icons-material/SkipNextRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { usePomodoro } from "../hooks/usePomodoro";
import {
  loadPomodoroSessions,
  savePomodoroSession,
} from "../store/pomodoroSlice";

const INIT_PRESETS = [
  { id: "p1", name: "Pomodoro chuẩn", work: 25, short: 5, long: 15 },
  { id: "p2", name: "Sprint dài", work: 50, short: 10, long: 20 },
  { id: "p3", name: "Ôn nhanh", work: 15, short: 3, long: 10 },
];

function CircularTimer({ progress, color, children }) {
  const r = 110;
  const circ = 2 * Math.PI * r;
  return (
    <Box
      sx={{
        position: "relative",
        width: 280,
        height: 280,
        mx: "auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${color}0A 0%, transparent 70%)`,
        }}
      />
      <svg
        width="260"
        height="260"
        style={{ transform: "rotate(-90deg)", position: "absolute" }}
      >
        <circle
          cx="130"
          cy="130"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          style={{ color: "inherit", opacity: 0.1 }}
        />
        <circle
          cx="130"
          cy="130"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - progress)}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.9s linear" }}
        />
      </svg>
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

export default function Pomodoro() {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { history, status, error, saveError, saving } = useSelector((s) => s.pomodoro);

  const [pendingSession, setPendingSession] = useState(null);
  const [tab, setTab] = useState(0);
  const [workMin, setWorkMin] = useState(25);
  const [shortMin, setShortMin] = useState(5);
  const [longMin, setLongMin] = useState(15);
  const [presets, setPresets] = useState(INIT_PRESETS);
  const [presetOpen, setPresetOpen] = useState(false);
  const [newPreset, setNewPreset] = useState({
    name: "",
    work: 25,
    short: 5,
    long: 15,
  });

  const modeSettings = {
    work: { label: "Học tập", color: theme.palette.primary.main },
    shortBreak: { label: "Nghỉ ngắn", color: theme.palette.success.main },
    longBreak: { label: "Nghỉ dài", color: theme.palette.info.main },
  };

  useEffect(() => {
    dispatch(loadPomodoroSessions());
  }, [dispatch]);

  const persistSession = async (session) => {
    setPendingSession(session);
    const result = await dispatch(savePomodoroSession(session));
    if (!result.error) setPendingSession(null);
  };
  const handleWorkComplete = ({ durationMinutes, startedAt }) => {
    persistSession({
      data: { durationMinutes, startedAt: startedAt, completedAt: new Date().toISOString() },
      idempotencyKey: crypto.randomUUID(),
    });
  };

  const timer = usePomodoro({
    workMinutes: workMin,
    shortBreakMinutes: shortMin,
    longBreakMinutes: longMin,
    onWorkComplete: handleWorkComplete,
  });

  const m = Math.floor(timer.seconds / 60);
  const s = timer.seconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  const conf = modeSettings[timer.mode];

  return (
    <Box maxWidth={800} mx="auto">
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1.5,
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4" fontWeight={700}>
          Pomodoro
        </Typography>
        <Tabs
          value={tab}
          onChange={(e, v) => setTab(v)}
          sx={{
            minHeight: 36,
            "& .MuiTab-root": { minHeight: 36, py: 0.5, borderRadius: 2 },
          }}
        >
          <Tab label="Timer" />
          <Tab label="Cài đặt" />
          <Tab label={`Lịch sử (${history.length})`} />
        </Tabs>
      </Box>

      {error && <Alert severity="error" action={<Button onClick={() => dispatch(loadPomodoroSessions())}>Thử lại</Button>}>{error}</Alert>}
      {saveError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {saveError}
          {pendingSession && <Button disabled={saving} onClick={() => persistSession(pendingSession)}>Lưu lại phiên</Button>}
        </Alert>
      )}

      {tab === 0 && (
        <Card
          sx={{
            borderRadius: "24px",
            border: "1px solid",
            borderColor: "divider",
            overflow: "hidden",
          }}
          elevation={0}
        >
          <Box
            sx={{
              height: 6,
              bgcolor: conf.color,
              width: "100%",
              transition: "background-color 0.3s",
            }}
          />
          <CardContent sx={{ p: "40px !important", textAlign: "center" }}>
            <Box
              sx={{ display: "flex", justifyContent: "center", gap: 1, mb: 4 }}
            >
              {Object.entries(modeSettings).map(([k, c]) => (
                <Chip
                  key={k}
                  label={c.label}
                  onClick={() => timer.changeMode(k)}
                  sx={{
                    bgcolor: timer.mode === k ? c.color : "transparent",
                    color:
                      timer.mode === k
                        ? theme.palette.getContrastText(c.color)
                        : "text.secondary",
                    fontWeight: timer.mode === k ? 600 : 500,
                    border: "1px solid",
                    borderColor: timer.mode === k ? c.color : "divider",
                    px: 1,
                    transition: "all 0.2s",
                  }}
                />
              ))}
            </Box>

            <CircularTimer progress={timer.progress} color={conf.color}>
              <Typography
                variant="h1"
                fontWeight={700}
                sx={{
                  fontFamily: "JetBrains Mono, monospace",
                  letterSpacing: "-2px",
                  color: "text.primary",
                  lineHeight: 1,
                }}
              >
                {mm}:{ss}
              </Typography>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ mt: 1, textTransform: "uppercase", letterSpacing: "2px" }}
              >
                Chu kỳ {timer.cycle}
              </Typography>
            </CircularTimer>

            <Box
              sx={{ display: "flex", justifyContent: "center", gap: 2, mt: 5 }}
            >
              <IconButton
                aria-label="Đặt lại"
                onClick={timer.reset}
                sx={{
                  width: 56,
                  height: 56,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <ReplayRoundedIcon />
              </IconButton>
              <IconButton
                aria-label={timer.running ? "Tạm dừng" : "Bắt đầu"}
                disabled={saving || Boolean(pendingSession)}
                onClick={timer.running ? timer.pause : timer.start}
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: conf.color,
                  color: theme.palette.getContrastText(conf.color),
                  "&:hover": { bgcolor: conf.color, opacity: 0.9 },
                  boxShadow: `0 8px 24px ${conf.color}40`,
                }}
              >
                {timer.running ? (
                  <PauseRoundedIcon sx={{ fontSize: 40 }} />
                ) : (
                  <PlayArrowRoundedIcon sx={{ fontSize: 40 }} />
                )}
              </IconButton>
              <IconButton
                aria-label="Bỏ qua"
                onClick={timer.skip}
                sx={{
                  width: 56,
                  height: 56,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <SkipNextRoundedIcon />
              </IconButton>
            </Box>

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 3 }}
            >
              Đồng hồ mốc chuẩn Date.now(). Khi tải lại trang, đồng hồ sẽ đặt lại để tránh sai lệch thời gian thực.
            </Typography>
          </CardContent>
        </Card>
      )}

      {tab === 1 && (
        <Card
          sx={{
            borderRadius: "16px",
            border: "1px solid",
            borderColor: "divider",
          }}
          elevation={0}
        >
          <CardContent>
            <Typography variant="h6" fontWeight={700} mb={3}>
              Cài đặt thời gian
            </Typography>
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Box mb={4}>
                  <Typography
                    variant="subtitle2"
                    mb={1}
                    color="primary.main"
                    fontWeight={600}
                  >
                    Học tập ({workMin}p)
                  </Typography>
                  <Slider
                    value={workMin}
                    onChange={(_, v) => setWorkMin(v)}
                    min={5}
                    max={90}
                    step={5}
                    marks
                    sx={{ color: "primary.main" }}
                  />
                </Box>
                <Box mb={4}>
                  <Typography
                    variant="subtitle2"
                    mb={1}
                    color="success.main"
                    fontWeight={600}
                  >
                    Nghỉ ngắn ({shortMin}p)
                  </Typography>
                  <Slider
                    value={shortMin}
                    onChange={(_, v) => setShortMin(v)}
                    min={1}
                    max={15}
                    step={1}
                    marks
                    sx={{ color: "success.main" }}
                  />
                </Box>
                <Box>
                  <Typography
                    variant="subtitle2"
                    mb={1}
                    color="info.main"
                    fontWeight={600}
                  >
                    Nghỉ dài ({longMin}p)
                  </Typography>
                  <Slider
                    value={longMin}
                    onChange={(_, v) => setLongMin(v)}
                    min={5}
                    max={45}
                    step={5}
                    marks
                    sx={{ color: "info.main" }}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 1.5,
                    mb: 2,
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={700}>
                    Preset
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<AddRoundedIcon />}
                    onClick={() => setPresetOpen(true)}
                  >
                    Thêm
                  </Button>
                </Box>
                <List disablePadding>
                  {presets.map((p, i) => (
                    <React.Fragment key={p.id}>
                      <ListItem
                        disableGutters
                        secondaryAction={
                          <Box sx={{ display: "flex", gap: 0.5 }}>
                            <Button
                              size="small"
                              onClick={() => {
                                setWorkMin(p.work);
                                setShortMin(p.short);
                                setLongMin(p.long);
                              }}
                            >
                              Dùng
                            </Button>
                            <IconButton
                              size="small"
                              onClick={() =>
                                setPresets((ps) =>
                                  ps.filter((x) => x.id !== p.id)
                                )
                              }
                            >
                              <DeleteOutlineRoundedIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        }
                      >
                        <ListItemText
                          primary={p.name}
                          secondary={`${p.work}p · ${p.short}p · ${p.long}p`}
                          primaryTypographyProps={{
                            fontWeight: 600,
                            variant: "body2",
                          }}
                        />
                      </ListItem>
                      {i < presets.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {tab === 2 && (
        <Card
          sx={{
            borderRadius: "16px",
            border: "1px solid",
            borderColor: "divider",
          }}
          elevation={0}
        >
          <CardContent>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Typography variant="h6" fontWeight={700}>
                Lịch sử phiên học
              </Typography>
              {status === "loading" && <CircularProgress size={20} />}
            </Box>

            {status !== "loading" && history.length === 0 && (
              <Box sx={{ py: 4, textAlign: "center" }}>
                <Typography color="text.secondary">
                  Chưa có phiên học nào được ghi nhận. Hoàn thành một phiên học tập để ghi nhận vào hệ thống!
                </Typography>
              </Box>
            )}

            <List disablePadding>
              {history.map((s, i) => {
                const dateStr = s.startedAt
                  ? new Date(s.startedAt).toLocaleString("vi-VN")
                  : s.completedAt
                  ? new Date(s.completedAt).toLocaleString("vi-VN")
                  : "Vừa xong";

                return (
                  <React.Fragment key={s.id || i}>
                    <ListItem disableGutters>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          bgcolor: "success.main",
                          mr: 2,
                        }}
                      />
                      <ListItemText
                        primary={`Phiên học tập (${s.durationMinutes} phút)`}
                        secondary={dateStr}
                        primaryTypographyProps={{
                          fontWeight: 600,
                          variant: "body2",
                        }}
                      />
                      <Chip
                        label="Hoàn thành"
                        size="small"
                        color="success"
                        sx={{ height: 22, fontSize: 11, fontWeight: 600 }}
                      />
                    </ListItem>
                    {i < history.length - 1 && <Divider />}
                  </React.Fragment>
                );
              })}
            </List>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={presetOpen}
        onClose={() => setPresetOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle fontWeight={700}>Tạo preset</DialogTitle>
        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            pt: "12px !important",
          }}
        >
          <TextField
            label="Tên preset"
            fullWidth
            value={newPreset.name}
            onChange={(e) =>
              setNewPreset((p) => ({ ...p, name: e.target.value }))
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPresetOpen(false)}>Huỷ</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (newPreset.name.trim()) {
                setPresets((p) => [
                  ...p,
                  { ...newPreset, id: `p${Date.now()}` },
                ]);
                setPresetOpen(false);
              }
            }}
          >
            Lưu
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
