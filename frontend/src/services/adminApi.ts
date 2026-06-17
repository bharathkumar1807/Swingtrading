import { api } from "./api";

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  joinedAt: string;
  lastActiveAt: string | null;
  totalTrades: number;
  totalSessions: number;
  isActive: boolean;
  isApproved: boolean;
}

export interface PlatformStats {
  totalUsers: number;
  activeToday: number;
  activeThisWeek: number;
  totalTrades: number;
  totalPnl: number;
  topSymbols: string[];
}

export interface UserSummary {
  id: string;
  fullName: string;
  email: string;
  totalTrades: number;
  totalPnl: number;
  winRate: number;
  bestDay: number;
  worstDay: number;
  totalSessions: number;
  mostTradedSymbol: string | null;
}

export interface AdminTrade {
  id: string;
  symbol: string;
  sector: string;
  strategy: string;
  broker: string;
  positionType: string;
  pnl: number;
  rMultiple: number;
  riskAmount: number;
  rewardAmount: number;
  outcome: string;
  entryDate: string;
  exitDate: string | null;
  entryPrice: number;
  exitPrice: number | null;
  stopLoss: number;
  size: number;
  fees: number;
  slippage: number;
  confidenceScore: number;
  notes: string | null;
  tags: string[];
  mistakes: string[];
}

export const adminApi = {
  getUsers: () => api.get<AdminUser[]>("/admin/users").then((r) => r.data),
  getPendingUsers: () => api.get<AdminUser[]>("/admin/pending-users").then((r) => r.data),
  getPlatformStats: () => api.get<PlatformStats>("/admin/platform-stats").then((r) => r.data),
  getUserSummary: (userId: string) => api.get<UserSummary>(`/admin/users/${userId}/summary`).then((r) => r.data),
  getUserTrades: (userId: string) => api.get<AdminTrade[]>(`/admin/users/${userId}/trades`).then((r) => r.data),
  toggleUserStatus: (userId: string) => api.post<AdminUser>(`/admin/users/${userId}/toggle-status`).then((r) => r.data),
  approveUser: (userId: string) => api.post<AdminUser>(`/admin/users/${userId}/approve`).then((r) => r.data),
  changePassword: (userId: string, newPassword: string) =>
    api.post(`/admin/users/${userId}/change-password`, { newPassword }),
  updateUserName: (userId: string, fullName: string) =>
    api.patch<AdminUser>(`/admin/users/${userId}/name`, { fullName }).then((r) => r.data),
};
