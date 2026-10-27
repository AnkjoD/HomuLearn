import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './uiSlice';
import libraryReducer from './librarySlice';
import authReducer from './authSlice';

const store = configureStore({
  reducer: {
    ui: uiReducer,
    library: libraryReducer,
    auth: authReducer,
  },
});

export default store;
