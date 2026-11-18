import React from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  AppBar,
  Toolbar,
  IconButton,
  Box,
  Tooltip,
  Typography,
  Button,
  Avatar,
} from "@mui/material";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { useLocation, useNavigate } from "react-router-dom";
import { toggleTheme, setSidebarOpen } from "../../store/uiSlice";
import { logout } from "../../store/authSlice";
import { SIDEBAR_WIDTH, SIDEBAR_COLLAPSED } from "./Sidebar";

const pageTitles = {
  notes: "Ghi chú",
  review: "Ôn tập",
  calendar: "Lịch & Công việc",
  pomodoro: "Pomodoro",
  groups: "Nhóm học",
  community: "Cộng đồng",
  chatbot: "Trợ giảng AI",
  goals: "Mục tiêu",
  profile: "Hồ sơ cá nhân",
  admin: "Quản trị",
};

// Avatar initials từ fullName
function initials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export default function Topbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { themeMode, sidebarOpen } = useSelector((state) => state.ui);
  const user = useSelector((s) => s.auth.user);
  const location = useLocation();
  const pageTitle = pageTitles[location.pathname.split("/")[1]] || "Tổng quan";
  const sidebarWidth = sidebarOpen ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED;
  const isDark = themeMode === "dark";

  function handleLogout() {
    dispatch(logout());
    // navigate("/login") không cần — ProtectedRoute tự redirect khi user=null
  }

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        bgcolor: "background.paper",
        color: "text.primary",
        borderBottom: "1px solid",
        borderColor: "divider",
        ml: { xs: 0, md: `${sidebarWidth}px` },
        width: { xs: "100%", md: `calc(100% - ${sidebarWidth}px)` },
        transition: "width 200ms, margin 200ms",
      }}
    >
      <Toolbar
        sx={{
          minHeight: "76px !important",
          gap: 1.5,
          px: { xs: 2, md: "32px !important" },
        }}
      >
        <Tooltip title="Đóng / mở thanh điều hướng">
          <IconButton
            aria-label="Đóng hoặc mở thanh điều hướng"
            onClick={() => dispatch(setSidebarOpen(!sidebarOpen))}
          >
            <MenuRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ display: { xs: "none", sm: "block" } }}
        >
          Không gian học tập{" "}
          <Box component="span" sx={{ mx: 1.5, color: "divider" }}>
            /
          </Box>
          <Box component="span" sx={{ color: "text.primary", fontWeight: 600 }}>
            {pageTitle}
          </Box>
        </Typography>
        <Box sx={{ flex: 1 }} />

        {/* Tên user + avatar */}
        {user && (
          <Tooltip title="Xem & sửa hồ sơ cá nhân">
            <Box
              onClick={() => navigate("/profile")}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                cursor: "pointer",
                px: 1,
                py: 0.5,
                borderRadius: 2,
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              <Avatar
                sx={{
                  width: 30,
                  height: 30,
                  fontSize: 13,
                  bgcolor: user.avatarColor || "primary.main",
                }}
              >
                {initials(user.fullName)}
              </Avatar>
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{ display: { xs: "none", md: "block" }, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {user.fullName}
              </Typography>
            </Box>
          </Tooltip>
        )}

        <Tooltip
          title={
            isDark
              ? "Chuyển sang Madoka · chế độ sáng"
              : "Chuyển sang Homura · chế độ tối"
          }
        >
          <Button
            aria-label={
              isDark ? "Bật chế độ sáng Madoka" : "Bật chế độ tối Homura"
            }
            onClick={() => dispatch(toggleTheme())}
            variant="outlined"
            size="small"
            startIcon={
              isDark ? <DarkModeRoundedIcon /> : <LightModeRoundedIcon />
            }
            sx={{ borderRadius: 8, px: 1.8 }}
          >
            {isDark ? "Homura" : "Madoka"}
          </Button>
        </Tooltip>

        {/* Nút đăng xuất */}
        {user && (
          <Tooltip title="Đăng xuất">
            <IconButton aria-label="Đăng xuất" onClick={handleLogout} size="small">
              <LogoutRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Toolbar>
    </AppBar>
  );
}
