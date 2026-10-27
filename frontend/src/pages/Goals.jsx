import { useGoals } from "../hooks/useGoals";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Avatar,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import LocalFireDepartmentRoundedIcon from "@mui/icons-material/LocalFireDepartmentRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import {
  loadGoals,
  addGoal,
  editGoal,
  removeGoal,
  clearGoalError,
} from "../store/goalsSlice";

export default function Goals() {
  const dispatch = useDispatch();
  const { items: goals, status, error, mutationError, mutationStatus } = useGoals();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [form, setForm] = useState({
    title: "",
    unit: "",
    targetValue: 10,
    currentProgress: 0,
    deadline: "",
  });


  const handleOpenCreate = () => {
    setEditingGoal(null);
    setForm({
      title: "",
      unit: "thẻ",
      targetValue: 10,
      currentProgress: 0,
      deadline: "",
    });
    dispatch(clearGoalError());
    setDialogOpen(true);
  };

  const handleOpenEdit = (goal) => {
    setEditingGoal(goal);
    setForm({
      title: goal.title,
      unit: goal.unit || "",
      targetValue: goal.targetValue,
      currentProgress: goal.currentProgress,
      deadline: goal.deadline ? new Date(new Date(goal.deadline).getTime() - new Date(goal.deadline).getTimezoneOffset() * 60000).toISOString().slice(0, 10) : "",
    });
    dispatch(clearGoalError());
    setDialogOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = {
      title: form.title.trim(),
      unit: form.unit.trim() || null,
      targetValue: Number(form.targetValue),
      currentProgress: Number(form.currentProgress),
      clearDeadline: !form.deadline,
      deadline: form.deadline ? new Date(`${form.deadline}T00:00:00`).toISOString() : null,
    };

    if (editingGoal) {
      const res = await dispatch(
        editGoal({ id: editingGoal.id, data: payload })
      );
      if (!res.error) setDialogOpen(false);
    } else {
      const res = await dispatch(addGoal(payload));
      if (!res.error) setDialogOpen(false);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa mục tiêu này?")) {
      dispatch(removeGoal(id));
    }
  };

  const handleQuickIncrement = (goal) => {
    const nextVal = Math.min(goal.targetValue, goal.currentProgress + 1);
    dispatch(
      editGoal({
        id: goal.id,
        data: { currentProgress: nextVal },
      })
    );
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
          mb: 3,
        }}
      >
        <Typography variant="h4" fontWeight={700}>
          Mục tiêu & Thành tích
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={handleOpenCreate}
        >
          Mục tiêu mới
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {mutationError && !dialogOpen && <Alert severity="error">{typeof mutationError === "string" ? mutationError : mutationError.message}</Alert>}
      {status === "failed" && <Button onClick={() => dispatch(loadGoals())}>Thử lại</Button>}
      <Grid container spacing={3}>
        {/* Streak card */}
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              borderRadius: "14px",
              border: "1px solid",
              borderColor: "divider",
            }}
            elevation={0}
          >
            <CardContent><Typography variant="h6">Chuỗi ngày học</Typography><Typography color="text.secondary">Chưa có dữ liệu. Tính năng streak chưa triển khai.</Typography></CardContent>
          </Card>
        </Grid>

        {/* Goals list */}
        <Grid item xs={12} md={8}>
          <Card
            sx={{
              borderRadius: "14px",
              border: "1px solid",
              borderColor: "divider",
              height: "100%",
            }}
            elevation={0}
          >
            <CardContent sx={{ p: "24px !important" }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 3,
                }}
              >
                <Typography variant="h6" fontWeight={700}>
                  Mục tiêu học tập ({goals.length})
                </Typography>
                {status === "loading" && <CircularProgress size={20} />}
              </Box>

              {status !== "loading" && goals.length === 0 && (
                <Box sx={{ py: 6, textAlign: "center" }}>
                  <Typography color="text.secondary" mb={2}>
                    Chưa có mục tiêu nào. Hãy đặt mục tiêu đầu tiên của bạn!
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<AddRoundedIcon />}
                    onClick={handleOpenCreate}
                  >
                    Tạo mục tiêu
                  </Button>
                </Box>
              )}

              {goals.map((goal) => {
                const percent = Math.min(
                  100,
                  Math.round((goal.currentProgress / (goal.targetValue || 1)) * 100)
                );
                const isCompleted = goal.status === "DONE" || percent >= 100;
                const progressColor = isCompleted ? "#16A34A" : "#0F4C81";

                return (
                  <Box key={goal.id} mb={3} sx={{ "&:last-child": { mb: 0 } }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 1.5,
                        mb: 1,
                        alignItems: "center",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {goal.title}
                        </Typography>
                        {isCompleted && (
                          <Chip
                            icon={<CheckCircleRoundedIcon fontSize="small" />}
                            label="Hoàn thành"
                            size="small"
                            color="success"
                            variant="outlined"
                            sx={{ height: 22, fontSize: 11 }}
                          />
                        )}
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Chip
                          label={`${goal.currentProgress}/${goal.targetValue} ${
                            goal.unit || ""
                          }`.trim()}
                          size="small"
                          variant="outlined"
                          sx={{ height: 22, fontSize: 11, fontWeight: 500 }}
                        />
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          fontWeight={600}
                        >
                          {percent}%
                        </Typography>
                        <Tooltip title="Cộng thêm 1">
                          <IconButton
                            size="small"
                            aria-label="Cộng thêm 1"
                            disabled={isCompleted || mutationStatus === "loading"}
                            onClick={() => handleQuickIncrement(goal)}
                            color="primary"
                          >
                            <AddRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Sửa mục tiêu">
                          <IconButton
                            size="small"
                            aria-label="Sửa mục tiêu"
                            disabled={mutationStatus === "loading"}
                            onClick={() => handleOpenEdit(goal)}
                          >
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Xóa mục tiêu">
                          <IconButton
                            size="small"
                            color="error"
                            aria-label="Xóa mục tiêu"
                            disabled={mutationStatus === "loading"}
                            onClick={() => handleDelete(goal.id)}
                          >
                            <DeleteOutlineRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={percent}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: progressColor + "22",
                        "& .MuiLinearProgress-bar": {
                          bgcolor: progressColor,
                          borderRadius: 4,
                        },
                      }}
                    />
                    {goal.deadline && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mt: 0.5, display: "block" }}
                      >
                        Hạn chót:{" "}
                        {new Date(goal.deadline).toLocaleDateString("vi-VN")}
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </CardContent>
          </Card>
        </Grid>

        {/* Badges card */}
        <Grid item xs={12}>
          <Card
            sx={{
              borderRadius: "14px",
              border: "1px solid",
              borderColor: "divider",
            }}
            elevation={0}
          >
            <CardContent><Typography variant="h6">Huy hiệu</Typography><Typography color="text.secondary">Chưa có dữ liệu. Tính năng huy hiệu chưa triển khai.</Typography></CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog tạo / chỉnh sửa mục tiêu */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <form onSubmit={handleSave}>
          <DialogTitle>
            {editingGoal ? "Chỉnh sửa mục tiêu" : "Mục tiêu học tập mới"}
          </DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
            {mutationError && (
              <Alert severity="error">
                {typeof mutationError === "string"
                  ? mutationError
                  : mutationError.message || "Thao tác thất bại"}
              </Alert>
            )}
            <TextField
              label="Tiêu đề mục tiêu"
              required
              fullWidth
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="VD: Hoàn thành Giải tích"
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Chỉ tiêu"
                  type="number"
                  required
                  fullWidth
                  inputProps={{ min: 1 }}
                  value={form.targetValue}
                  onChange={(e) =>
                    setForm({ ...form, targetValue: Math.max(1, Number(e.target.value)) })
                  }
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Đơn vị"
                  fullWidth
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  placeholder="thẻ, giờ, bài..."
                />
              </Grid>
            </Grid>
            <TextField
              label="Tiến độ hiện tại"
              type="number"
              fullWidth
              inputProps={{ min: 0, max: form.targetValue }}
              value={form.currentProgress}
              onChange={(e) =>
                setForm({
                  ...form,
                  currentProgress: Math.max(
                    0,
                    Math.min(form.targetValue, Number(e.target.value))
                  ),
                })
              }
            />
            <TextField
              label="Hạn chót"
              type="date"
              InputLabelProps={{ shrink: true }}
              fullWidth
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button type="submit" variant="contained" disabled={mutationStatus === "loading" || !form.title.trim()}>
              Lưu
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
