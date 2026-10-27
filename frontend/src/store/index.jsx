import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './uiSlice';
import libraryReducer from './librarySlice';
import authReducer from './authSlice';
import notesReducer from './notesSlice';

const store = configureStore({
  reducer: {
    ui: uiReducer,
    library: libraryReducer,
    auth: authReducer,
    notes: notesReducer,
  },
});

export default store;
