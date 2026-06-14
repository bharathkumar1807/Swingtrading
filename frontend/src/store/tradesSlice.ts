import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { tradesApi, type TradeFilters } from "@/services/tradesApi";
import type { PagedResult, Trade } from "@/types";

interface TradesState {
  data: PagedResult<Trade>;
  selectedIds: string[];
  loading: boolean;
}

const initialState: TradesState = {
  data: { items: [], total: 0, page: 1, pageSize: 20 },
  selectedIds: [],
  loading: false,
};

export const fetchTrades = createAsyncThunk("trades/fetch", async (filters: TradeFilters) => tradesApi.list(filters));

const tradesSlice = createSlice({
  name: "trades",
  initialState,
  reducers: {
    toggleSelected(state, action) {
      state.selectedIds = state.selectedIds.includes(action.payload)
        ? state.selectedIds.filter((id) => id !== action.payload)
        : [...state.selectedIds, action.payload];
    },
    clearSelected(state) {
      state.selectedIds = [];
    },
    setSelected(state, action) {
      state.selectedIds = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTrades.pending, (state) => { state.loading = true; })
      .addCase(fetchTrades.fulfilled, (state, action) => { state.loading = false; state.data = action.payload; })
      .addCase(fetchTrades.rejected, (state) => { state.loading = false; });
  },
});

export const { toggleSelected, clearSelected, setSelected } = tradesSlice.actions;
export default tradesSlice.reducer;
