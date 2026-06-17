import { useEffect, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { BarChart3, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState, EmptyState } from "@/components/common/StateViews";
import { tradesApi } from "@/services/tradesApi";
import type { StrategyMetric, Trade } from "@/types";
import { currency, percent } from "@/lib/utils";

interface StockStat {
  symbol: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  pnl: number;
  avgDays: number;
  isOpen: boolean;
}

function buildStockStats(trades: Trade[]): StockStat[] {
  const map = new Map<string, Trade[]>();
  for (const t of trades) {
    map.set(t.symbol, [...(map.get(t.symbol) ?? []), t]);
  }

  return Array.from(map.entries())
    .map(([symbol, ts]) => {
      const closed = ts.filter(
        (t) => t.exitPrice && String(t.outcome) !== "Open" && t.outcome !== 0
      );
      const wins = closed.filter((t) => t.pnl > 0).length;
      const losses = closed.filter((t) => t.pnl < 0).length;
      const pnl = ts.reduce((s, t) => s + t.pnl, 0);
      const daysArr = closed
        .filter((t) => t.exitDate)
        .map((t) =>
          Math.round(
            (new Date(t.exitDate!).getTime() - new Date(t.entryDate).getTime()) / 86_400_000
          )
        );
      return {
        symbol,
        trades: ts.length,
        wins,
        losses,
        winRate: closed.length === 0 ? 0 : Math.round((wins / closed.length) * 100),
        pnl,
        avgDays: daysArr.length === 0 ? 0 : Math.round(daysArr.reduce((s, d) => s + d, 0) / daysArr.length),
        isOpen: closed.length < ts.length,
      };
    })
    .sort((a, b) => b.pnl - a.pnl);
}

export function StrategyAnalyticsPage() {
  const [strategies, setStrategies] = useState<StrategyMetric[]>();
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([tradesApi.strategies(), tradesApi.list({ pageSize: 500 })])
      .then(([s, t]) => {
        setStrategies(s);
        setAllTrades(t.items);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState label="Ranking strategies and stocks…" />;
  if (!strategies || (strategies.length === 0 && allTrades.length === 0))
    return (
      <EmptyState
        title="No trade data yet"
        description="Import your Robinhood statement or add trades manually to see strategy and stock performance."
      />
    );

  const stockStats = buildStockStats(allTrades);
  const winners = stockStats.filter((s) => s.pnl > 0);
  const losers = stockStats.filter((s) => s.pnl <= 0);

  return (
    <div className="space-y-6">

      {/* ── Strategy bar chart ─────────────────────────────────── */}
      {strategies && strategies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 size={18} className="text-blue-500" /> Strategy Comparison
            </CardTitle>
            <p className="text-sm text-muted-foreground">Win rate % and average R-multiple by strategy</p>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <BarChart data={strategies}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="strategy" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="winRate" name="Win Rate %" fill="#059669" radius={[6, 6, 0, 0]} />
                <Bar dataKey="averageRMultiple" name="Avg R" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ── Strategy performance table ─────────────────────────── */}
      {strategies && strategies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Strategy Performance</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-3 text-left">Strategy</th>
                  <th className="py-3 text-right">Trades</th>
                  <th className="py-3 text-right">Win rate</th>
                  <th className="py-3 text-right">Avg R</th>
                  <th className="py-3 text-right">Total P&L</th>
                </tr>
              </thead>
              <tbody>
                {strategies.map((row) => (
                  <tr key={row.strategy} className="border-b border-border last:border-0">
                    <td className="py-4 font-black">{row.strategy}</td>
                    <td className="py-4 text-right">{row.trades}</td>
                    <td className="py-4 text-right">
                      <span className={`font-semibold ${row.winRate >= 50 ? "text-emerald-600" : "text-rose-600"}`}>
                        {percent(row.winRate)}
                      </span>
                    </td>
                    <td className="py-4 text-right font-semibold">{row.averageRMultiple.toFixed(2)}R</td>
                    <td className={`py-4 text-right font-black ${row.pnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {row.pnl >= 0 ? "+" : ""}{currency.format(row.pnl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* ── Stock P&L bar chart ───────────────────────────────── */}
      {stockStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 size={18} className="text-emerald-600" /> P&L by Stock
            </CardTitle>
            <p className="text-sm text-muted-foreground">Realized + unrealized P&L for every symbol you've traded</p>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer>
              <BarChart data={stockStats} margin={{ bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="symbol" tick={{ fontSize: 12, fontWeight: "bold" }} />
                <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [currency.format(v), "P&L"]} />
                <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
                  {stockStats.map((s, i) => (
                    <Cell key={i} fill={s.pnl >= 0 ? "#059669" : "#e11d48"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ── Stock breakdown table ─────────────────────────────── */}
      {stockStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Stock-Level Breakdown</CardTitle>
            <p className="text-sm text-muted-foreground">Per-symbol win rate, hold time, and P&L</p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-3 text-left">Symbol</th>
                  <th className="py-3 text-right">Trades</th>
                  <th className="py-3 text-right">W / L</th>
                  <th className="py-3 text-right">Win rate</th>
                  <th className="py-3 text-right">Avg hold</th>
                  <th className="py-3 text-right">Total P&L</th>
                  <th className="py-3 text-left pl-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {stockStats.map((s) => (
                  <tr key={s.symbol} className="border-b border-border last:border-0">
                    <td className="py-3 font-black">{s.symbol}</td>
                    <td className="py-3 text-right">{s.trades}</td>
                    <td className="py-3 text-right">
                      <span className="text-emerald-600 font-semibold">{s.wins}W</span>
                      {" / "}
                      <span className="text-rose-600 font-semibold">{s.losses}L</span>
                    </td>
                    <td className="py-3 text-right">
                      {s.wins + s.losses > 0 ? (
                        <span className={`font-semibold ${s.winRate >= 50 ? "text-emerald-600" : "text-rose-600"}`}>
                          {s.winRate}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 text-right text-muted-foreground">
                      {s.avgDays > 0 ? `${s.avgDays}d` : "—"}
                    </td>
                    <td className={`py-3 text-right font-black ${s.pnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {s.pnl >= 0 ? "+" : ""}{currency.format(s.pnl)}
                    </td>
                    <td className="py-3 pl-4">
                      {s.isOpen ? (
                        <Badge tone="blue">Has open lots</Badge>
                      ) : (
                        <Badge tone="slate">Closed</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* ── Winners vs Losers summary ─────────────────────────── */}
      {stockStats.length > 0 && (
        <section className="grid gap-4 xl:grid-cols-2">
          {winners.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-600">
                  <TrendingUp size={18} /> Winning Stocks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {winners.map((s) => (
                  <div key={s.symbol} className="flex items-center justify-between rounded-lg bg-emerald-50/60 px-3 py-2 dark:bg-emerald-900/10">
                    <div>
                      <span className="font-black">{s.symbol}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{s.trades} trade{s.trades !== 1 ? "s" : ""} · {s.winRate}% WR</span>
                    </div>
                    <span className="font-black text-emerald-600">+{currency.format(s.pnl)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {losers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-rose-600">
                  <TrendingDown size={18} /> Losing Stocks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {losers.map((s) => (
                  <div key={s.symbol} className="flex items-center justify-between rounded-lg bg-rose-50/60 px-3 py-2 dark:bg-rose-900/10">
                    <div>
                      <span className="font-black">{s.symbol}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{s.trades} trade{s.trades !== 1 ? "s" : ""} · {s.winRate}% WR</span>
                    </div>
                    <span className="font-black text-rose-600">{currency.format(s.pnl)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </section>
      )}

    </div>
  );
}
