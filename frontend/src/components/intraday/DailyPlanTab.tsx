import { useCallback, useEffect, useState } from "react";
import {
  Plus, Pencil, Trash2, TrendingUp, TrendingDown, Minus,
  AlertTriangle, BarChart2, Download, ArrowDownCircle, ArrowUpCircle, Clock,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddStockPlanModal } from "@/components/intraday/AddStockPlanModal";
import { AddLegModal } from "@/components/intraday/AddLegModal";
import { dailyPlanApi } from "@/services/dailyPlanApi";
import { intradayApi } from "@/services/intradayApi";
import { currency } from "@/lib/utils";
import type { DailyStockPlan, DailyPlanLeg, WeeklyPlanStats } from "@/types";

type SubTab = "daily" | "weekly";

function todayIso() { return new Date().toISOString().split("T")[0]; }

function getMondayOf(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const diff = d.getDay() === 0 ? -6 : 1 - d.getDay();
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

function formatDate(d: string) {
  const [y, m, day] = d.split("T")[0].split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

const LEG_TYPE_LABELS: Record<string, string> = {
  Entry: "Entry", AddToPosition: "Add", PartialExit: "Partial Exit",
  StopLossExit: "Stop Loss", FullExit: "Full Exit",
};

const DIRECTION_LABELS: Record<string, string> = {
  TrendingUp: "Trending Up", TrendingDown: "Trending Down", Choppy: "Choppy", RangeBound: "Range-bound",
};

const RESULT_LABELS: Record<string, string> = {
  FollowedPlan: "Followed Plan", BrokeRule: "Broke Rule", Partial: "Partial",
};

function DirectionIcon({ dir }: { dir: string }) {
  if (dir === "TrendingUp") return <TrendingUp size={13} className="text-emerald-500" />;
  if (dir === "TrendingDown") return <TrendingDown size={13} className="text-rose-500" />;
  return <Minus size={13} className="text-amber-500" />;
}

// ── Leg row ────────────────────────────────────────────────────────────────

function LegRow({ leg, onDelete }: { leg: DailyPlanLeg; onDelete: () => void }) {
  const isBuy = leg.action === "Buy";
  const isExit = leg.action === "Sell";
  const hasRealizedPnl = isExit && leg.realizedPnl !== 0;

  return (
    <div className="flex items-start gap-3 py-2">
      {/* Timeline dot */}
      <div className="flex flex-col items-center">
        <div className={`mt-0.5 h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 ${isBuy ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60" : "bg-rose-100 text-rose-600 dark:bg-rose-950/60"}`}>
          {isBuy ? <ArrowDownCircle size={15} /> : <ArrowUpCircle size={15} />}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-muted-foreground">{formatTime(leg.time)}</span>
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${isBuy ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400" : "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400"}`}>
              {leg.action}
            </span>
            <span className="text-xs text-muted-foreground">{LEG_TYPE_LABELS[leg.legType] ?? leg.legType}</span>
          </div>
          <button onClick={onDelete} className="text-muted-foreground/50 hover:text-rose-500 transition flex-shrink-0">
            <Trash2 size={12} />
          </button>
        </div>
        <div className="mt-0.5 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-black">{leg.quantity} <span className="font-normal text-muted-foreground text-xs">shares @</span> ${leg.price}</span>
          {hasRealizedPnl && (
            <span className={`text-xs font-bold ${leg.realizedPnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {leg.realizedPnl >= 0 ? "+" : ""}{currency.format(leg.realizedPnl)}
            </span>
          )}
        </div>
        {leg.notes && <p className="mt-0.5 text-xs text-muted-foreground italic">{leg.notes}</p>}
      </div>
    </div>
  );
}

// ── Stock card ─────────────────────────────────────────────────────────────

function StockCard({
  plan, onEdit, onDelete, onPlanUpdated,
}: {
  plan: DailyStockPlan;
  onEdit: () => void;
  onDelete: () => void;
  onPlanUpdated: (p: DailyStockPlan) => void;
}) {
  const [legModalOpen, setLegModalOpen] = useState(false);

  const pnlColor = plan.pnl > 0 ? "text-emerald-600" : plan.pnl < 0 ? "text-rose-600" : "text-muted-foreground";
  const maxLossBreached = plan.outcome === "Loss" && Math.abs(plan.pnl) > plan.maxLossAllowed;
  const totalBuyQty = plan.legs.filter((l) => l.action === "Buy").reduce((s, l) => s + l.quantity, 0);
  const totalSellQty = plan.legs.filter((l) => l.action === "Sell").reduce((s, l) => s + l.quantity, 0);

  async function deleteLeg(legId: string) {
    if (!window.confirm("Remove this leg?")) return;
    const updated = await dailyPlanApi.deleteLeg(legId);
    onPlanUpdated(updated);
  }

  return (
    <Card className={maxLossBreached ? "border-rose-400 dark:border-rose-700" : ""}>
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg font-black">{plan.symbol}</span>
            <Badge tone={plan.outcome === "Win" ? "green" : plan.outcome === "Loss" ? "red" : plan.outcome === "Breakeven" ? "amber" : "slate"}>
              {plan.outcome}
            </Badge>
            {!plan.isClosed && plan.legs.length > 0 && (
              <span className="text-xs font-semibold text-amber-500 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">Open</span>
            )}
            {maxLossBreached && (
              <span className="flex items-center gap-1 text-xs text-rose-500">
                <AlertTriangle size={12} /> Over limit
              </span>
            )}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}><Pencil size={13} /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500 hover:bg-rose-50 hover:text-rose-700" onClick={onDelete}><Trash2 size={13} /></Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pb-4">
        {/* Position summary */}
        {plan.legs.length > 0 && (
          <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs">
            <div>
              <p className="text-muted-foreground">Avg entry</p>
              <p className="font-bold">{plan.avgEntryPrice > 0 ? `$${plan.avgEntryPrice.toFixed(2)}` : "–"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Open qty</p>
              <p className="font-bold">{plan.openQty > 0 ? plan.openQty : "–"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Realized P&L</p>
              <p className={`font-bold ${plan.realizedPnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {plan.realizedPnl !== 0 ? (plan.realizedPnl >= 0 ? "+" : "") + currency.format(plan.realizedPnl) : "–"}
              </p>
            </div>
          </div>
        )}

        {/* Total P&L */}
        {plan.legs.length > 0 && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span>Bought: <span className="font-semibold text-foreground">{totalBuyQty}</span></span>
              <span>Sold: <span className="font-semibold text-foreground">{totalSellQty}</span></span>
              {plan.stopLossPrice > 0 && <span>SL: <span className="font-semibold text-foreground">${plan.stopLossPrice}</span></span>}
            </div>
            <span className={`text-base font-black ${pnlColor}`}>
              {plan.pnl !== 0 ? (plan.pnl >= 0 ? "+" : "") + currency.format(plan.pnl) : "–"}
            </span>
          </div>
        )}

        {/* Legs timeline */}
        {plan.legs.length > 0 ? (
          <div className="divide-y divide-border/50">
            {plan.legs.map((leg) => (
              <LegRow key={leg.id} leg={leg} onDelete={() => deleteLeg(leg.id)} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-2">No legs yet. Add your first trade execution.</p>
        )}

        {/* Add leg button */}
        <button
          onClick={() => setLegModalOpen(true)}
          className="w-full rounded-lg border border-dashed border-border py-2 text-xs font-semibold text-muted-foreground hover:border-blue-400 hover:text-blue-500 transition"
        >
          <Plus size={13} className="inline mr-1" /> Add execution
        </button>

        {/* Context tags */}
        <div className="flex flex-wrap gap-1.5">
          <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
            <DirectionIcon dir={plan.marketDirection} />{DIRECTION_LABELS[plan.marketDirection]}
          </span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{plan.sectorBehavior} sector</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${plan.resultVsPlan === "BrokeRule" ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400" : "bg-muted"}`}>
            {RESULT_LABELS[plan.resultVsPlan]}
          </span>
          {plan.entryTime && (
            <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
              <Clock size={11} className="text-muted-foreground" />
              {formatTime(plan.entryTime)}
            </span>
          )}
        </div>

        {plan.behaviorNotes && (
          <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground italic leading-relaxed">"{plan.behaviorNotes}"</p>
        )}
      </CardContent>

      <AddLegModal
        open={legModalOpen}
        onOpenChange={setLegModalOpen}
        planId={plan.id}
        symbol={plan.symbol}
        onSaved={onPlanUpdated}
      />
    </Card>
  );
}

// ── Daily Log ──────────────────────────────────────────────────────────────

function DailyLog({ filterDate, filterSymbols }: {
  filterDate?: string;
  filterSymbols?: string[];
}) {
  const [date, setDate] = useState(filterDate ?? todayIso());
  const [plans, setPlans] = useState<DailyStockPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [addingSymbol, setAddingSymbol] = useState<string | null>(null);
  const [sessionSymbols, setSessionSymbols] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DailyStockPlan | undefined>();

  useEffect(() => { if (filterDate) setDate(filterDate); }, [filterDate]);

  const load = useCallback(async () => {
    setLoading(true);
    try { setPlans(await dailyPlanApi.getByDate(date)); }
    finally { setLoading(false); }
  }, [date]);

  // Load session symbols whenever date changes so we can show "add from session" chips
  useEffect(() => {
    setSessionSymbols([]);
    intradayApi.getSessions().then((sessions) => {
      const match = sessions.find((s) => s.sessionDate.startsWith(date));
      if (match) setSessionSymbols(match.symbols);
    }).catch(() => {});
  }, [date]);

  useEffect(() => { void load(); }, [load]);

  function updatePlan(updated: DailyStockPlan) {
    setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  async function importFromSession() {
    setImporting(true);
    try {
      const synced = await dailyPlanApi.importFromSession(date);
      if (synced.length === 0) {
        alert("None of your planned stocks had executions in the session for this date.");
      } else {
        setPlans((prev) => prev.map((p) => synced.find((s) => s.id === p.id) ?? p));
      }
    } catch {
      alert("No session found for this date. Upload a Robinhood statement first.");
    } finally { setImporting(false); }
  }

  async function addFromSession(symbol: string) {
    setAddingSymbol(symbol);
    try {
      const result = await dailyPlanApi.importFromSession(date, symbol);
      if (result.length > 0) {
        setPlans((prev) => {
          const updated = result[0];
          return prev.some((p) => p.id === updated.id)
            ? prev.map((p) => p.id === updated.id ? updated : p)
            : [...prev, updated];
        });
      }
    } catch {
      alert("Could not import. Make sure a session exists for this date.");
    } finally { setAddingSymbol(null); }
  }

  async function deletePlan(id: string) {
    if (!window.confirm("Remove this stock entry?")) return;
    await dailyPlanApi.delete(id);
    setPlans((prev) => prev.filter((p) => p.id !== id));
  }

  const upperFilterSymbols = filterSymbols && filterSymbols.length > 0
    ? filterSymbols.map((s) => s.toUpperCase()) : null;
  const displayedPlans = upperFilterSymbols
    ? plans.filter((p) => upperFilterSymbols.includes(p.symbol.toUpperCase()))
    : plans;

  const dayPnl = displayedPlans.reduce((s, p) => s + p.pnl, 0);
  const traded = displayedPlans.filter((p) => p.outcome !== "Skipped");
  const wins = traded.filter((p) => p.outcome === "Win").length;
  const ruleBreaks = displayedPlans.filter((p) => p.resultVsPlan === "BrokeRule").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {!filterDate && (
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-muted-foreground">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        )}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={importFromSession} disabled={importing || plans.length >= 4}>
            <Download size={14} /> {importing ? "Syncing..." : "Sync from session"}
          </Button>
          <Button size="sm" onClick={() => { setEditing(undefined); setModalOpen(true); }} disabled={plans.length >= 4}>
            <Plus size={14} /> Add manually {plans.length >= 4 && "(max 4)"}
          </Button>
        </div>
      </div>

      {!loading && displayedPlans.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Day P&L", value: currency.format(dayPnl), color: dayPnl >= 0 ? "text-emerald-600" : "text-rose-600" },
            { label: "Stocks", value: `${displayedPlans.length} / 4`, color: "" },
            { label: "Win rate", value: traded.length > 0 ? `${Math.round((wins / traded.length) * 100)}%` : "–", color: "" },
            { label: "Rule breaks", value: String(ruleBreaks), color: ruleBreaks > 0 ? "text-rose-600" : "text-muted-foreground" },
          ].map(({ label, value, color }) => (
            <Card key={label}><CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-xl font-black ${color}`}>{value}</p>
            </CardContent></Card>
          ))}
        </div>
      )}

      {loading && <p className="py-10 text-center text-sm text-muted-foreground">Loading...</p>}

      {/* Session symbol picker — stocks traded today that aren't in the plan yet */}
      {!loading && !filterDate && plans.length < 4 && sessionSymbols.length > 0 && (() => {
        const available = sessionSymbols.filter(
          (sym) => !plans.some((p) => p.symbol.toUpperCase() === sym.toUpperCase())
        );
        if (available.length === 0) return null;
        return (
          <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">
                Session stocks for this date — click to add to your plan:
              </p>
              <div className="flex flex-wrap gap-2">
                {available.map((sym) => (
                  <button
                    key={sym}
                    onClick={() => addFromSession(sym)}
                    disabled={addingSymbol === sym || plans.length >= 4}
                    className="rounded-full border border-blue-300 bg-white px-3 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300"
                  >
                    {addingSymbol === sym ? "Adding…" : `+ ${sym}`}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {!loading && displayedPlans.length === 0 && (
        <Card><CardContent className="py-14 text-center">
          <p className="font-semibold text-muted-foreground">
            {upperFilterSymbols ? "No matching stocks logged for this day" : "No stocks logged for this day"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {sessionSymbols.length > 0 ? "Click a stock above to add it from today's session, or add manually." : "Import from a session or log manually. Max 4 stocks per day."}
          </p>
          {!filterDate && sessionSymbols.length === 0 && (
            <div className="mt-4 flex justify-center gap-2">
              <Button variant="outline" size="sm" onClick={importFromSession} disabled={importing}>
                <Download size={14} /> {importing ? "Syncing..." : "Sync from session"}
              </Button>
              <Button size="sm" onClick={() => { setEditing(undefined); setModalOpen(true); }}>
                <Plus size={14} /> Add manually
              </Button>
            </div>
          )}
        </CardContent></Card>
      )}

      {!loading && displayedPlans.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {displayedPlans.map((plan) => (
            <StockCard
              key={plan.id}
              plan={plan}
              onEdit={() => { setEditing(plan); setModalOpen(true); }}
              onDelete={() => deletePlan(plan.id)}
              onPlanUpdated={updatePlan}
            />
          ))}
        </div>
      )}

      <AddStockPlanModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSaved={(plan) => { setPlans((prev) => editing ? prev.map((p) => p.id === plan.id ? plan : p) : [...prev, plan]); }}
        editing={editing}
        defaultDate={date}
      />
    </div>
  );
}

// ── Weekly Review ──────────────────────────────────────────────────────────

function WeeklyReview() {
  const [weekStart, setWeekStart] = useState(() => getMondayOf(todayIso()));
  const [stats, setStats] = useState<WeeklyPlanStats | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setStats(await dailyPlanApi.getWeeklyStats(weekStart)); }
    finally { setLoading(false); }
  }, [weekStart]);

  useEffect(() => { void load(); }, [load]);

  function shiftWeek(delta: number) {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() + delta * 7);
    setWeekStart(d.toISOString().split("T")[0]);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => shiftWeek(-1)}>← Prev</Button>
        <span className="text-sm font-semibold">
          {stats ? `${formatDate(stats.weekStart)} – ${formatDate(stats.weekEnd)}` : "Week of " + formatDate(weekStart)}
        </span>
        <Button variant="outline" size="sm" onClick={() => shiftWeek(1)}>Next →</Button>
      </div>

      {loading && <p className="py-10 text-center text-sm text-muted-foreground">Loading...</p>}

      {!loading && stats && stats.totalTrades === 0 && (
        <Card><CardContent className="py-14 text-center">
          <BarChart2 size={32} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="font-semibold text-muted-foreground">No trades logged this week</p>
        </CardContent></Card>
      )}

      {!loading && stats && stats.totalTrades > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Week P&L", value: currency.format(stats.totalPnl), color: stats.totalPnl >= 0 ? "text-emerald-600" : "text-rose-600" },
              { label: "Win rate", value: `${Math.round(stats.winRate)}%`, color: stats.winRate >= 50 ? "text-emerald-600" : "text-rose-600" },
              { label: "W / L", value: `${stats.totalWins} / ${stats.totalLosses}`, color: "" },
              { label: "Rule breaks", value: String(stats.ruleBreaks), color: stats.ruleBreaks > 0 ? "text-rose-600" : "text-muted-foreground" },
            ].map(({ label, value, color }) => (
              <Card key={label}><CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`text-xl font-black ${color}`}>{value}</p>
              </CardContent></Card>
            ))}
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm font-bold">P&amp;L by Symbol</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats.symbolStats} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <XAxis dataKey="symbol" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${v}`} />
                  <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, "P&L"]} />
                  <Bar dataKey="totalPnl" radius={[4, 4, 0, 0]}>
                    {stats.symbolStats.map((s) => <Cell key={s.symbol} fill={s.totalPnl >= 0 ? "#10b981" : "#f43f5e"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm font-bold">Win Rate by Symbol</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats.symbolStats} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <XAxis dataKey="symbol" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
                  <Tooltip formatter={(v: number) => [`${v.toFixed(0)}%`, "Win rate"]} />
                  <Bar dataKey="winRate" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm font-bold">Symbol Breakdown</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-left text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="py-2">Symbol</th><th>W / L / Skip</th>
                    <th>Win rate</th><th>Rule breaks</th><th>P&amp;L</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.symbolStats.map((s) => (
                    <tr key={s.symbol} className="border-b border-border/60">
                      <td className="py-3 font-black">{s.symbol}</td>
                      <td>
                        <span className="text-emerald-600">{s.wins}W</span>{" "}
                        <span className="text-rose-600">{s.losses}L</span>{" "}
                        <span className="text-muted-foreground">{s.skipped}S</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${s.winRate}%` }} />
                          </div>
                          <span className="text-xs font-semibold">{Math.round(s.winRate)}%</span>
                        </div>
                      </td>
                      <td>{s.ruleBreaks > 0 ? <span className="flex items-center gap-1 text-rose-500 text-xs"><AlertTriangle size={12} />{s.ruleBreaks}</span> : <span className="text-muted-foreground text-xs">–</span>}</td>
                      <td className={`font-bold ${s.totalPnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {s.totalPnl >= 0 ? "+" : ""}{currency.format(s.totalPnl)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {stats.symbolStats.some((s) => s.ruleBreaks > 0) && (
            <Card>
              <CardHeader><CardTitle className="text-sm font-bold flex items-center gap-2"><AlertTriangle size={14} className="text-rose-500" /> Rule Adherence</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={stats.symbolStats} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <XAxis dataKey="symbol" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip /><Legend />
                    <Bar dataKey="wins" name="Wins" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ruleBreaks" name="Rule Breaks" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ── Main Tab ───────────────────────────────────────────────────────────────

function SubTabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${active ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
      onClick={onClick}
    >{children}</button>
  );
}

export function DailyPlanTab({ filterDate, filterSymbols }: {
  filterDate?: string;
  filterSymbols?: string[];
} = {}) {
  const [sub, setSub] = useState<SubTab>("daily");
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1 w-fit rounded-lg bg-muted p-1">
        <SubTabBtn active={sub === "daily"} onClick={() => setSub("daily")}>Daily Log</SubTabBtn>
        <SubTabBtn active={sub === "weekly"} onClick={() => setSub("weekly")}>Weekly Review</SubTabBtn>
      </div>
      {sub === "daily"
        ? <DailyLog filterDate={filterDate} filterSymbols={filterSymbols} />
        : <WeeklyReview />}
    </div>
  );
}
