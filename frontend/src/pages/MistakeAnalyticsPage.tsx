import { useEffect, useState } from "react";
import { AlertTriangle, Brain, Lightbulb, TrendingDown } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState, EmptyState } from "@/components/common/StateViews";
import { tradesApi } from "@/services/tradesApi";
import type { MistakeAnalytics } from "@/types";
import { currency } from "@/lib/utils";

const SWING_TIPS: Record<string, string> = {
  "Entered too early":
    "Wait for price confirmation before entering. A candle close above resistance is safer than intrabar breakouts.",
  "Entered too late":
    "Chasing extended moves increases risk. Set alerts and be patient for the next pullback to key support.",
  "Moved stop-loss":
    "Widening your stop changes the trade's risk profile. Honor the stop set at entry — it was placed for a reason.",
  "Over-leveraged":
    "Size kills accounts more often than bad analysis. Risk no more than 1-2% of portfolio per trade.",
  "Emotional entry":
    "FOMO and revenge trading bypass your setup rules. If the trade isn't in your plan, it shouldn't be in your account.",
  Overtrading:
    "More trades ≠ more profit. Quality setups with high probability reward are rare — wait for them.",
};

export function MistakeAnalyticsPage() {
  const [data, setData] = useState<MistakeAnalytics>();
  useEffect(() => {
    tradesApi.mistakes().then(setData);
  }, []);

  if (!data) return <LoadingState label="Analyzing your behavior patterns…" />;
  if (data.frequency.length === 0)
    return (
      <EmptyState
        title="No mistakes logged yet"
        description="Tag mistakes on your trades to start seeing patterns. The goal is to see this page with fewer and fewer items over time."
      />
    );

  const chartData = data.breakdown
    .slice()
    .sort((a, b) => a.pnlImpact - b.pnlImpact);

  const totalPnlImpact = data.breakdown.reduce((s, b) => s + b.pnlImpact, 0);
  const totalOccurrences = data.breakdown.reduce((s, b) => s + b.count, 0);

  return (
    <div className="space-y-6">

      {/* ── Summary strip ─────────────────────────────────────── */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mistake types</p>
          <p className="mt-2 text-3xl font-black">{data.breakdown.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total occurrences</p>
          <p className="mt-2 text-3xl font-black">{totalOccurrences}</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total P&L impact</p>
          <p className={`mt-2 text-3xl font-black ${totalPnlImpact >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {currency.format(totalPnlImpact)}
          </p>
        </div>
      </section>

      {/* ── P&L impact chart ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown size={18} className="text-rose-500" /> P&L Impact by Mistake
          </CardTitle>
          <p className="text-sm text-muted-foreground">How much each mistake has cost you — sorted worst to least</p>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer>
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="mistake" tick={{ fontSize: 12 }} width={140} />
              <Tooltip formatter={(v: number) => [currency.format(v), "P&L impact"]} />
              <Bar dataKey="pnlImpact" radius={[0, 6, 6, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.pnlImpact < 0 ? "#e11d48" : "#059669"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Mistake cards ─────────────────────────────────────── */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-base font-black">
          <Brain size={18} /> Mistake Breakdown
        </h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.breakdown.map((item) => {
            const tip = SWING_TIPS[item.mistake];
            const isHurting = item.pnlImpact < 0;
            return (
              <div
                key={item.mistake}
                className={`rounded-xl border bg-card p-4 ${isHurting ? "border-rose-200 dark:border-rose-800/40" : "border-border"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle
                      size={16}
                      className={isHurting ? "text-rose-500" : "text-amber-500"}
                    />
                    <span className="font-black text-sm">{item.mistake}</span>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold dark:bg-slate-800">
                    {item.count}×
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">P&L impact</span>
                  <span className={`text-sm font-black tabular-nums ${item.pnlImpact < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                    {item.pnlImpact >= 0 ? "+" : ""}{currency.format(item.pnlImpact)}
                  </span>
                </div>

                {/* Progress bar showing relative severity */}
                <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                  <div
                    className={`h-1.5 rounded-full ${isHurting ? "bg-rose-500" : "bg-emerald-500"}`}
                    style={{
                      width: `${Math.min(100, (item.count / Math.max(...data.breakdown.map((b) => b.count))) * 100)}%`,
                    }}
                  />
                </div>

                {tip && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg bg-blue-50/70 p-2.5 dark:bg-blue-900/10">
                    <Lightbulb size={13} className="mt-0.5 shrink-0 text-blue-500" />
                    <p className="text-xs text-blue-800 dark:text-blue-300">{tip}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Backend insights ──────────────────────────────────── */}
      {data.insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb size={18} className="text-amber-500" /> Key insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.insights.map((insight) => (
              <div key={insight} className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-sm">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-500" />
                {insight}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

    </div>
  );
}
