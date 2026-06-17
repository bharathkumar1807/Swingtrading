import { useCallback, useEffect, useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Minus, BarChart2, Clock, Target, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dailyPlanApi } from "@/services/dailyPlanApi";
import { currency } from "@/lib/utils";
import type { DailyStockPlan } from "@/types";

// ── Constants ──────────────────────────────────────────────────────────────

type Range = "7D" | "30D" | "3M";
const RANGES: Range[] = ["7D", "30D", "3M"];
const RANGE_DAYS: Record<Range, number> = { "7D": 7, "30D": 30, "3M": 90 };

const DIRECTIONS = ["TrendingUp", "TrendingDown", "Choppy", "RangeBound"] as const;
const DIRECTION_LABELS: Record<string, string> = {
  TrendingUp: "Trending Up", TrendingDown: "Trending Down",
  Choppy: "Choppy", RangeBound: "Range-bound",
};

const TIME_BUCKETS = ["9:30–10 AM", "10–11 AM", "11 AM–1 PM", "After 1 PM"];

// ── Utilities ──────────────────────────────────────────────────────────────

function todayIso() { return new Date().toISOString().split("T")[0]; }

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function fmtDate(iso: string): { label: string; dow: string } {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return {
    label: dt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    dow: dt.toLocaleDateString("en-US", { weekday: "short" }),
  };
}

function fmtTime(t?: string): string | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function timeBucket(t?: string): string {
  if (!t) return "No time";
  const [h, m] = t.split(":").map(Number);
  const mins = h * 60 + m;
  if (mins < 10 * 60) return "9:30–10 AM";
  if (mins < 11 * 60) return "10–11 AM";
  if (mins < 13 * 60) return "11 AM–1 PM";
  return "After 1 PM";
}

