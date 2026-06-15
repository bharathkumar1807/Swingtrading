import { useEffect, useState } from "react";
import {
  Activity, CalendarDays, Flame, Percent, Scale, Sigma, TrendingDown, TrendingUp, Zap
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { CalendarHeatmap } from "@/components/dashboard/CalendarHeatmap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, LoadingState } from "@/components/common/StateViews";
import { tradesApi } from "@/services/tradesApi";
import type { Dashboard } from "@/types";
import { currency, percent } from "@/lib/utils";

const SECTOR_COLORS = ["#059669", "#2563eb", "#f59e0b", "#db2777", "#7c3aed", "#0f766e"];

export function DashboardPage() {
  const [data, setData] = useState<Dashboard>();
  const [loading, setLoading] = useState(true);
  useEffect(() => { tradesApi.dashboard().then(setData).finally(() => setLoading(false)); }, []);
  if (loading) return <LoadingState />;
  if (!data || data.kpis.totalTrades === 0)
    return <EmptyState title="No trades yet" description="Add your first trade to activate dashboard analytics, equity curves, and review summaries." />;

  const { kpis, extendedKpis, equityCurve, sectorAllocation, weeklyPerformance, strategies, dailyCalendar } = data;

  const streak = extendedKpis.currentStreak;
  const streakLabel = streak === 0 ? "—" : streak > 0 ? `${streak}W` : `${Math.abs(streak)}L`;
  const streakPositive = streak >= 0;

  return (
    <div className="space-y-6">
      {/* Row 1: Core KPIs */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Win rate" value={percent(kpis.winRate)} icon={Percent} />
        <KpiCard label="Total profit" value={currency.format(kpis.totalProfit)} icon={TrendingUp} />
        <KpiCard label="Total loss" value={currency.format(kpis.totalLoss)} icon={TrendingDown} positive={false} />
        <KpiCard label="Avg R-multiple" value={`${kpis.averageRMultiple.toFixed(2)}R`} icon={Scale} />
        <KpiCard label="Total trades" value={String(kpis.totalTrades)} icon={Sigma} />
      </section>

      {/* Row 2: Advanced stats */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatBadge
          label="Profit factor"
          value={extendedKpis.profitFactor >= 99 ? "∞" : extendedKpis.profitFactor.toFixed(2)}
          sub="gross win / gross loss"
          positive={extendedKpis.profitFactor >= 1.5}
          neutral={extendedKpis.profitFactor >= 1 && extendedKpis.profitFactor < 1.5}
          icon={<Zap size={16} />}
        />
        <StatBadge
          label="Expectancy"
          value={`${extendedKpis.expectancy >= 0 ? "+" : ""}${extendedKpis.expectancy.toFixed(2)}R`}
          sub="avg R per trade"
          positive={extendedKpis.expectancy > 0}
          icon={<Scale size={16} />}
        />
        <StatBadge
          label="Max drawdown"
          value={currency.format(extendedKpis.maxDrawdown)}
          sub="peak-to-trough"
          positive={false}
          icon={<TrendingDown size={16} />}
        />
        <StatBadge
          label="Current streak"
          value={streakLabel}
          sub={`Best: ${extendedKpis.maxWinStreak}W · Worst: ${extendedKpis.maxLossStreak}L`}
          positive={streakPositive}
          icon={<Flame size={16} />}
        />
      </section>

      {/* Row 3: Equity curve + Sector */}
      <section className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity size={18} className="text-emerald-600" /> Equity curve
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <AreaChart data={equityCurve}>
                <defs>
                  <linearGradient id="equity" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => currency.format(v)} />
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="value" stroke="#059669" fill="url(#equity)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Sector allocation</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={sectorAllocation} dataKey="value" nameKey="label" innerRadius={65} outerRadius={105}>
                  {sectorAllocation.map((_, i) => <Cell key={i} fill={SECTOR_COLORS[i % SECTOR_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      {/* Row 4: P&L Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays size={18} className="text-blue-600" /> P&L Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CalendarHeatmap data={dailyCalendar} />
        </CardContent>
      </Card>

      {/* Row 5: Weekly + Strategy */}
      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Weekly performance</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer>
              <BarChart data={weeklyPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => currency.format(v)} />
                <ReferenceLine y={0} stroke="#94a3b8" />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {weeklyPerformance.map((p, i) => (
                    <Cell key={i} fill={p.value >= 0 ? "#059669" : "#e11d48"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Strategy performance</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {strategies.slice(0, 7).map((s) => (
                <div
                  key={s.strategy}
                  className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2.5"
                >
                  <div>
                    <span className="text-sm font-semibold">{s.strategy}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{s.trades}T · {s.winRate.toFixed(0)}% WR</span>
                  </div>
                  <span className={`text-sm font-black ${s.pnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {s.pnl >= 0 ? "+" : ""}{currency.format(s.pnl)} · {s.averageRMultiple.toFixed(2)}R
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function StatBadge({
  label, value, sub, positive, neutral = false, icon,
}: {
  label: string;
  value: string;
  sub: string;
  positive: boolean;
  neutral?: boolean;
  icon: React.ReactNode;
}) {
  const valueColor = neutral
    ? "text-amber-500"
    : positive
    ? "text-emerald-600"
    : "text-rose-600";

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <div className={`text-2xl font-black tabular-nums ${valueColor}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}
