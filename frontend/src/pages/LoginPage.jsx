import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useLocation, Link } from "react-router-dom";
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
import { login } from "../store/authSlice";

// Validation client-side đơn giản — server vẫn validate lại
function validate(email, password) {
  const errs = {};
  if (!email) errs.email = "Vui lòng nhập email";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Email không hợp lệ";
  if (!password) errs.password = "Vui lòng nhập mật khẩu";
  else if (password.length < 6) errs.password = "Mật khẩu tối thiểu 6 ký tự";
  return errs;
}

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrs, setFieldErrs] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showRegisteredNotice, setShowRegisteredNotice] = useState(
    Boolean(location.state?.registered)
  );

  function handleChange(setter) {
    return (e) => {
      setter(e.target.value);
      // Xóa lỗi form khi user bắt đầu sửa
      if (error) setError(null);
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setShowRegisteredNotice(false);
    const errs = validate(email, password);
    if (Object.keys(errs).length) {
      setFieldErrs(errs);
      return;
    }
    setFieldErrs({});
    setError(null);
    setLoading(true);
    try {
      const result = await dispatch(login({ email, password }));
      if (login.fulfilled.match(result)) {
        navigate("/", { replace: true });
      } else {
        setError(
          typeof result.payload === "string"
            ? result.payload
            : "Đăng nhập thất bại"
        );
      }
    } finally {
      setLoading(false);
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
      <Card sx={{ width: "100%", maxWidth: 400 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" fontWeight={700} mb={0.5}>
            Đăng nhập
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Không gian học tập HomuLearn
          </Typography>

          {showRegisteredNotice && !error && (
            <Alert severity="success" sx={{ mb: 2 }}>Đã tạo tài khoản. Vui lòng đăng nhập.</Alert>
          )}
          {error && typeof error === "string" && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
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
              autoComplete="current-password"
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {loading ? "Đang đăng nhập…" : "Đăng nhập"}
            </Button>
          </Box>

          <Typography variant="body2" mt={2} textAlign="center">
            Chưa có tài khoản?{" "}
            <Link to="/register" style={{ textDecoration: "none", color: "inherit", fontWeight: 600 }}>
              Đăng ký
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
