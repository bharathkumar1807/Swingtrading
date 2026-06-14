import { ArrowDownRight, ArrowUpRight, LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KpiCard({ label, value, icon: Icon, positive = true, subtext }: { label: string; value: string; icon: LucideIcon; positive?: boolean; subtext?: string }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="relative p-5">
        <div className={cn("absolute right-0 top-0 h-24 w-24 rounded-bl-[4rem] opacity-10", positive ? "bg-emerald-500" : "bg-rose-500")} />
        <div className="flex items-center justify-between">
          <div className={cn("grid h-10 w-10 place-items-center rounded-lg", positive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>
            <Icon size={19} />
          </div>
          {positive ? <ArrowUpRight className="text-emerald-600" size={18} /> : <ArrowDownRight className="text-rose-600" size={18} />}
        </div>
        <p className="mt-5 text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-black tracking-tight">{value}</p>
        {subtext && <p className="mt-2 text-xs text-muted-foreground">{subtext}</p>}
      </CardContent>
    </Card>
  );
}
