import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileUp, Trash2, Zap, CalendarDays, BarChart2, Filter, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadIntradayModal } from "@/components/intraday/UploadIntradayModal";
import { PerformanceStrip } from "@/components/intraday/PerformanceStrip";
import { DailyPlanTab } from "@/components/intraday/DailyPlanTab";
import { PlanAnalyticsTab } from "@/components/intraday/PlanAnalyticsTab";
import { intradayApi } from "@/services/intradayApi";
import { dailyPlanApi } from "@/services/dailyPlanApi";
import { currency } from "@/lib/utils";
import type { IntradaySessionSummary } from "@/types";

type Period = "7D" | "30D" | "3M" | "All";
type MainTab = "sessions" | "daily-plan" | "analytics";

const PERIODS: Period[] = ["7D", "30D", "3M", "All"];

function filterByPeriod(sessions: IntradaySessionSummary[], period: Period) {
  if (period === "All") return sessions;
  const days = period === "7D" ? 7 : period === "30D" ? 30 : 90;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return sessions.filter((s) => new Date(s.sessionDate) >= cutoff);
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${active ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// ── Global filter bar ──────────────────────────────────────────────────────

function IntradayFilterBar({
  filterDate, setFilterDate,
  filterSymbols, setFilterSymbols,
}: {
  filterDate: string;
  setFilterDate: (d: string) => void;
  filterSymbols: string[];
  setFilterSymbols: (s: string[]) => void;
}) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const isActive = !!filterDate || filterSymbols.length > 0;

  function addSymbol(raw: string) {
    const sym = raw.trim().toUpperCase();
    if (!sym || filterSymbols.includes(sym) || filterSymbols.length >= 4) return;
    setFilterSymbols([...filterSymbols, sym]);
    setInput("");
  }

  function removeSymbol(sym: string) {
    setFilterSymbols(filterSymbols.filter((s) => s !== sym));
  }

  function clearAll() {
    setFilterDate("");
    setFilterSymbols([]);
    setInput("");
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 rounded-xl border px-4 py-3 transition-colors ${isActive ? "border-blue-400 bg-blue-50/50 dark:border-blue-700 dark:bg-blue-950/20" : "border-border bg-muted/40"}`}>
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Filter size={13} />
        <span>Focus</span>
      </div>

      {/* Date picker */}
      <input
        type="date"
        value={filterDate}
        onChange={(e) => setFilterDate(e.target.value)}
        className="rounded-md border border-input bg-background px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
      />

      {/* Symbol chips */}
      {filterSymbols.map((sym) => (
        <span
          key={sym}
          className="flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800 dark:bg-blue-900/50 dark:text-blue-300"
        >
          {sym}
          <button onClick={() => removeSymbol(sym)} className="hover:text-rose-500 transition">
            <X size={11} />
          </button>
        </span>
      ))}

      {/* Symbol input */}
      {filterSymbols.length < 4 && (
        <input
          ref={inputRef}
          type="text"
          value={input}
          placeholder="+ Add symbol (Enter)"
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addSymbol(input); }
          }}
          className="w-36 rounded-md border border-input bg-background px-2.5 py-1 text-xs placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
        />
      )}

      {isActive && (
        <button
          onClick={clearAll}
          className="ml-auto text-xs text-muted-foreground hover:text-rose-500 transition font-medium"
        >
          Clear filter
        </button>
      )}
    </div>
  );
}

export function IntradayPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<MainTab>("sessions");
  const [sessions, setSessions] = useState<IntradaySessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [period, setPeriod] = useState<Period>("30D");

  // Global focus filter
  const [filterDate, setFilterDate] = useState("");
  const [filterSymbols, setFilterSymbols] = useState<string[]>([]);

  // When a date is selected, auto-populate symbols from the daily plan for that date
  useEffect(() => {
    if (!filterDate) { setFilterSymbols([]); return; }
    dailyPlanApi.getByDate(filterDate).then((plans) => {
      if (plans.length > 0) setFilterSymbols(plans.map((p) => p.symbol));
    }).catch(() => {});
  }, [filterDate]);

  async function load() {
    setLoading(true);
    try {
      setSessions(await intradayApi.getSessions());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function deleteSession(id: string, date: string) {
    if (!window.confirm(`Delete session for ${formatDate(date)}? This will remove all executions and matched trades.`)) return;
    await intradayApi.deleteSession(id);
    void load();
  }

  // Apply focus filter to sessions list
  const focusFiltered = sessions.filter((s) => {
    if (filterDate && !s.sessionDate.startsWith(filterDate)) return false;
    if (filterSymbols.length > 0) {
      const upper = filterSymbols.map((x) => x.toUpperCase());
      if (!upper.some((sym) => s.symbols.map((x) => x.toUpperCase()).includes(sym))) return false;
    }
    return true;
  });
  const filtered = filterByPeriod(focusFiltered, period);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Intraday</h2>
          <p className="text-sm text-muted-foreground">Track sessions from Robinhood imports and log your daily stock watchlist.</p>
        </div>
        {tab === "sessions" && (
          <Button onClick={() => setUploadOpen(true)}>
            <FileUp size={16} /> Upload Statement
          </Button>
        )}
      </div>

      {/* Focus filter */}
      <IntradayFilterBar
        filterDate={filterDate}
        setFilterDate={setFilterDate}
        filterSymbols={filterSymbols}
        setFilterSymbols={setFilterSymbols}
      />

      {/* Main tabs */}
      <div className="flex items-center gap-1 w-fit rounded-lg bg-muted p-1">
        <TabBtn active={tab === "sessions"} onClick={() => setTab("sessions")}>
          <span className="flex items-center gap-1.5"><Zap size={14} /> Sessions</span>
        </TabBtn>
        <TabBtn active={tab === "daily-plan"} onClick={() => setTab("daily-plan")}>
          <span className="flex items-center gap-1.5"><CalendarDays size={14} /> Daily Plan</span>
        </TabBtn>
        <TabBtn active={tab === "analytics"} onClick={() => setTab("analytics")}>
          <span className="flex items-center gap-1.5"><BarChart2 size={14} /> Plan Analytics</span>
        </TabBtn>
      </div>

      {tab === "daily-plan" && (
        <DailyPlanTab
          filterDate={filterDate || undefined}
          filterSymbols={filterSymbols.length > 0 ? filterSymbols : undefined}
        />
      )}
      {tab === "analytics" && (
        <PlanAnalyticsTab
          filterDate={filterDate || undefined}
          filterSymbols={filterSymbols.length > 0 ? filterSymbols : undefined}
        />
      )}

      {tab === "sessions" && (
        <>
          {/* Period tabs + performance strip */}
          {!loading && sessions.length > 0 && (
            <Card>
              <CardContent className="space-y-4 pt-5">
                <div className="flex items-center gap-1 w-fit rounded-lg bg-muted p-1">
                  {PERIODS.map((p) => (
                    <button
                      key={p}
                      className={`rounded-md px-3 py-1 text-sm font-semibold transition-colors ${
                        period === p
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => setPeriod(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <PerformanceStrip sessions={filtered} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap size={18} className="text-emerald-600" /> Trading sessions
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="py-3">Date</th>
                    <th>Symbols traded</th>
                    <th>Executions</th>
                    <th>Closed trades</th>
                    <th>Total P&amp;L</th>
                    <th>Win rate</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">Loading sessions...</td></tr>
                  )}
                  {!loading && sessions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-16 text-center">
                        <p className="font-semibold text-muted-foreground">No sessions yet</p>
                        <p className="mt-1 text-xs text-muted-foreground">Upload a Robinhood Transaction Confirmation PDF to get started.</p>
                        <Button className="mt-4" onClick={() => setUploadOpen(true)}>
                          <FileUp size={16} /> Upload first session
                        </Button>
                      </td>
                    </tr>
                  )}
                  {!loading && filtered.length === 0 && sessions.length > 0 && (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-muted-foreground">
                        No sessions in this period. Try a wider range.
                      </td>
                    </tr>
                  )}
                  {!loading && filtered.map((session) => {
                    const winRate = (session.winCount + session.lossCount) > 0
                      ? Math.round((session.winCount / (session.winCount + session.lossCount)) * 100)
                      : 0;
                    return (
                      <tr
                        key={session.id}
                        className="cursor-pointer border-b border-border/70 transition hover:bg-muted/60"
                        onClick={() => navigate(`/intraday/${session.id}`)}
                      >
                        <td className="py-4 font-black">
                          {formatDate(session.sessionDate)}
                          <p className="text-xs font-normal text-muted-foreground">{session.broker}</p>
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            {session.symbols.slice(0, 5).map((s) => (
                              <Badge key={s} tone="slate">{s}</Badge>
                            ))}
                            {session.symbols.length > 5 && (
                              <Badge tone="slate">+{session.symbols.length - 5}</Badge>
                            )}
                          </div>
                        </td>
                        <td>{session.totalExecutions}</td>
                        <td>
                          <span className="text-emerald-600">{session.winCount}W</span>{" "}
                          <span className="text-rose-600">{session.lossCount}L</span>
                        </td>
                        <td className={`font-bold ${session.totalPnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {currency.format(session.totalPnl)}
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{ width: `${winRate}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold">{winRate}%</span>
                          </div>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                            onClick={() => deleteSession(session.id, session.sessionDate)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      <UploadIntradayModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onImported={() => { void load(); }}
      />
    </div>
  );
}

function formatDate(dateStr: string) {
  try {
    const [y, m, d] = dateStr.split("T")[0].split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}
