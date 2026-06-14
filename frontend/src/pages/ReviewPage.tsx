import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/common/StateViews";
import { tradesApi } from "@/services/tradesApi";
import type { Review } from "@/types";
import { currency, percent } from "@/lib/utils";

export function ReviewPage() {
  const [data, setData] = useState<Review>();
  useEffect(() => { tradesApi.review().then(setData); }, []);
  if (!data) return <LoadingState label="Building review..." />;
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card><CardHeader><CardTitle>Weekly summary</CardTitle></CardHeader><CardContent className="space-y-4"><Metric label="Win rate" value={percent(data.weekly.winRate)} /><Metric label="Weekly P&L" value={currency.format(data.weekly.pnl)} /><Metric label="Rule violations" value={data.weekly.ruleViolations.join(", ") || "None"} /></CardContent></Card>
      <Card><CardHeader><CardTitle>Monthly insights</CardTitle></CardHeader><CardContent className="space-y-4"><Metric label="Most profitable strategy" value={data.monthly.mostProfitableStrategy} /><Metric label="Biggest leak" value={data.monthly.biggestLeak} /><Metric label="Improvement vs last month" value={currency.format(data.monthly.improvementVsLastMonth)} /></CardContent></Card>
      <Card className="xl:col-span-2"><CardHeader><CardTitle>Notes and action items</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">{data.actionPrompts.map((prompt) => <textarea key={prompt} className="min-h-36 rounded-xl border border-border bg-card p-4 text-sm outline-none focus:ring-2 focus:ring-primary/30" placeholder={prompt} />)}</CardContent></Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-muted p-4"><p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p><p className="mt-1 text-lg font-black">{value}</p></div>;
}
