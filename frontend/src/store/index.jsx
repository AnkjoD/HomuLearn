import { configureStore } from "@reduxjs/toolkit";
import uiReducer from "./uiSlice";
import libraryReducer from "./librarySlice";
import authReducer from "./authSlice";
import notesReducer from "./notesSlice";
import goalsReducer from "./goalsSlice";
import pomodoroReducer from "./pomodoroSlice";
import dashboardReducer from "./dashboardSlice";
import communityReducer from "./communitySlice";

const store = configureStore({
  reducer: {
    ui: uiReducer,
    library: libraryReducer,
    auth: authReducer,
    notes: notesReducer,
    goals: goalsReducer,
    pomodoro: pomodoroReducer,
    dashboard: dashboardReducer,
    community: communityReducer,
  },
});

export default store;
