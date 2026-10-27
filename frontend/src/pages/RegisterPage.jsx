import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";
import { register, clearError } from "../store/authSlice";

function validate(fullName, email, password) {
  const errs = {};
  if (!fullName || fullName.trim().length < 2) errs.fullName = "Họ tên tối thiểu 2 ký tự";
  if (!email) errs.email = "Vui lòng nhập email";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Email không hợp lệ";
  if (!password) errs.password = "Vui lòng nhập mật khẩu";
  else if (password.length < 12 || password.length > 128) errs.password = "Mật khẩu từ 12 đến 128 ký tự";
  return errs;
}

// Merge lỗi server (fieldErrors object) vào state fieldErrs
function serverToFieldErrs(err) {
  if (err && typeof err === "object" && err.fieldErrors) return err.fieldErrors;
  return {};
}

export default function RegisterPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status, error } = useSelector((s) => s.auth);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrs, setFieldErrs] = useState({});

  const loading = status === "loading";

  // Lỗi chung (không phải fieldErrors) — ví dụ 409 email trùng
  const globalError =
    error && typeof error === "object" && !Object.keys(error.fieldErrors || {}).length
      ? error.message
      : typeof error === "string"
      ? error
      : null;

  function handleChange(setter) {
    return (e) => {
      setter(e.target.value);
      if (error) dispatch(clearError());
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate(fullName, email, password);
    if (Object.keys(errs).length) {
      setFieldErrs(errs);
      return;
    }
    setFieldErrs({});
    const result = await dispatch(register({ email, password, fullName }));
    if (register.fulfilled.match(result)) {
      navigate("/login", { replace: true, state: { registered: true } });
    } else {
      // Hiện fieldErrors từ server nếu có
      const sErrs = serverToFieldErrs(result.payload);
      if (Object.keys(sErrs).length) setFieldErrs(sErrs);
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        p: 2,
      }}
    >
      <Card sx={{ width: "100%", maxWidth: 420 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" fontWeight={700} mb={0.5}>
            Tạo tài khoản
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            HomuLearn — không gian học tập sinh viên IUH
          </Typography>

          {globalError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {globalError}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              label="Họ và tên"
              value={fullName}
              onChange={handleChange(setFullName)}
              error={!!fieldErrs.fullName}
              helperText={fieldErrs.fullName}
              fullWidth
              size="small"
              sx={{ mb: 2 }}
              disabled={loading}
              autoComplete="name"
            />
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={handleChange(setEmail)}
              error={!!fieldErrs.email}
              helperText={fieldErrs.email}
              fullWidth
              size="small"
              sx={{ mb: 2 }}
              disabled={loading}
              autoComplete="email"
            />
            <TextField
              label="Mật khẩu"
              type="password"
              value={password}
              onChange={handleChange(setPassword)}
              error={!!fieldErrs.password}
              helperText={fieldErrs.password}
              fullWidth
              size="small"
              sx={{ mb: 3 }}
              disabled={loading}
              autoComplete="new-password"
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {loading ? "Đang đăng ký…" : "Đăng ký"}
            </Button>
          </Box>

          <Typography variant="body2" mt={2} textAlign="center">
            Đã có tài khoản?{" "}
            <Link to="/login" style={{ textDecoration: "none", color: "inherit", fontWeight: 600 }}>
              Đăng nhập
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
