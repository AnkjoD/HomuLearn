import React, { useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  TextField,
  Typography,
} from "@mui/material";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import LockResetRoundedIcon from "@mui/icons-material/LockResetRounded";
import { useDispatch, useSelector } from "react-redux";
import { updateProfile } from "../store/authSlice";
import { postChangePassword } from "../api/authApi";

const AVATAR_COLORS = [
  "#BC7796",
  "#7C3AED",
  "#2563EB",
  "#059669",
  "#D97706",
  "#DC2626",
  "#0891B2",
  "#4F46E5",
];

function initials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export default function ProfilePage() {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);

  const [form, setForm] = useState({
    fullName: "",
    major: "",
    cohort: "",
    bio: "",
    avatarColor: AVATAR_COLORS[0],
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  const [pwForm, setPwForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  useEffect(() => {
    if (user) {
      setForm({
        fullName: user.fullName || "",
        major: user.major || "",
        cohort: user.cohort || "",
        bio: user.bio || "",
        avatarColor: user.avatarColor || AVATAR_COLORS[0],
      });
    }
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) {
      setProfileError("Họ tên không được để trống");
      return;
    }
    setProfileSaving(true);
    setProfileError("");
    setProfileSuccess("");
    const result = await dispatch(
      updateProfile({
        fullName: form.fullName.trim(),
        major: form.major.trim(),
        cohort: form.cohort.trim(),
        bio: form.bio.trim(),
        avatarColor: form.avatarColor,
      })
    );
    setProfileSaving(false);
    if (updateProfile.fulfilled.match(result)) {
      setProfileSuccess("Đã cập nhật hồ sơ cá nhân.");
    } else {
      const payload = result.payload;
      setProfileError(
        payload?.fieldErrors?.fullName ||
          payload?.message ||
          "Không cập nhật được hồ sơ"
      );
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");
    if (!pwForm.currentPassword || !pwForm.newPassword) {
      setPwError("Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới");
      return;
    }
    if (pwForm.newPassword.length < 8) {
      setPwError("Mật khẩu mới tối thiểu 8 ký tự");
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError("Xác nhận mật khẩu mới chưa khớp");
      return;
    }
    setPwSaving(true);
    try {
      await postChangePassword({
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPwSuccess("Đã đổi mật khẩu thành công.");
    } catch (err) {
      setPwError(
        err?.fieldErrors?.newPassword ||
          err?.message ||
          "Đổi mật khẩu thất bại"
      );
    } finally {
      setPwSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={3}>
        Hồ sơ cá nhân
      </Typography>

      <Grid container spacing={3}>
        {/* Thông tin hồ sơ */}
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
                <Avatar
                  sx={{
                    width: 64,
                    height: 64,
                    fontSize: 22,
                    fontWeight: 700,
                    bgcolor: form.avatarColor || "primary.main",
                  }}
                >
                  {initials(form.fullName || user.fullName)}
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    {user.fullName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user.email}
                  </Typography>
                  <Chip
                    label={user.role || "STUDENT"}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ mt: 0.75 }}
                  />
                </Box>
              </Box>

              {profileError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {profileError}
                </Alert>
              )}
              {profileSuccess && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {profileSuccess}
                </Alert>
              )}

              <Box
                component="form"
                onSubmit={handleSaveProfile}
                sx={{ display: "flex", flexDirection: "column", gap: 2 }}
              >
                <TextField
                  label="Họ và tên"
                  fullWidth
                  required
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  inputProps={{ maxLength: 100 }}
                />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={7}>
                    <TextField
                      label="Ngành / Khoa"
                      placeholder="VD: Kỹ thuật phần mềm"
                      fullWidth
                      value={form.major}
                      onChange={(e) => setForm((f) => ({ ...f, major: e.target.value }))}
                      inputProps={{ maxLength: 100 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={5}>
                    <TextField
                      label="Khóa / Năm học"
                      placeholder="VD: K18 hoặc Năm 3"
                      fullWidth
                      value={form.cohort}
                      onChange={(e) => setForm((f) => ({ ...f, cohort: e.target.value }))}
                      inputProps={{ maxLength: 50 }}
                    />
                  </Grid>
                </Grid>
                <TextField
                  label="Giới thiệu ngắn / Mục tiêu học kỳ"
                  placeholder="VD: Đang ôn CTDL & Giải thuật, mục tiêu GPA 3.6"
                  fullWidth
                  multiline
                  rows={3}
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  inputProps={{ maxLength: 200 }}
                  helperText={`${form.bio.length}/200`}
                />

                <Box>
                  <Typography variant="caption" color="text.secondary" mb={0.75} display="block">
                    Màu avatar
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    {AVATAR_COLORS.map((c) => (
                      <Box
                        key={c}
                        onClick={() => setForm((f) => ({ ...f, avatarColor: c }))}
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          bgcolor: c,
                          cursor: "pointer",
                          border: "2.5px solid",
                          borderColor:
                            form.avatarColor === c ? "text.primary" : "transparent",
                        }}
                      />
                    ))}
                  </Box>
                </Box>

                <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={profileSaving || !form.fullName.trim()}
                    startIcon={
                      profileSaving ? <CircularProgress size={16} /> : <SaveRoundedIcon />
                    }
                  >
                    {profileSaving ? "Đang lưu…" : "Lưu hồ sơ"}
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Đổi mật khẩu */}
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} mb={2}>
                Đổi mật khẩu
              </Typography>

              {pwError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {pwError}
                </Alert>
              )}
              {pwSuccess && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {pwSuccess}
                </Alert>
              )}

              <Box
                component="form"
                onSubmit={handleChangePassword}
                sx={{ display: "flex", flexDirection: "column", gap: 2 }}
              >
                <TextField
                  label="Mật khẩu hiện tại"
                  type="password"
                  fullWidth
                  value={pwForm.currentPassword}
                  onChange={(e) =>
                    setPwForm((f) => ({ ...f, currentPassword: e.target.value }))
                  }
                />
                <TextField
                  label="Mật khẩu mới"
                  type="password"
                  fullWidth
                  helperText="Tối thiểu 8 ký tự"
                  value={pwForm.newPassword}
                  onChange={(e) =>
                    setPwForm((f) => ({ ...f, newPassword: e.target.value }))
                  }
                />
                <TextField
                  label="Nhập lại mật khẩu mới"
                  type="password"
                  fullWidth
                  value={pwForm.confirmPassword}
                  onChange={(e) =>
                    setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))
                  }
                />
                <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
                  <Button
                    type="submit"
                    variant="outlined"
                    disabled={pwSaving}
                    startIcon={
                      pwSaving ? <CircularProgress size={16} /> : <LockResetRoundedIcon />
                    }
                  >
                    {pwSaving ? "Đang đổi…" : "Đổi mật khẩu"}
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
