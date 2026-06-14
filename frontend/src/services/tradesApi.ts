import { api } from "@/services/api";
import type { Dashboard, MistakeAnalytics, PagedResult, Review, StrategyMetric, Trade } from "@/types";

export interface TradeFilters {
  search?: string;
  sector?: string;
  strategy?: string;
  broker?: string;
  mistake?: string;
  profitLoss?: string;
  page?: number;
  pageSize?: number;
}

export type UpsertTrade = Omit<Trade, "id" | "pnl" | "rMultiple" | "riskAmount" | "rewardAmount" | "outcome">;

export interface ImportedTrade {
  symbol: string;
  broker: string;
  action: string;
  transactionDate: string;
  quantity: number;
  price: number;
  amount: number;
  description: string;
  strategy: string;
  sector: string;
}

export interface OpenLot {
  tradeId: string;
  symbol: string;
  remainingQuantity: number;
  entryPrice: number;
  entryDate: string;
}

export interface ImportCreateRow {
  symbol: string;
  broker: string;
  sector: string;
  strategy: string;
  confidenceScore: number;
  notes: string;
  tags: string[];
  entryPrice: number;
  exitPrice?: number;
  stopLoss: number;
  size: number;
  mistakes: string[];
  positionType: "Long" | "Short";
  entryDate: string;
  exitDate?: string;
}

export const tradesApi = {
  list: async (filters: TradeFilters = {}) => (await api.get<PagedResult<Trade>>("/trades", { params: filters })).data,
  create: async (trade: UpsertTrade) => (await api.post<Trade>("/trades", trade)).data,
  update: async (id: string, trade: UpsertTrade) => (await api.put<Trade>(`/trades/${id}`, trade)).data,
  remove: async (id: string) => api.delete(`/trades/${id}`),
  reset: async () => api.delete("/trades/reset"),
  uploadScreenshot: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return (await api.post<{ url: string }>("/uploads/trade-screenshot", form)).data;
  },
  dashboard: async () => (await api.get<Dashboard>("/analytics/dashboard")).data,
  strategies: async () => (await api.get<StrategyMetric[]>("/analytics/strategies")).data,
  mistakes: async () => (await api.get<MistakeAnalytics>("/analytics/mistakes")).data,
  review: async () => (await api.get<Review>("/analytics/review")).data,
  exportCsv: async (ids?: string[]) => (await api.post("/exports/csv", { ids }, { responseType: "blob" })).data as Blob,
  exportJson: async (ids?: string[]) => (await api.post("/exports/json", { ids }, { responseType: "blob" })).data as Blob,
  previewStatement: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return (await api.post<ImportedTrade[]>("/imports/statement-preview", form)).data;
  },
  importStatement: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return (await api.post<{ importedCount: number; trades: Trade[] }>("/imports/statement-import", form)).data;
  },
  openLots: async () => (await api.get<OpenLot[]>("/imports/open-lots")).data,
  importRows: async (rows: ImportCreateRow[]) => (await api.post<{ importedCount: number; trades: Trade[] }>("/imports/rows", { rows })).data,
};
