import { createSlice } from "@reduxjs/toolkit";

interface UiState {
  darkMode: boolean;
  accentColor: string;
}

const initialState: UiState = {
  darkMode: localStorage.getItem("theme") === "dark",
  accentColor: localStorage.getItem("accent") || "#059669",
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setDarkMode(state, action) {
      state.darkMode = action.payload;
      localStorage.setItem("theme", action.payload ? "dark" : "light");
      document.documentElement.classList.toggle("dark", action.payload);
    },
    setAccentColor(state, action) {
      state.accentColor = action.payload;
      localStorage.setItem("accent", action.payload);
      document.documentElement.style.setProperty("--primary", action.payload);
    },
  },
});

export const { setDarkMode, setAccentColor } = uiSlice.actions;
export default uiSlice.reducer;
