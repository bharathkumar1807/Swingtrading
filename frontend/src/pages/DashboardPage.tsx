import { useEffect, useState } from "react";
import { Activity, Percent, Scale, Sigma, TrendingDown, TrendingUp } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, LoadingState } from "@/components/common/StateViews";
import { tradesApi } from "@/services/tradesApi";
import type { Dashboard } from "@/types";
import { currency, percent } from "@/lib/utils";

const colors = ["#059669", "#2563eb", "#f59e0b", "#db2777", "#7c3aed", "#0f766e"];

export function DashboardPage() {
  const [data, setData] = useState<Dashboard>();
  const [loading, setLoading] = useState(true);
  useEffect(() => { tradesApi.dashboard().then(setData).finally(() => setLoading(false)); }, []);
  if (loading) return <LoadingState />;
  if (!data || data.kpis.totalTrades === 0) return <EmptyState title="No trades yet" description="Add your first trade to activate dashboard analytics, equity curves, and review summaries." />;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Win rate" value={percent(data.kpis.winRate)} icon={Percent} />
        <KpiCard label="Total profit" value={currency.format(data.kpis.totalProfit)} icon={TrendingUp} />
        <KpiCard label="Total loss" value={currency.format(data.kpis.totalLoss)} icon={TrendingDown} positive={false} />
        <KpiCard label="Avg R-multiple" value={`${data.kpis.averageRMultiple.toFixed(2)}R`} icon={Scale} />
        <KpiCard label="Total trades" value={String(data.kpis.totalTrades)} icon={Sigma} />
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardHeader><CardTitle>Equity curve</CardTitle><Activity size={18} className="text-emerald-600" /></CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer><AreaChart data={data.equityCurve}><defs><linearGradient id="equity" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#059669" stopOpacity={0.35} /><stop offset="100%" stopColor="#059669" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="label" /><YAxis /><Tooltip /><Area type="monotone" dataKey="value" stroke="#059669" fill="url(#equity)" strokeWidth={3} /></AreaChart></ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Sector allocation</CardTitle></CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer><PieChart><Pie data={data.sectorAllocation} dataKey="value" nameKey="label" innerRadius={65} outerRadius={105}>{data.sectorAllocation.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
          </CardContent>
        </Card>
      </section>
      <section className="grid gap-6 xl:grid-cols-2">
        <Card><CardHeader><CardTitle>Weekly performance</CardTitle></CardHeader><CardContent className="h-72"><ResponsiveContainer><BarChart data={data.weeklyPerformance}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis /><Tooltip /><Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>
        <Card><CardHeader><CardTitle>Strategy performance</CardTitle></CardHeader><CardContent><div className="space-y-3">{data.strategies.slice(0, 6).map((s) => <div key={s.strategy} className="flex items-center justify-between rounded-lg bg-muted p-3"><span className="font-semibold">{s.strategy}</span><span className={s.pnl >= 0 ? "text-emerald-600" : "text-rose-600"}>{currency.format(s.pnl)} · {s.averageRMultiple.toFixed(2)}R</span></div>)}</div></CardContent></Card>
      </section>
    </div>
  );
}
