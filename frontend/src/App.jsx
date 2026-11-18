import React, { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { ThemeProvider, CssBaseline, Alert } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { lightTheme, darkTheme } from "./theme/index";
import AppLayout from "./components/layout/AppLayout";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Dashboard from "./pages/Dashboard";
import Notes from "./pages/Notes";
import NoteDetail from "./pages/NoteDetail";
import Review from "./pages/Review";
import CalendarPage from "./pages/CalendarPage";
import Groups from "./pages/Groups";
import Community from "./pages/Community";
import Goals from "./pages/Goals";
import Pomodoro from "./pages/Pomodoro";
import ProfilePage from "./pages/ProfilePage";
import Admin from "./pages/Admin";
import { restoreSession } from "./store/authSlice";

export default function App() {
  const dispatch = useDispatch();
  const themeMode = useSelector((s) => s.ui?.themeMode || "light");
  const theme = themeMode === "dark" ? darkTheme : lightTheme;

  // Khôi phục phiên một lần khi app mount — gọi GET /api/v1/auth/me
  useEffect(() => {
    dispatch(restoreSession());
  }, [dispatch]);

  useEffect(() => {
    document.documentElement.style.colorScheme = themeMode;
    try {
      localStorage.setItem("themeMode", themeMode);
    } catch {
      /* Trình duyệt có thể chặn bộ nhớ cục bộ. */
    }
  }, [themeMode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        {/* Public routes — không cần đăng nhập */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes — bọc trong AppLayout */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/notes" element={<Notes />} />
                  <Route path="/notes/:id" element={<NoteDetail />} />
                  <Route path="/review" element={<Review />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route path="/pomodoro" element={<Pomodoro />} />
                  <Route path="/groups" element={<Groups />} />
                  <Route path="/community" element={<Community />} />
                  <Route
                    path="/chatbot"
                    element={
                      <Alert severity="info">
                        Tính năng Trợ giảng AI đang tạm khóa để hoàn thiện các tính năng cốt lõi.
                      </Alert>
                    }
                  />
                  <Route path="/goals" element={<Goals />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/admin" element={<Admin />} />
                </Routes>
              </AppLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </ThemeProvider>
  );
}
