import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/common/StateViews";
import { tradesApi } from "@/services/tradesApi";
import type { MistakeAnalytics } from "@/types";
import { currency } from "@/lib/utils";

export function MistakeAnalyticsPage() {
  const [data, setData] = useState<MistakeAnalytics>();
  useEffect(() => { tradesApi.mistakes().then(setData); }, []);
  if (!data) return <LoadingState label="Analyzing behavior..." />;
  return (
    <div className="space-y-6">
      <Card><CardHeader><CardTitle>Mistake frequency</CardTitle></CardHeader><CardContent className="h-80"><ResponsiveContainer><BarChart data={data.frequency}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis /><Tooltip /><Bar dataKey="value" fill="#db2777" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>
      <div className="grid gap-4 md:grid-cols-3">{data.breakdown.map((item) => <Card key={item.mistake}><CardContent><p className="font-black">{item.mistake}</p><p className="mt-2 text-sm text-muted-foreground">{item.count} occurrences</p><p className={item.pnlImpact >= 0 ? "mt-3 font-bold text-emerald-600" : "mt-3 font-bold text-rose-600"}>{currency.format(item.pnlImpact)}</p></CardContent></Card>)}</div>
      <Card><CardHeader><CardTitle>Improvement insights</CardTitle></CardHeader><CardContent className="space-y-2">{data.insights.map((insight) => <p key={insight} className="rounded-lg bg-muted p-3 text-sm">{insight}</p>)}</CardContent></Card>
    </div>
  );
}
