import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/common/StateViews";
import { tradesApi } from "@/services/tradesApi";
import type { StrategyMetric } from "@/types";
import { currency, percent } from "@/lib/utils";

export function StrategyAnalyticsPage() {
  const [data, setData] = useState<StrategyMetric[]>();
  useEffect(() => { tradesApi.strategies().then(setData); }, []);
  if (!data) return <LoadingState label="Ranking strategies..." />;
  return (
    <div className="space-y-6">
      <Card><CardHeader><CardTitle>Strategy comparison</CardTitle></CardHeader><CardContent className="h-80"><ResponsiveContainer><BarChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="strategy" /><YAxis /><Tooltip /><Legend /><Bar dataKey="winRate" fill="#059669" radius={[6, 6, 0, 0]} /><Bar dataKey="averageRMultiple" fill="#2563eb" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>
      <Card><CardHeader><CardTitle>Performance table</CardTitle></CardHeader><CardContent className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead><tr className="border-b border-border text-left text-xs uppercase text-muted-foreground"><th className="py-3">Strategy</th><th>Trades</th><th>Win rate</th><th>Avg R</th><th>P&L</th></tr></thead><tbody>{data.map((row) => <tr key={row.strategy} className="border-b border-border"><td className="py-4 font-black">{row.strategy}</td><td>{row.trades}</td><td>{percent(row.winRate)}</td><td>{row.averageRMultiple.toFixed(2)}R</td><td className={row.pnl >= 0 ? "font-bold text-emerald-600" : "font-bold text-rose-600"}>{currency.format(row.pnl)}</td></tr>)}</tbody></table></CardContent></Card>
    </div>
  );
}
