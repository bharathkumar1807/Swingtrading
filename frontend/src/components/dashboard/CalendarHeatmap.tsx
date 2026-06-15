import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { currency } from "@/lib/utils";
import type { DailyPnl } from "@/types";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function compactCurrency(value: number): string {
  const abs = Math.abs(value);
  const prefix = value < 0 ? "-" : "+";
  if (abs >= 10000) return `${prefix}$${(abs / 1000).toFixed(0)}k`;
  if (abs >= 1000) return `${prefix}$${(abs / 1000).toFixed(1)}k`;
  return `${prefix}$${abs.toFixed(0)}`;
}

function cellClass(pnl: number, maxAbs: number): string {
  if (pnl === 0) return "";
  const ratio = Math.abs(pnl) / maxAbs;
  if (pnl > 0) {
    if (ratio > 0.6) return "bg-emerald-600 text-white";
    if (ratio > 0.25) return "bg-emerald-400 text-white";
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300";
  }
  if (ratio > 0.6) return "bg-rose-600 text-white";
  if (ratio > 0.25) return "bg-rose-400 text-white";
  return "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300";
}

export function CalendarHeatmap({ data }: { data: DailyPnl[] }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const byDate = Object.fromEntries(data.map((d) => [d.date, d]));

  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthData = data.filter((d) => d.date.startsWith(monthKey));
  const maxAbs = Math.max(...monthData.map((d) => Math.abs(d.pnl)), 1);
  const monthPnl = monthData.reduce((sum, d) => sum + d.pnl, 0);
  const tradeDays = monthData.length;

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  function prev() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function next() {
    const now = new Date();
    if (year === now.getFullYear() && month === now.getMonth()) return;
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  const todayStr = today.toISOString().split("T")[0];
  const canGoNext = !(year === today.getFullYear() && month === today.getMonth());

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={prev}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-bold min-w-[130px] text-center">
            {MONTH_NAMES[month]} {year}
          </span>
          <button
            onClick={next}
            disabled={!canGoNext}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">{tradeDays} trading day{tradeDays !== 1 ? "s" : ""}</span>
          <span className={`font-black text-base ${monthPnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {monthPnl >= 0 ? "+" : ""}{currency.format(monthPnl)}
          </span>
        </div>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map((d) => (
          <div key={d} className="text-center text-[11px] font-semibold text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((day, di) => {
              if (day === null) return <div key={di} className="h-14 rounded-lg" />;

              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const entry = byDate[dateStr];
              const isToday = dateStr === todayStr;
              const isWeekend = di === 0 || di === 6;

              return (
                <div
                  key={di}
                  title={
                    entry
                      ? `${dateStr} · ${currency.format(entry.pnl)} · ${entry.tradeCount} trade${entry.tradeCount !== 1 ? "s" : ""} (${entry.wins}W ${entry.losses}L)`
                      : dateStr
                  }
                  className={[
                    "h-14 rounded-lg p-1.5 flex flex-col justify-between transition-all cursor-default select-none",
                    entry ? cellClass(entry.pnl, maxAbs) : isWeekend ? "bg-slate-50 dark:bg-slate-900/20" : "bg-muted/40",
                    isToday ? "ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-slate-900" : "",
                  ].join(" ")}
                >
                  <span className={`text-[11px] font-bold leading-none ${isToday ? "text-blue-600 dark:text-blue-400" : ""}`}>
                    {day}
                  </span>
                  {entry && (
                    <div className="space-y-0.5">
                      <div className="text-[10px] font-black leading-none tabular-nums">
                        {compactCurrency(entry.pnl)}
                      </div>
                      <div className="text-[9px] opacity-70 leading-none">
                        {entry.tradeCount}T · {entry.wins}W {entry.losses}L
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 justify-end">
        <span className="text-[10px] text-muted-foreground">Less</span>
        {[
          "bg-rose-600",
          "bg-rose-400",
          "bg-rose-100 dark:bg-rose-900/50",
          "bg-muted/40",
          "bg-emerald-100 dark:bg-emerald-900/50",
          "bg-emerald-400",
          "bg-emerald-600",
        ].map((cls, i) => (
          <div key={i} className={`w-4 h-4 rounded ${cls}`} />
        ))}
        <span className="text-[10px] text-muted-foreground">More</span>
      </div>
    </div>
  );
}
