import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronRight, Eye, PlusCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { intradayApi } from "@/services/intradayApi";
import { dailyPlanApi } from "@/services/dailyPlanApi";
import { currency } from "@/lib/utils";
import type { IntradaySession, IntradayTradeEntry } from "@/types";

type Tab = "trades" | "executions";

export function IntradaySessionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<IntradaySession>();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("trades");
  const [expanded, setExpanded] = useState<string[]>([]);
  const [symbolFilter, setSymbolFilter] = useState("All");
  const [planSymbols, setPlanSymbols] = useState<string[]>([]);
  // Default to showing all when no plan exists so "Add to Plan" buttons are immediately visible
  const [showAllSymbols, setShowAllSymbols] = useState(true);
  const [addingToPlan, setAddingToPlan] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    intradayApi.getSession(id)
      .then((s) => {
        setSession(s);
        // Load daily plan for this date to scope the view automatically
        const date = s.sessionDate.split("T")[0];
        dailyPlanApi.getByDate(date).then((plans) => {
          if (plans.length > 0) {
            setPlanSymbols(plans.map((p) => p.symbol.toUpperCase()));
            setShowAllSymbols(false); // plan exists → default to plan-only view
          }
          // no plan → showAllSymbols stays true so "Add to Plan" buttons are visible
        }).catch(() => {});
      })
      .catch(() => navigate("/intraday"))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  function toggleExpanded(symbol: string) {
    setExpanded((prev) => prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]);
  }

  async function addToPlan(symbol: string) {
    if (!session) return;
    setAddingToPlan(symbol);
    try {
      const date = session.sessionDate.split("T")[0];
      await dailyPlanApi.importFromSession(date, symbol);
      setPlanSymbols((prev) => [...prev, symbol.toUpperCase()]);
    } catch {
      alert("Could not add to plan. Please try again.");
    } finally {
      setAddingToPlan(null);
    }
  }

  if (loading) {
    return <div className="py-20 text-center text-muted-foreground">Loading session...</div>;
  }

  if (!session) return null;

  // When a daily plan exists, scope to plan stocks only (unless user opted to show all)
  const isPlanFiltered = planSymbols.length > 0 && !showAllSymbols;
  const baseTrades = isPlanFiltered
    ? session.intradayTrades.filter((t) => planSymbols.includes(t.symbol.toUpperCase()))
    : session.intradayTrades;

  const planStocksWithExecutions = planSymbols.filter((sym) =>
    session.intradayTrades.some((t) => t.symbol.toUpperCase() === sym)
  );

  const filteredTrades = symbolFilter === "All"
    ? baseTrades
    : baseTrades.filter((t) => t.symbol === symbolFilter);

  const allExecutions = baseTrades.flatMap((t) => t.executions)
    .sort((a, b) => a.sequenceOrder - b.sequenceOrder);

  const filteredExecutions = symbolFilter === "All"
    ? allExecutions
    : allExecutions.filter((e) => e.symbol === symbolFilter);

  // KPIs reflect the plan-scoped data
  const totalPnl = baseTrades.reduce((s, t) => s + t.pnl, 0);
  const winCount = baseTrades.filter((t) => t.pnl > 0).length;
  const lossCount = baseTrades.filter((t) => t.pnl < 0).length;
  const winRate = (winCount + lossCount) > 0
    ? Math.round((winCount / (winCount + lossCount)) * 100)
    : 0;

  const displaySymbols = isPlanFiltered
    ? session.symbols.filter((s) => planSymbols.includes(s.toUpperCase()))
    : session.symbols;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/intraday")}>
          <ArrowLeft size={18} />
        </Button>
        <div>
          <h2 className="text-2xl font-black tracking-tight">{formatDate(session.sessionDate)}</h2>
          <p className="text-sm text-muted-foreground">{session.broker} · {session.totalExecutions} executions</p>
        </div>
      </div>

      {/* Plan filter notice */}
      {planSymbols.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 dark:border-blue-800 dark:bg-blue-950/30">
          <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
            {showAllSymbols
              ? `Showing all ${session.symbols.length} stocks from this session`
              : `Showing ${planStocksWithExecutions.length} of your ${planSymbols.length} planned stocks that executed · ${session.symbols.length - planStocksWithExecutions.length} other session stocks hidden`}
          </p>
          <button
            onClick={() => { setShowAllSymbols((v) => !v); setSymbolFilter("All"); }}
            className="ml-4 flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 transition flex-shrink-0"
          >
            <Eye size={12} />
            {showAllSymbols ? "Show plan only" : "Show all session data"}
          </button>
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <KpiCard label="Total P&L" value={currency.format(totalPnl)} positive={totalPnl >= 0} />
        <KpiCard label="Win rate" value={`${winRate}%`} positive={winRate >= 50} />
        <KpiCard label="Winners" value={`${winCount}`} positive />
        <KpiCard label="Losers" value={`${lossCount}`} positive={false} neutral={lossCount === 0} />
        <KpiCard label="Symbols" value={`${baseTrades.length}`} positive />
      </div>

      {/* Symbol filter pills */}
      <div className="flex flex-wrap gap-2">
        {["All", ...displaySymbols].map((sym) => (
          <button
            key={sym}
            type="button"
            onClick={() => setSymbolFilter(sym)}
            className="rounded-full"
          >
            <Badge tone={symbolFilter === sym ? "blue" : "slate"}>{sym}</Badge>
          </button>
        ))}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-xl border border-border bg-muted p-1 w-fit">
        <TabBtn active={tab === "trades"} onClick={() => setTab("trades")}>Matched Trades</TabBtn>
        <TabBtn active={tab === "executions"} onClick={() => setTab("executions")}>Raw Executions</TabBtn>
      </div>

      {tab === "trades" && (
        <div className="space-y-3">
          {filteredTrades.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No trades for this symbol.</p>
          )}
          {filteredTrades.map((trade) => {
            const inPlan = planSymbols.includes(trade.symbol.toUpperCase());
            return (
              <TradeCard
                key={trade.id}
                trade={trade}
                expanded={expanded.includes(trade.symbol)}
                onToggle={() => toggleExpanded(trade.symbol)}
                inPlan={inPlan}
                onAddToPlan={!inPlan ? () => addToPlan(trade.symbol) : undefined}
                adding={addingToPlan === trade.symbol}
              />
            );
          })}
        </div>
      )}

      {tab === "executions" && (
        <Card>
          <CardHeader>
            <CardTitle>Raw executions ({filteredExecutions.length})</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-3">#</th>
                  <th>Symbol</th>
                  <th>Side</th>
                  <th>Price</th>
                  <th>Qty</th>
                  <th>Principal</th>
                  <th>Fees</th>
                  <th>Net</th>
                </tr>
              </thead>
              <tbody>
                {filteredExecutions.map((exec) => (
                  <tr key={exec.id} className="border-b border-border/70 last:border-0">
                    <td className="py-3 text-muted-foreground">{exec.sequenceOrder + 1}</td>
                    <td className="font-black">{exec.symbol}</td>
                    <td>
                      <Badge tone={exec.side === "Buy" ? "blue" : "amber"}>{exec.side}</Badge>
                    </td>
                    <td>{currency.format(exec.price)}</td>
                    <td>{exec.quantity}</td>
                    <td>{currency.format(exec.principal)}</td>
                    <td className="text-muted-foreground">{exec.fees > 0 ? currency.format(exec.fees) : "—"}</td>
                    <td>{currency.format(exec.netAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TradeCard({ trade, expanded, onToggle, inPlan, onAddToPlan, adding }: {
  trade: IntradayTradeEntry;
  expanded: boolean;
  onToggle: () => void;
  inPlan?: boolean;
  onAddToPlan?: () => void;
  adding?: boolean;
}) {
  const outcomeColor = trade.pnl > 0 ? "text-emerald-600" : trade.pnl < 0 ? "text-rose-600" : "text-muted-foreground";
  const outcomeTone = trade.pnl > 0 ? "green" : trade.pnl < 0 ? "red" : "slate";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: chevron + symbol info — clicking this row toggles expand */}
          <div
            role="button"
            tabIndex={0}
            className="flex flex-1 cursor-pointer items-center gap-3 text-left"
            onClick={onToggle}
            onKeyDown={(e) => e.key === "Enter" && onToggle()}
          >
            {expanded ? <ChevronDown size={18} className="shrink-0" /> : <ChevronRight size={18} className="shrink-0" />}
            <div>
              <p className="text-base font-black">
                {trade.symbol}
                <span className="ml-2 text-sm font-normal text-muted-foreground">{trade.companyName}</span>
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <Badge tone={outcomeTone}>{trade.outcome}</Badge>
                {inPlan && <Badge tone="blue">In plan</Badge>}
                {!trade.isFullyClosed && <Badge tone="amber">{trade.openBuyQty} sh open</Badge>}
                {trade.priorPositionSellQty > 0 && <Badge tone="slate">{trade.priorPositionSellQty} sh prior pos.</Badge>}
              </div>
            </div>
          </div>

          {/* Right: Add to Plan button + P&L */}
          <div className="flex items-center gap-3 shrink-0">
            {onAddToPlan && (
              <button
                type="button"
                onClick={onAddToPlan}
                disabled={adding}
                className="flex items-center gap-1 rounded-lg border border-blue-300 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
              >
                <PlusCircle size={12} />
                {adding ? "Adding..." : "Add to Plan"}
              </button>
            )}
            <div className="text-right">
              <p className={`text-lg font-black ${outcomeColor}`}>{trade.matchedQty > 0 ? currency.format(trade.pnl) : "—"}</p>
              <p className="text-xs text-muted-foreground">{trade.matchedQty} sh matched</p>
            </div>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="border-t border-border pt-4">
          <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat label="Avg buy" value={trade.avgBuyPrice > 0 ? currency.format(trade.avgBuyPrice) : "—"} />
            <Stat label="Avg sell" value={trade.avgSellPrice > 0 ? currency.format(trade.avgSellPrice) : "—"} />
            <Stat label="Total bought" value={`${trade.totalBuyQty} sh`} />
            <Stat label="Total sold" value={`${trade.totalSellQty} sh`} />
          </div>
          <p className="mb-2 text-xs font-bold uppercase text-muted-foreground">Executions</p>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2">#</th>
                <th>Side</th>
                <th>Price</th>
                <th>Qty</th>
                <th>Net Amount</th>
              </tr>
            </thead>
            <tbody>
              {trade.executions.map((exec) => (
                <tr key={exec.id} className="border-b border-border/70 last:border-0">
                  <td className="py-2 text-muted-foreground">{exec.sequenceOrder + 1}</td>
                  <td><Badge tone={exec.side === "Buy" ? "blue" : "amber"}>{exec.side}</Badge></td>
                  <td>{currency.format(exec.price)}</td>
                  <td>{exec.quantity}</td>
                  <td>{currency.format(exec.netAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      )}
    </Card>
  );
}

function KpiCard({ label, value, positive, neutral }: { label: string; value: string; positive: boolean; neutral?: boolean }) {
  const color = neutral ? "text-muted-foreground" : positive ? "text-emerald-600" : "text-rose-600";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-black ${color}`}>{value}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${active ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}

function formatDate(dateStr: string) {
  try {
    const [y, m, d] = dateStr.split("T")[0].split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  } catch {
    return dateStr;
  }
}
