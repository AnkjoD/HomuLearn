import React from "react";
import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";

/**
 * ProtectedRoute — bọc các route cần đăng nhập
 *
 * - Trong khi restoreSession chạy (restoring=true): hiện spinner, không redirect
 *   → tránh flash redirect khi reload trang có session hợp lệ
 * - Sau khi restore xong: nếu user=null → redirect /login, giữ `from` để
 *   LoginPage có thể navigate về sau khi đăng nhập
 * - user có giá trị → render children
 */
export default function ProtectedRoute({ children }) {
  const { user, restoring } = useSelector((s) => s.auth);
  const location = useLocation();

  if (restoring) {
    return (
      <Box
        sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
