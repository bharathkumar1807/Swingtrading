import { api } from "@/services/api";
import type { DailyStockPlan, WeeklyPlanStats } from "@/types";

export interface CreatePlanRequest {
  date: string;
  symbol: string;
  stopLossPrice: number;
  maxLossAllowed: number;
  marketDirection: string;
  sectorBehavior: string;
  outcome: string;
  resultVsPlan: string;
  behaviorNotes?: string;
  entryTime?: string;
}

export interface UpdatePlanRequest {
  stopLossPrice: number;
  maxLossAllowed: number;
  marketDirection: string;
  sectorBehavior: string;
  outcome: string;
  resultVsPlan: string;
  behaviorNotes?: string;
  entryTime?: string;
}

export interface AddLegRequest {
  time: string;
  action: string;
  legType: string;
  quantity: number;
  price: number;
  notes?: string;
}

export const dailyPlanApi = {
  getByDate: async (date: string): Promise<DailyStockPlan[]> =>
    (await api.get<DailyStockPlan[]>("/daily-plan", { params: { date } })).data,

  getRange: async (from: string, to: string): Promise<DailyStockPlan[]> =>
    (await api.get<DailyStockPlan[]>("/daily-plan/range", { params: { from, to } })).data,

  getWeeklyStats: async (weekStart: string): Promise<WeeklyPlanStats> =>
    (await api.get<WeeklyPlanStats>("/daily-plan/weekly-stats", { params: { weekStart } })).data,

  create: async (req: CreatePlanRequest): Promise<DailyStockPlan> =>
    (await api.post<DailyStockPlan>("/daily-plan", req)).data,

  update: async (id: string, req: UpdatePlanRequest): Promise<DailyStockPlan> =>
    (await api.put<DailyStockPlan>(`/daily-plan/${id}`, req)).data,

  delete: async (id: string): Promise<void> => {
    await api.delete(`/daily-plan/${id}`);
  },

  addLeg: async (planId: string, req: AddLegRequest): Promise<DailyStockPlan> =>
    (await api.post<DailyStockPlan>(`/daily-plan/${planId}/legs`, req)).data,

  deleteLeg: async (legId: string): Promise<DailyStockPlan> =>
    (await api.delete<DailyStockPlan>(`/daily-plan/legs/${legId}`)).data,

  importFromSession: async (date: string, symbol?: string): Promise<DailyStockPlan[]> =>
    (await api.post<DailyStockPlan[]>("/daily-plan/import-from-session", { date, symbol: symbol ?? null })).data,
};
