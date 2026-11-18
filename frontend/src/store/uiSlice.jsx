import { createSlice } from "@reduxjs/toolkit";

function readThemePreference() {
  try {
    return localStorage.getItem("themeMode") === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

const uiSlice = createSlice({
  name: "ui",
  initialState: {
    themeMode: readThemePreference(),
    sidebarOpen: typeof window !== "undefined" && window.innerWidth >= 900,
  },
  reducers: {
    toggleTheme(state) {
      state.themeMode = state.themeMode === "light" ? "dark" : "light";
    },
    setSidebarOpen(state, action) {
      state.sidebarOpen = action.payload;
    },
  },
});

export const { toggleTheme, setSidebarOpen } = uiSlice.actions;
export default uiSlice.reducer;
