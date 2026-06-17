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

export interface DailyPnl {
  date: string;
  pnl: number;
  tradeCount: number;
  wins: number;
  losses: number;
}

export interface ExtendedKpis {
  profitFactor: number;
  expectancy: number;
  maxDrawdown: number;
  currentStreak: number;
  maxWinStreak: number;
  maxLossStreak: number;
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
  extendedKpis?: ExtendedKpis;
  equityCurve: ChartPoint[];
  sectorAllocation: ChartPoint[];
  weeklyPerformance: ChartPoint[];
  monthlyPerformance: ChartPoint[];
  dailyCalendar?: DailyPnl[];
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

export interface IntradayExecution {
  id: string;
  symbol: string;
  companyName: string;
  side: "Buy" | "Sell";
  price: number;
  quantity: number;
  principal: number;
  fees: number;
  netAmount: number;
  tradeDate: string;
  sequenceOrder: number;
  intradayTradeId?: string;
}

export interface IntradayTradeEntry {
  id: string;
  symbol: string;
  companyName: string;
  totalBuyQty: number;
  totalSellQty: number;
  avgBuyPrice: number;
  avgSellPrice: number;
  matchedQty: number;
  pnl: number;
  openBuyQty: number;
  priorPositionSellQty: number;
  isFullyClosed: boolean;
  outcome: "Win" | "Loss" | "Breakeven" | "Open";
  executions: IntradayExecution[];
}

export interface IntradaySessionSummary {
  id: string;
  sessionDate: string;
  broker: string;
  totalPnl: number;
  winCount: number;
  lossCount: number;
  totalExecutions: number;
  symbols: string[];
}

export interface IntradaySession {
  id: string;
  sessionDate: string;
  broker: string;
  totalPnl: number;
  winCount: number;
  lossCount: number;
  breakevenCount: number;
  totalExecutions: number;
  symbols: string[];
  intradayTrades: IntradayTradeEntry[];
}

export interface IntradayPreview {
  sessionDate: string;
  broker: string;
  totalExecutions: number;
  trades: IntradayTradeEntry[];
}

export type MarketDirection = "TrendingUp" | "TrendingDown" | "Choppy" | "RangeBound";
export type SectorBehavior = "Strong" | "Weak" | "Mixed";
export type DailyPlanOutcome = "Win" | "Loss" | "Breakeven" | "Skipped";
export type DailyResultVsPlan = "FollowedPlan" | "BrokeRule" | "Partial";
export type LegAction = "Buy" | "Sell";
export type LegType = "Entry" | "AddToPosition" | "PartialExit" | "StopLossExit" | "FullExit";

export interface DailyPlanLeg {
  id: string;
  time: string;
  action: LegAction;
  legType: LegType;
  quantity: number;
  price: number;
  realizedPnl: number;
  notes?: string;
}

export interface DailyStockPlan {
  id: string;
  date: string;
  symbol: string;
  stopLossPrice: number;
  avgEntryPrice: number;
  openQty: number;
  realizedPnl: number;
  pnl: number;
  isClosed: boolean;
  maxLossAllowed: number;
  marketDirection: MarketDirection;
  sectorBehavior: SectorBehavior;
  outcome: DailyPlanOutcome;
  resultVsPlan: DailyResultVsPlan;
  behaviorNotes?: string;
  entryTime?: string;
  legs: DailyPlanLeg[];
}

export interface SymbolWeeklyStats {
  symbol: string;
  wins: number;
  losses: number;
  skipped: number;
  ruleBreaks: number;
  totalPnl: number;
  winRate: number;
}

export interface WeeklyPlanStats {
  weekStart: string;
  weekEnd: string;
  symbolStats: SymbolWeeklyStats[];
  totalTrades: number;
  totalWins: number;
  totalLosses: number;
  ruleBreaks: number;
  totalPnl: number;
  winRate: number;
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
