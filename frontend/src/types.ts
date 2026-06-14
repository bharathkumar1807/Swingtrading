export type PositionType = "Long" | "Short" | 0 | 1;
export type TradeOutcome = "Open" | "Win" | "Loss" | "Breakeven" | 0 | 1 | 2 | 3;

export interface Trade {
  id: string;
  symbol: string;
  sector: string;
  broker: string;
  strategy: string;
  confidenceScore: number;
  notes?: string;
  screenshotUrl?: string;
  tags: string[];
  entryPrice: number;
  exitPrice?: number;
  stopLoss: number;
  size: number;
  fees: number;
  slippage: number;
  pnl: number;
  rMultiple: number;
  riskAmount: number;
  rewardAmount: number;
  mistakes: string[];
  positionType: PositionType;
  outcome: TradeOutcome;
  entryDate: string;
  exitDate?: string;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ChartPoint {
  label: string;
  value: number;
}

export interface StrategyMetric {
  strategy: string;
  trades: number;
  winRate: number;
  pnl: number;
  averageRMultiple: number;
}

export interface Dashboard {
  kpis: {
    winRate: number;
    totalProfit: number;
    totalLoss: number;
    averageRMultiple: number;
    totalTrades: number;
  };
  equityCurve: ChartPoint[];
  sectorAllocation: ChartPoint[];
  weeklyPerformance: ChartPoint[];
  monthlyPerformance: ChartPoint[];
  topWinners: TradePerformanceRow[];
  topLosers: TradePerformanceRow[];
  strategies: StrategyMetric[];
  riskReward: {
    averageRisk: number;
    averageReward: number;
    averageRiskRewardRatio: number;
  };
}

export interface TradePerformanceRow {
  id: string;
  symbol: string;
  strategy: string;
  pnl: number;
  rMultiple: number;
  entryDate: string;
}

export interface MistakeAnalytics {
  frequency: ChartPoint[];
  heatmap: { day: string; hour: number; count: number }[];
  breakdown: { mistake: string; count: number; pnlImpact: number }[];
  insights: string[];
}

export interface Review {
  weekly: {
    winRate: number;
    pnl: number;
    bestTrades: TradePerformanceRow[];
    worstTrades: TradePerformanceRow[];
    ruleViolations: string[];
  };
  monthly: {
    mostProfitableStrategy: string;
    biggestLeak: string;
    improvementVsLastMonth: number;
  };
  actionPrompts: string[];
}
