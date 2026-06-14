import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/store/authSlice";
import tradesReducer from "@/store/tradesSlice";
import uiReducer from "@/store/uiSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    trades: tradesReducer,
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
