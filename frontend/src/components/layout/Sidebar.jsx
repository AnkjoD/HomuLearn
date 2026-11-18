import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { alpha } from "@mui/material/styles";
import {
  Avatar,
  Box,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { setSidebarOpen } from "../../store/uiSlice";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import QuizRoundedIcon from "@mui/icons-material/QuizRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import ForumRoundedIcon from "@mui/icons-material/ForumRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import TimerRoundedIcon from "@mui/icons-material/TimerRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";

export const SIDEBAR_WIDTH = 248;
export const SIDEBAR_COLLAPSED = 80;
const navigationItems = [
  { label: "Tổng quan", icon: DashboardRoundedIcon, path: "/" },
  { label: "Ghi chú", icon: MenuBookRoundedIcon, path: "/notes" },
  { label: "Ôn tập", icon: QuizRoundedIcon, path: "/review" },
  { label: "Pomodoro", icon: TimerRoundedIcon, path: "/pomodoro" },
  { label: "Nhóm học", icon: GroupsRoundedIcon, path: "/groups" },
  { label: "Cộng đồng", icon: ForumRoundedIcon, path: "/community" },
  { label: "Mục tiêu", icon: EmojiEventsRoundedIcon, path: "/goals" },
  { label: "Hồ sơ", icon: PersonRoundedIcon, path: "/profile" },
];

export default function Sidebar({ open }) {
  const location = useLocation();
  const dispatch = useDispatch();
  const isMobile = useMediaQuery("(max-width:899px)");
  const themeMode = useSelector((state) => state.ui.themeMode);
  const user = useSelector((state) => state.auth.user);
  const visibleItems =
    user?.role === "ADMIN"
      ? [
          ...navigationItems,
          { label: "Quản trị", icon: AdminPanelSettingsRoundedIcon, path: "/admin" },
        ]
      : navigationItems;
  const showLabels = isMobile || open;
  const width = showLabels ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED;
  const closeOnMobile = () => {
    if (isMobile) dispatch(setSidebarOpen(false));
  };

  return (
    <Drawer
      variant={isMobile ? "temporary" : "permanent"}
      open={isMobile ? open : true}
      onClose={closeOnMobile}
      sx={{
        width: isMobile ? 0 : width,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width,
          boxSizing: "border-box",
          borderColor: "divider",
          bgcolor: "background.paper",
          px: 1.5,
          transition: "width 200ms",
        },
      }}
    >
      <Toolbar
        disableGutters
        sx={{ gap: 1.2, px: 1, minHeight: "88px !important" }}
      >
        <Box
          component="img"
          src="/favicon.svg"
          alt=""
          sx={{ width: 38, height: 38, flexShrink: 0 }}
        />
        {showLabels && (
          <Box>
            <Typography
              fontWeight={800}
              sx={{ letterSpacing: "-0.06em", fontSize: 22 }}
            >
              HomuLearn<span style={{ color: "#BC7796" }}>.</span>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Một chút mỗi ngày, xa hơn mỗi bước
            </Typography>
          </Box>
        )}
      </Toolbar>
      <Divider />
      {showLabels && (
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ px: 2, pt: 3, pb: 1, fontSize: 10, letterSpacing: "0.15em" }}
        >
          KHÔNG GIAN CỦA BẠN
        </Typography>
      )}
      <List sx={{ pt: showLabels ? 0 : 3 }}>
        {visibleItems.map((item, index) => {
          const isActive =
            item.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.path);
          const NavigationIcon = item.icon;
          return (
            <Tooltip
              title={showLabels ? "" : item.label}
              placement="right"
              key={item.path}
            >
              <ListItemButton
                component={NavLink}
                to={item.path}
                selected={isActive}
                onClick={closeOnMobile}
                sx={{
                  mb: 0.7,
                  mt: index === 5 ? 2.5 : 0,
                  py: 1.25,
                  px: 1.5,
                  color: isActive ? "primary.main" : "text.secondary",
                  "&.Mui-selected": {
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                  },
                  "&.Mui-selected:hover": {
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.15),
                  },
                }}
              >
                <ListItemIcon
                  sx={{ minWidth: showLabels ? 36 : 0, color: "inherit" }}
                >
                  <NavigationIcon sx={{ fontSize: 21 }} />
                </ListItemIcon>
                {showLabels && (
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontWeight: isActive ? 700 : 500,
                      fontSize: 13,
                    }}
                  />
                )}
                {showLabels && isActive && (
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      bgcolor: "primary.main",
                    }}
                  />
                )}
              </ListItemButton>
            </Tooltip>
          );
        })}
      </List>
      <Box sx={{ mt: "auto", pb: 2 }}>
        {showLabels && (
          <Box
            sx={{
              p: 2,
              mb: 2,
              borderRadius: 3,
              bgcolor: "background.subtle",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography variant="body2" fontWeight={700}>
              {themeMode === "dark" ? "☾ Homura" : "✿ Madoka"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {themeMode === "dark"
                ? "Tĩnh lặng để tập trung, bền bỉ để tiến xa."
                : "Giữ một chút hy vọng trong mỗi điều bạn học."}
            </Typography>
          </Box>
        )}
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ display: "flex", gap: 1.2, px: 1, alignItems: "center" }}>
          <Avatar
            sx={{
              width: 34,
              height: 34,
              bgcolor: "background.subtle",
              color: "primary.main",
              fontSize: 12,
            }}
          >
            NN
          </Avatar>
          {showLabels && (
            <Box>
              <Typography variant="body2" fontWeight={600}>
                Nguyễn Nam
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Sinh viên · IUH
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Drawer>
  );
}
