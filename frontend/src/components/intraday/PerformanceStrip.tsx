import { useNavigate } from "react-router-dom";
import { currency } from "@/lib/utils";
import type { IntradaySessionSummary } from "@/types";

interface Props {
  sessions: IntradaySessionSummary[];
}

export function PerformanceStrip({ sessions }: Props) {
  const navigate = useNavigate();

  if (sessions.length === 0) return null;

  const sorted = [...sessions].sort(
    (a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime()
  );

  const maxAbsPnl = Math.max(...sorted.map((s) => Math.abs(s.totalPnl)), 1);
  const totalPnl = sorted.reduce((sum, s) => sum + s.totalPnl, 0);
  const winDays = sorted.filter((s) => s.totalPnl > 0).length;
  const lossDays = sorted.filter((s) => s.totalPnl < 0).length;
  const bestDay = Math.max(...sorted.map((s) => s.totalPnl));
  const worstDay = Math.min(...sorted.map((s) => s.totalPnl));

  return (
    <div className="space-y-4">
      {/* Summary stats row */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Period P&L</p>
          <p className={`text-2xl font-black ${totalPnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {currency.format(totalPnl)}
          </p>
        </div>
        <div className="h-10 w-px bg-border" />
        <div>
          <p className="text-xs text-muted-foreground">Win days</p>
          <p className="text-lg font-bold text-emerald-600">{winDays}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Loss days</p>
          <p className="text-lg font-bold text-rose-600">{lossDays}</p>
        </div>
        <div className="h-10 w-px bg-border" />
        <div>
          <p className="text-xs text-muted-foreground">Best day</p>
          <p className="text-sm font-bold text-emerald-600">{currency.format(bestDay)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Worst day</p>
          <p className="text-sm font-bold text-rose-600">{currency.format(worstDay)}</p>
        </div>
      </div>

      {/* Scrollable day cards */}
      <div className="relative">
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-2" style={{ minWidth: "max-content" }}>
            {sorted.map((session) => {
              const isWin = session.totalPnl >= 0;
              const barPct = Math.round((Math.abs(session.totalPnl) / maxAbsPnl) * 100);
              return (
                <button
                  key={session.id}
                  className={`flex w-[76px] flex-col gap-1.5 rounded-lg border p-2.5 text-left transition-all hover:scale-[1.04] hover:shadow-md ${
                    isWin
                      ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
                      : "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30"
                  }`}
                  onClick={() => navigate(`/intraday/${session.id}`)}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    {dayLabel(session.sessionDate)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {shortDate(session.sessionDate)}
                  </span>
                  <span className={`text-[11px] font-black leading-tight ${isWin ? "text-emerald-600" : "text-rose-600"}`}>
                    {currency.format(session.totalPnl)}
                  </span>
                  <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className={`h-full rounded-full ${isWin ? "bg-emerald-500" : "bg-rose-500"}`}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        {/* Fade hint when there are many cards */}
        {sorted.length > 8 && (
          <div className="pointer-events-none absolute right-0 top-0 h-full w-12 bg-gradient-to-l from-background to-transparent" />
        )}
      </div>
    </div>
  );
}

function dayLabel(dateStr: string) {
  const [y, m, d] = dateStr.split("T")[0].split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short" });
}

function shortDate(dateStr: string) {
  const [y, m, d] = dateStr.split("T")[0].split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
