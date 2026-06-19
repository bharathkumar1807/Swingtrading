import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { currency } from "@/lib/utils";
import type { Trade } from "@/types";

type Period = "7D" | "30D" | "3M" | "All";
type GroupBy = "Day" | "Week" | "Month";

const PERIODS: Period[] = ["7D", "30D", "3M", "All"];
const GROUPS: GroupBy[] = ["Day", "Week", "Month"];

interface Bucket {
  key: string;
  label: string;
  sublabel: string;
  pnl: number;
  wins: number;
  losses: number;
  tradeCount: number;
}

function applyPeriod(trades: Trade[], period: Period): Trade[] {
  const closed = trades.filter((t) => t.exitDate);
  if (period === "All") return closed;
  const days = period === "7D" ? 7 : period === "30D" ? 30 : 90;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return closed.filter((t) => new Date(t.exitDate!) >= cutoff);
}

function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("T")[0].split("-").map(Number);
  return new Date(y, m - 1, d);
}

function weekMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function weekSunday(monday: Date): Date {
  const d = new Date(monday);
  d.setDate(d.getDate() + 6);
  return d;
}

function shortMD(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function bucketize(trades: Trade[], groupBy: GroupBy): Bucket[] {
  const map = new Map<string, Bucket>();

  for (const trade of trades) {
    const date = parseDate(trade.exitDate!);
    let key: string;
    let label: string;
    let sublabel: string;

    if (groupBy === "Day") {
      key = trade.exitDate!.split("T")[0];
      label = date.toLocaleDateString("en-US", { weekday: "short" });
      sublabel = shortMD(date);
    } else if (groupBy === "Week") {
      const mon = weekMonday(date);
      const sun = weekSunday(mon);
      key = `${mon.getFullYear()}-W${String(mon.getMonth()).padStart(2, "0")}-${String(mon.getDate()).padStart(2, "0")}`;
      label = mon.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const sunFmt: Intl.DateTimeFormatOptions = sun.getMonth() !== mon.getMonth()
        ? { month: "short", day: "numeric" }
        : { day: "numeric" };
      sublabel = `–${sun.toLocaleDateString("en-US", sunFmt)}`;
    } else {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      label = date.toLocaleDateString("en-US", { month: "short" });
      sublabel = String(date.getFullYear());
    }

    if (!map.has(key)) {
      map.set(key, { key, label, sublabel, pnl: 0, wins: 0, losses: 0, tradeCount: 0 });
    }
    const b = map.get(key)!;
    b.pnl += trade.pnl;
    b.tradeCount++;
    if (trade.pnl > 0) b.wins++;
    else if (trade.pnl < 0) b.losses++;
  }

  return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
}

interface Props {
  trades: Trade[];
}

export function TradesPerformancePanel({ trades }: Props) {
  const [period, setPeriod] = useState<Period>("30D");
  const [groupBy, setGroupBy] = useState<GroupBy>("Day");

  const filtered = applyPeriod(trades, period);
  const buckets = bucketize(filtered, groupBy);

  if (trades.filter((t) => t.exitDate).length === 0) return null;

  const totalPnl = filtered.reduce((s, t) => s + t.pnl, 0);
  const wins = filtered.filter((t) => t.pnl > 0).length;
  const losses = filtered.filter((t) => t.pnl < 0).length;
  const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
  const bestTrade = filtered.length > 0 ? Math.max(...filtered.map((t) => t.pnl)) : 0;
  const worstTrade = filtered.length > 0 ? Math.min(...filtered.map((t) => t.pnl)) : 0;
  const avgPerBucket = buckets.length > 0 ? totalPnl / buckets.length : 0;

  const maxAbsPnl = Math.max(...buckets.map((b) => Math.abs(b.pnl)), 1);

  const groupLabel = groupBy === "Day" ? "day" : groupBy === "Week" ? "week" : "month";

  return (
    <Card>
      <CardContent className="space-y-4 pt-5">
        {/* Controls row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Period selector */}
          <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-md px-3 py-1 text-sm font-semibold transition-colors ${
                  period === p
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Group-by selector */}
          <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
            {GROUPS.map((g) => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                className={`rounded-md px-3 py-1 text-sm font-semibold transition-colors ${
                  groupBy === g
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* KPI summary */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Period P&amp;L</p>
            <p className={`text-2xl font-black ${totalPnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {currency.format(totalPnl)}
            </p>
          </div>

          <div className="h-10 w-px bg-border" />

          <div>
            <p className="text-xs text-muted-foreground">Win rate</p>
            <p className={`text-lg font-bold ${winRate >= 50 ? "text-emerald-600" : "text-rose-600"}`}>
              {winRate}%
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Winners</p>
            <p className="text-lg font-bold text-emerald-600">{wins}</p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Losers</p>
            <p className="text-lg font-bold text-rose-600">{losses}</p>
          </div>

          <div className="h-10 w-px bg-border" />

          <div>
            <p className="text-xs text-muted-foreground">Best trade</p>
            <p className="text-sm font-bold text-emerald-600">{currency.format(bestTrade)}</p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Worst trade</p>
            <p className="text-sm font-bold text-rose-600">{currency.format(worstTrade)}</p>
          </div>

          <div className="h-10 w-px bg-border" />

          <div>
            <p className="text-xs text-muted-foreground">Avg / {groupLabel}</p>
            <p className={`text-sm font-bold ${avgPerBucket >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {currency.format(avgPerBucket)}
            </p>
          </div>
        </div>

        {/* Bucket strip */}
        {buckets.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No closed trades in this period.
          </p>
        ) : (
          <div className="relative">
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-2" style={{ minWidth: "max-content" }}>
                {buckets.map((bucket) => {
                  const isWin = bucket.pnl >= 0;
                  const barPct = Math.round((Math.abs(bucket.pnl) / maxAbsPnl) * 100);
                  return (
                    <div
                      key={bucket.key}
                      className={`flex w-[84px] flex-col gap-1.5 rounded-lg border p-2.5 ${
                        isWin
                          ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
                          : "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30"
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground leading-tight">
                        {bucket.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground leading-tight">
                        {bucket.sublabel}
                      </span>
                      <span className={`text-[11px] font-black leading-tight ${isWin ? "text-emerald-600" : "text-rose-600"}`}>
                        {currency.format(bucket.pnl)}
                      </span>
                      <span className="text-[9px] text-muted-foreground">
                        {bucket.wins}W {bucket.losses}L
                        {bucket.tradeCount > bucket.wins + bucket.losses
                          ? ` ${bucket.tradeCount - bucket.wins - bucket.losses}B`
                          : ""}
                      </span>
                      <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                          className={`h-full rounded-full ${isWin ? "bg-emerald-500" : "bg-rose-500"}`}
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {buckets.length > 8 && (
              <div className="pointer-events-none absolute right-0 top-0 h-full w-12 bg-gradient-to-l from-background to-transparent" />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