function avgTimeStr(times: string[]): string | null {
  if (times.length === 0) return null;
  const total = times.reduce((s, t) => {
    const [h, m] = t.split(":").map(Number);
    return s + h * 60 + m;
  }, 0);
  const avg = Math.round(total / times.length);
  const h = Math.floor(avg / 60);
  const m = avg % 60;
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

// ── Stats aggregation ──────────────────────────────────────────────────────

function computeStats(plans: DailyStockPlan[]) {
  const executed = plans.filter((p) => p.outcome !== "Skipped");
  const wins = executed.filter((p) => p.outcome === "Win");
  const losses = executed.filter((p) => p.outcome === "Loss");
  const ruleBreaks = plans.filter((p) => p.resultVsPlan === "BrokeRule");

  // Group by date
  const byDate: Record<string, DailyStockPlan[]> = {};
  for (const p of plans) {
    (byDate[p.date] ??= []).push(p);
  }
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  // Entry time buckets
  const bucketAcc: Record<string, { wins: number; total: number }> = {};
  for (const b of TIME_BUCKETS) bucketAcc[b] = { wins: 0, total: 0 };
  for (const p of executed) {
    const b = timeBucket(p.entryTime);
    if (!bucketAcc[b]) bucketAcc[b] = { wins: 0, total: 0 };
    bucketAcc[b].total++;
    if (p.outcome === "Win") bucketAcc[b].wins++;
  }
  const timeBucketData = TIME_BUCKETS
    .filter((b) => bucketAcc[b]?.total > 0)
    .map((b) => ({
      bucket: b,
      winRate: Math.round((bucketAcc[b].wins / bucketAcc[b].total) * 100),
      count: bucketAcc[b].total,
    }));

  // Market direction matrix
  const dirAcc: Record<string, { wins: number; losses: number; skipped: number; breakeven: number }> = {};
  for (const d of DIRECTIONS) dirAcc[d] = { wins: 0, losses: 0, skipped: 0, breakeven: 0 };
  for (const p of plans) {
    const d = dirAcc[p.marketDirection as typeof DIRECTIONS[number]];
    if (!d) continue;
    if (p.outcome === "Win") d.wins++;
    else if (p.outcome === "Loss") d.losses++;
    else if (p.outcome === "Breakeven") d.breakeven++;
    else d.skipped++;
  }
  const directionData = DIRECTIONS
    .map((dir) => {
      const d = dirAcc[dir];
      const traded = d.wins + d.losses + d.breakeven;
      return {
        dir, label: DIRECTION_LABELS[dir],
        ...d, traded,
        winRate: traded > 0 ? Math.round((d.wins / traded) * 100) : 0,
        total: d.wins + d.losses + d.breakeven + d.skipped,
      };
    })
    .filter((d) => d.total > 0);

  // Risk profile (avg max loss allowed: winners vs losers)
  const winAvgRisk = wins.length > 0
    ? wins.reduce((s, p) => s + p.maxLossAllowed, 0) / wins.length : 0;
  const lossAvgRisk = losses.length > 0
    ? losses.reduce((s, p) => s + p.maxLossAllowed, 0) / losses.length : 0;

  const entryTimes = executed.filter((p) => p.entryTime).map((p) => p.entryTime!);

  // Day-level P&L
  const dayPnlData = dates.slice(0, 14).map((date) => {
    const dayPlans = byDate[date];
    const pnl = dayPlans.reduce((s, p) => s + p.pnl, 0);
    const { label } = fmtDate(date);
    return { label, pnl };
  }).reverse();

  return {
    total: plans.length,
    executed: executed.length,
    executionRate: plans.length > 0 ? Math.round((executed.length / plans.length) * 100) : 0,
    winRate: executed.length > 0 ? Math.round((wins.length / executed.length) * 100) : 0,
    ruleBreakRate: executed.length > 0 ? Math.round((ruleBreaks.length / executed.length) * 100) : 0,
    avgEntryTime: avgTimeStr(entryTimes),
    totalPnl: plans.reduce((s, p) => s + p.pnl, 0),
    byDate, dates,
    timeBucketData, directionData,
    riskProfile: [
      { name: "Winners", avgRisk: winAvgRisk, count: wins.length, fill: "#10b981" },
      { name: "Losers", avgRisk: lossAvgRisk, count: losses.length, fill: "#f43f5e" },
    ],
    dayPnlData,
  };
}

// ── Small components ───────────────────────────────────────────────────────

function RangePicker({ range, onChange }: { range: Range; onChange: (r: Range) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-muted p-1 w-fit">
      {RANGES.map((r) => (
        <button
          key={r}
          className={`rounded-md px-3 py-1 text-xs font-semibold transition ${range === r ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => onChange(r)}
        >{r}</button>
      ))}
    </div>
  );
}

function KpiCard({ label, value, sub, icon, valueClass = "" }: {
  label: string; value: string; sub?: string; icon: React.ReactNode; valueClass?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-2xl font-black mt-0.5 ${valueClass}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className="text-muted-foreground/40">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function DirectionIcon({ dir }: { dir: string }) {
  if (dir === "TrendingUp") return <TrendingUp size={12} className="text-emerald-500" />;
  if (dir === "TrendingDown") return <TrendingDown size={12} className="text-rose-500" />;
  return <Minus size={12} className="text-amber-500" />;
}

// ── Execution Calendar ─────────────────────────────────────────────────────

function StockChip({ plan }: { plan: DailyStockPlan }) {
  const time = fmtTime(plan.entryTime);
  const isSkipped = plan.outcome === "Skipped";

  const containerCls = isSkipped
    ? "border-border bg-muted/50 text-muted-foreground"
    : plan.outcome === "Win"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
    : plan.outcome === "Loss"
    ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
    : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300";

  const dotCls = isSkipped ? "bg-slate-400"
    : plan.outcome === "Win" ? "bg-emerald-500"
    : plan.outcome === "Loss" ? "bg-rose-500"
    : "bg-amber-500";

  return (
    <div className={`flex flex-col rounded-md border px-2 py-1 min-w-[68px] ${containerCls}`}>
      <div className="flex items-center gap-1">
        <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${dotCls}`} />
        <span className="text-xs font-black tracking-wide">{plan.symbol}</span>
      </div>
      <span className="text-[10px] opacity-70 mt-0.5 leading-tight">
        {time ?? (isSkipped ? "skipped" : plan.outcome)}
      </span>
    </div>
  );
}

function ExecutionCalendar({ byDate, dates }: {
  byDate: Record<string, DailyStockPlan[]>;
  dates: string[];
}) {
  if (dates.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          Execution Calendar
          <span className="text-xs font-normal text-muted-foreground">planned vs executed per day</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/60">
          {dates.map((date) => {
            const dayPlans = byDate[date];
            const { label, dow } = fmtDate(date);
            const executed = dayPlans.filter((p) => p.outcome !== "Skipped");
            const wins = executed.filter((p) => p.outcome === "Win").length;
            const dayPnl = dayPlans.reduce((s, p) => s + p.pnl, 0);
            const execRate = dayPlans.length > 0
              ? Math.round((executed.length / dayPlans.length) * 100) : 0;

            // Predominant market direction for the day
            const dirCounts: Record<string, number> = {};
            for (const p of dayPlans) dirCounts[p.marketDirection] = (dirCounts[p.marketDirection] ?? 0) + 1;
            const mainDir = Object.entries(dirCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

            return (
              <div key={date} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition">
                {/* Date */}
                <div className="w-20 flex-shrink-0">
                  <p className="text-xs font-black">{label}</p>
                  <p className="text-[11px] text-muted-foreground">{dow}</p>
                </div>

                {/* Direction */}
                <div className="w-20 flex-shrink-0 hidden sm:flex items-center gap-1">
                  {mainDir && <DirectionIcon dir={mainDir} />}
                  <span className="text-[10px] text-muted-foreground truncate">
                    {mainDir ? DIRECTION_LABELS[mainDir] : "–"}
                  </span>
                </div>

                {/* Stock chips */}
                <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
                  {dayPlans.map((p) => <StockChip key={p.id} plan={p} />)}
                </div>

                {/* Right stats */}
                <div className="flex flex-shrink-0 flex-col items-end gap-0.5 text-right">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {executed.length}/{dayPlans.length}
                    <span className="ml-1 text-[10px] opacity-70">{execRate}%</span>
                  </span>
                  {executed.length > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      {wins}W · {executed.length - wins}L
                    </span>
                  )}
                  <span className={`text-xs font-black ${dayPnl > 0 ? "text-emerald-600" : dayPnl < 0 ? "text-rose-600" : "text-muted-foreground"}`}>
                    {dayPnl !== 0 ? (dayPnl > 0 ? "+" : "") + currency.format(dayPnl) : "–"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Charts ─────────────────────────────────────────────────────────────────

function EntryTimeChart({ data }: { data: { bucket: string; winRate: number; count: number }[] }) {
  if (data.length === 0) return (
    <Card>
      <CardHeader><CardTitle className="text-sm font-bold flex items-center gap-2"><Clock size={14} /> Entry Time Win Rate</CardTitle></CardHeader>
      <CardContent><p className="py-6 text-center text-xs text-muted-foreground">No entry times recorded yet.</p></CardContent>
    </Card>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <Clock size={14} /> Entry Time Win Rate
        </CardTitle>
        <p className="text-xs text-muted-foreground">Win % by time of entry · number = sample size</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
            <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 10 }} />
            <Tooltip
              formatter={(v: number, _: string, item: { payload: { count: number } }) =>
                [`${v}% (${item.payload.count} trades)`, "Win Rate"]
              }
            />
            <Bar dataKey="winRate" radius={[4, 4, 0, 0]} maxBarSize={52}>
              {data.map((d) => (
                <Cell key={d.bucket} fill={d.winRate >= 50 ? "#10b981" : "#f43f5e"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function DirectionMatrix({ data }: {
  data: { dir: string; label: string; wins: number; losses: number; skipped: number; traded: number; winRate: number; total: number }[];
}) {
  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <TrendingUp size={14} /> Market Direction
        </CardTitle>
        <p className="text-xs text-muted-foreground">Outcome breakdown by market condition</p>
      </CardHeader>
      <CardContent className="p-0 pb-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground uppercase">
              <th className="px-4 py-2 text-left">Direction</th>
              <th className="px-4 py-2 text-center">W / L / Skip</th>
              <th className="px-4 py-2 text-right">Win Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {data.map((d) => (
              <tr key={d.dir} className="hover:bg-muted/30 transition">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <DirectionIcon dir={d.dir} />
                    <span className="text-xs font-semibold">{d.label}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-center text-xs">
                  <span className="text-emerald-600 font-bold">{d.wins}</span>
                  <span className="text-muted-foreground mx-1">/</span>
                  <span className="text-rose-600 font-bold">{d.losses}</span>
                  <span className="text-muted-foreground mx-1">/</span>
                  <span className="text-muted-foreground">{d.skipped}</span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-2">
                    {d.traded > 0 ? (
                      <>
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full transition-all ${d.winRate >= 50 ? "bg-emerald-500" : "bg-rose-500"}`}
                            style={{ width: `${d.winRate}%` }}
                          />
                        </div>
                        <span className={`text-xs font-bold w-8 text-right ${d.winRate >= 50 ? "text-emerald-600" : "text-rose-600"}`}>
                          {d.winRate}%
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">–</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function RiskProfile({ data }: { data: { name: string; avgRisk: number; count: number; fill: string }[] }) {
  const hasData = data.some((d) => d.count > 0);
  if (!hasData) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <Target size={14} /> Risk Profile
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Avg max-loss-allowed on winning vs losing trades — if losers are higher, you're over-sizing bad trades.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {data.map((d) => (
            <div key={d.name} className="rounded-lg bg-muted/50 px-4 py-3">
              <p className="text-xs text-muted-foreground">{d.name} avg risk</p>
              <p
                className="text-2xl font-black mt-0.5"
                style={{ color: d.fill }}
              >
                {d.count > 0 ? currency.format(d.avgRisk) : "–"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{d.count} trades</p>
            </div>
          ))}
        </div>
        {data[0].count > 0 && data[1].count > 0 && (
          <div className={`mt-3 rounded-md px-3 py-2 text-xs font-medium ${
            data[1].avgRisk > data[0].avgRisk * 1.2
              ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
          }`}>
            {data[1].avgRisk > data[0].avgRisk * 1.2
              ? `Losers risk ${Math.round((data[1].avgRisk / data[0].avgRisk - 1) * 100)}% more than winners — consider reducing size on uncertain setups.`
              : "Risk sizing looks consistent between wins and losses."}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DayPnlChart({ data }: { data: { label: string; pnl: number }[] }) {
  if (data.length < 3) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold">Daily P&amp;L Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={(v: number) => `$${v}`} tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: number) => [currency.format(v), "P&L"]} />
            <Bar dataKey="pnl" radius={[3, 3, 0, 0]} maxBarSize={32}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.pnl >= 0 ? "#10b981" : "#f43f5e"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function PlanAnalyticsTab() {
  const [range, setRange] = useState<Range>("30D");
  const [plans, setPlans] = useState<DailyStockPlan[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPlans(await dailyPlanApi.getRange(daysAgo(RANGE_DAYS[range]), todayIso()));
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => computeStats(plans), [plans]);

  const isEmpty = !loading && plans.length === 0;

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm text-muted-foreground">
            {loading ? "Loading…" : `${plans.length} stock plans across ${stats.dates.length} trading days`}
          </p>
        </div>
        <RangePicker range={range} onChange={setRange} />
      </div>

      {/* Empty state */}
      {isEmpty && (
        <Card>
          <CardContent className="py-16 text-center">
            <BarChart2 size={36} className="mx-auto mb-3 text-muted-foreground/30" />
            <p className="font-semibold text-muted-foreground">No plan data for this period</p>
            <p className="mt-1 text-xs text-muted-foreground">Log stocks in the Daily Plan tab to start seeing analytics.</p>
          </CardContent>
        </Card>
      )}

      {!isEmpty && !loading && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard
              label="Execution Rate"
              value={`${stats.executionRate}%`}
              sub={`${stats.executed} of ${stats.total} planned`}
              icon={<Target size={20} />}
              valueClass={stats.executionRate >= 70 ? "text-emerald-600" : stats.executionRate >= 40 ? "text-amber-600" : "text-rose-600"}
            />
            <KpiCard
              label="Win Rate"
              value={stats.executed > 0 ? `${stats.winRate}%` : "–"}
              sub={`on ${stats.executed} executed`}
              icon={<TrendingUp size={20} />}
              valueClass={stats.winRate >= 60 ? "text-emerald-600" : stats.winRate >= 40 ? "text-amber-600" : "text-rose-600"}
            />
            <KpiCard
              label="Avg Entry Time"
              value={stats.avgEntryTime ?? "–"}
              sub="across executed trades"
              icon={<Clock size={20} />}
            />
            <KpiCard
              label="Rule Break Rate"
              value={stats.executed > 0 ? `${stats.ruleBreakRate}%` : "–"}
              sub="of executed trades"
              icon={<AlertTriangle size={20} />}
              valueClass={stats.ruleBreakRate > 20 ? "text-rose-600" : stats.ruleBreakRate > 0 ? "text-amber-600" : "text-emerald-600"}
            />
          </div>

          {/* Daily P&L trend */}
          <DayPnlChart data={stats.dayPnlData} />

          {/* Execution Calendar */}
          <ExecutionCalendar byDate={stats.byDate} dates={stats.dates} />

          {/* Charts row */}
          <div className="grid gap-4 lg:grid-cols-2">
            <EntryTimeChart data={stats.timeBucketData} />
            <DirectionMatrix data={stats.directionData} />
          </div>

          {/* Risk profile */}
          <RiskProfile data={stats.riskProfile} />
        </>
      )}
    </div>
  );
}
