import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "@/services/api";

interface AuthState {
  user?: { id: string; email: string; fullName: string };
  loading: boolean;
  error?: string;
}

const initialState: AuthState = {
  user: JSON.parse(localStorage.getItem("user") || "null") ?? undefined,
  loading: false,
};

function authError(error: unknown) {
  if (typeof error === "object" && error && "response" in error) {
    const data = (error as { response?: { data?: unknown } }).response?.data;
    if (typeof data === "string") return data;
    if (data && typeof data === "object" && "error" in data && typeof (data as Record<string, unknown>).error === "string")
      return (data as { error: string }).error;
  }
  return "Could not reach the API. Start the backend, then try again.";
}

export const login = createAsyncThunk("auth/login", async (payload: { email: string; password: string }, { rejectWithValue }) => {
  try {
    const { data } = await api.post("/auth/login", payload);
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    localStorage.setItem("user", JSON.stringify(data.user));
    return data.user as AuthState["user"];
  } catch (error) {
    return rejectWithValue(authError(error));
  }
});

export const register = createAsyncThunk("auth/register", async (payload: { email: string; password: string; fullName: string }, { rejectWithValue }) => {
  try {
    const { data } = await api.post("/auth/register", payload);
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    localStorage.setItem("user", JSON.stringify(data.user));
    return data.user as AuthState["user"];
  } catch (error) {
    return rejectWithValue(authError(error));
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      state.user = undefined;
      localStorage.clear();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => { state.loading = true; })
      .addCase(login.fulfilled, (state, action) => { state.loading = false; state.error = undefined; state.user = action.payload; })
      .addCase(login.rejected, (state, action) => { state.loading = false; state.error = String(action.payload ?? "Login failed."); })
      .addCase(register.pending, (state) => { state.loading = true; })
      .addCase(register.fulfilled, (state, action) => { state.loading = false; state.error = undefined; state.user = action.payload; })
      .addCase(register.rejected, (state, action) => { state.loading = false; state.error = String(action.payload ?? "Registration failed."); });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
