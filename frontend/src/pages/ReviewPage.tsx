import { useEffect, useState } from "react";
import { AlertCircle, ArrowUpRight, BookOpen, CalendarDays, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/common/StateViews";
import { tradesApi } from "@/services/tradesApi";
import type { Review, Trade } from "@/types";
import { currency, percent } from "@/lib/utils";

export function ReviewPage() {
  const [review, setReview] = useState<Review>();
  const [openTrades, setOpenTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      tradesApi.review(),
      tradesApi.list({ pageSize: 200 }),
    ]).then(([r, trades]) => {
      setReview(r);
      setOpenTrades(trades.items.filter((t) => !t.exitPrice || String(t.outcome) === "Open" || t.outcome === 0));
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState label="Building review…" />;
  if (!review) return null;

  const { weekly, monthly, actionPrompts } = review;
  const totalCostBasis = openTrades.reduce((s, t) => s + t.entryPrice * t.size, 0);

  return (
    <div className="space-y-6">

      {/* ── Row 1: Weekly snapshot ─────────────────────────────── */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Win rate (week)"
          value={percent(weekly.winRate)}
          icon={<TrendingUp size={18} className="text-emerald-600" />}
          tone={weekly.winRate >= 50 ? "green" : "red"}
        />
        <StatCard
          label="P&L (week)"
          value={currency.format(weekly.pnl)}
          icon={weekly.pnl >= 0 ? <TrendingUp size={18} className="text-emerald-600" /> : <TrendingDown size={18} className="text-rose-500" />}
          tone={weekly.pnl >= 0 ? "green" : "red"}
        />
        <StatCard
          label="Open positions"
          value={String(openTrades.length)}
          icon={<CalendarDays size={18} className="text-blue-500" />}
          tone="neutral"
        />
        <StatCard
          label="Capital deployed"
          value={currency.format(totalCostBasis)}
          icon={<ArrowUpRight size={18} className="text-amber-500" />}
          tone="neutral"
        />
      </section>

      {/* ── Row 2: Open positions ──────────────────────────────── */}
      {openTrades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays size={18} className="text-blue-500" /> Open Positions
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 text-left">Symbol</th>
                  <th className="py-2 text-left">Entry Date</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Entry Price</th>
                  <th className="py-2 text-right">Cost Basis</th>
                  <th className="py-2 text-right">Days Open</th>
                  <th className="py-2 text-left pl-4">Strategy</th>
                </tr>
              </thead>
              <tbody>
                {openTrades.map((t) => {
                  const days = Math.round(
                    (Date.now() - new Date(t.entryDate).getTime()) / 86_400_000
                  );
                  return (
                    <tr key={t.id} className="border-b border-border/60 last:border-0">
                      <td className="py-3 font-black">{t.symbol}</td>
                      <td className="py-3 text-muted-foreground">{new Date(t.entryDate).toLocaleDateString()}</td>
                      <td className="py-3 text-right tabular-nums">{t.size}</td>
                      <td className="py-3 text-right tabular-nums">{currency.format(t.entryPrice)}</td>
                      <td className="py-3 text-right font-semibold tabular-nums">{currency.format(t.entryPrice * t.size)}</td>
                      <td className="py-3 text-right">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${days > 30 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-slate-100 text-slate-700 dark:bg-slate-800"}`}>
                          {days}d
                        </span>
                      </td>
                      <td className="py-3 pl-4 text-muted-foreground">{t.strategy}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* ── Row 3: Best / Worst trades this week ──────────────── */}
      {(weekly.bestTrades.length > 0 || weekly.worstTrades.length > 0) && (
        <section className="grid gap-4 xl:grid-cols-2">
          {weekly.bestTrades.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-600">
                  <TrendingUp size={18} /> Best trades this week
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {weekly.bestTrades.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-lg bg-emerald-50/60 px-3 py-2 dark:bg-emerald-900/10">
                    <div>
                      <span className="font-black">{t.symbol}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{t.strategy}</span>
                    </div>
                    <span className="font-black text-emerald-600">+{currency.format(t.pnl)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {weekly.worstTrades.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-rose-600">
                  <TrendingDown size={18} /> Worst trades this week
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {weekly.worstTrades.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-lg bg-rose-50/60 px-3 py-2 dark:bg-rose-900/10">
                    <div>
                      <span className="font-black">{t.symbol}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{t.strategy}</span>
                    </div>
                    <span className="font-black text-rose-600">{currency.format(t.pnl)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {/* ── Row 4: Monthly insights ────────────────────────────── */}
      <section className="grid gap-4 sm:grid-cols-3">
        <InsightCard
          icon={<TrendingUp size={16} className="text-emerald-600" />}
          label="Most profitable strategy"
          value={monthly.mostProfitableStrategy}
        />
        <InsightCard
          icon={<AlertCircle size={16} className="text-amber-500" />}
          label="Biggest leak"
          value={monthly.biggestLeak}
        />
        <InsightCard
          icon={<ArrowUpRight size={16} className="text-blue-500" />}
          label="vs last month"
          value={currency.format(monthly.improvementVsLastMonth)}
          valueClass={monthly.improvementVsLastMonth >= 0 ? "text-emerald-600" : "text-rose-600"}
        />
      </section>

      {/* ── Row 5: Rule violations ─────────────────────────────── */}
      {weekly.ruleViolations.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle size={18} /> Rule violations this week
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {weekly.ruleViolations.map((v) => (
              <Badge key={v} tone="amber">{v}</Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Row 6: Journal prompts ─────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen size={18} className="text-slate-500" /> Weekly reflection
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {actionPrompts.map((prompt) => (
            <div key={prompt}>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {prompt}
              </label>
              <textarea
                className="min-h-28 w-full rounded-xl border border-border bg-muted/40 p-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/30 resize-none"
                placeholder="Write your thoughts…"
              />
            </div>
          ))}
        </CardContent>
      </Card>

    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "green" | "red" | "neutral";
}) {
  const valueClass =
    tone === "green"
      ? "text-emerald-600"
      : tone === "red"
      ? "text-rose-600"
      : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </div>
      <div className={`mt-2 text-3xl font-black tabular-nums ${valueClass}`}>{value}</div>
    </div>
  );
}

function InsightCard({
  icon,
  label,
  value,
  valueClass = "text-foreground",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </div>
      <div className={`mt-2 text-lg font-black ${valueClass}`}>{value || "—"}</div>
    </div>
  );
}
