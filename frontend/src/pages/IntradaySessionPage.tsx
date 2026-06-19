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
  const [showAllSymbols, setShowAllSymbols] = useState(true);
  const [addingToPlan, setAddingToPlan] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    intradayApi.getSession(id)
      .then((s) => {
        setSession(s);
        const date = s.sessionDate.split("T")[0];
        dailyPlanApi.getByDate(date).then((plans) => {
          if (plans.length > 0) {
            setPlanSymbols(plans.map((p) => p.symbol.toUpperCase()));
            setShowAllSymbols(false);
          }
        }).catch(() => {});
      })
      .catch(() => navigate("/intraday"))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  function toggleExpanded(key: string) {
    setExpanded((prev) => prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]);
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

  if (loading) return <div className="py-20 text-center text-muted-foreground">Loading session...</div>;
  if (!session) return null;

  const isPlanFiltered = planSymbols.length > 0 && !showAllSymbols;
  const baseTrades = isPlanFiltered
    ? session.intradayTrades.filter((t) => planSymbols.includes(t.symbol.toUpperCase()))
    : session.intradayTrades;

  const planStocksWithExecutions = planSymbols.filter((sym) =>
    session.intradayTrades.some((t) => t.symbol.toUpperCase() === sym)
  );

  const filteredBase = symbolFilter === "All"
    ? baseTrades
    : baseTrades.filter((t) => t.symbol === symbolFilter);

  const swingTrades = filteredBase.filter((t) => t.tradeType === "Swing");
  const intradayTrades = filteredBase.filter((t) => t.tradeType === "Intraday");
  const carryingForward = intradayTrades.filter((t) => !t.isFullyClosed);

  const intradayPnl = intradayTrades.reduce((s, t) => s + t.pnl, 0);
  const swingPnl = swingTrades.reduce((s, t) => s + t.pnl, 0);
  const totalPnl = intradayPnl + swingPnl;

  const allForStats = [...swingTrades, ...intradayTrades];
  const winCount = allForStats.filter((t) => t.pnl > 0).length;
  const lossCount = allForStats.filter((t) => t.pnl < 0).length;
  const winRate = (winCount + lossCount) > 0
    ? Math.round((winCount / (winCount + lossCount)) * 100)
    : 0;

  const hasSwing = swingTrades.length > 0;

  const displaySymbols = isPlanFiltered
    ? session.symbols.filter((s) => planSymbols.includes(s.toUpperCase()))
    : session.symbols;

  const allExecutions = baseTrades.flatMap((t) => t.executions)
    .sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  const filteredExecutions = symbolFilter === "All"
    ? allExecutions
    : allExecutions.filter((e) => e.symbol === symbolFilter);

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
      <div className={`grid grid-cols-2 gap-3 ${hasSwing ? "md:grid-cols-6" : "md:grid-cols-5"}`}>
        <KpiCard label="Intraday P&L" value={currency.format(intradayPnl)} positive={intradayPnl >= 0} />
        {hasSwing && (
          <KpiCard label="Swing P&L" value={currency.format(swingPnl)} positive={swingPnl >= 0} accent="violet" />
        )}
        <KpiCard label="Win rate" value={`${winRate}%`} positive={winRate >= 50} />
        <KpiCard label="Winners" value={`${winCount}`} positive />
        <KpiCard label="Losers" value={`${lossCount}`} positive={false} neutral={lossCount === 0} />
        <KpiCard label="Symbols" value={`${baseTrades.length}`} positive />
      </div>

      {/* Total P&L summary when swing exists */}
      {hasSwing && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-2.5">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Total Day P&L</span>
          <span className={`ml-auto text-lg font-black ${totalPnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {currency.format(totalPnl)}
          </span>
          <span className="text-xs text-muted-foreground">
            ({currency.format(intradayPnl)} intraday + {currency.format(swingPnl)} swing)
          </span>
        </div>
      )}

      {/* Symbol filter pills */}
      <div className="flex flex-wrap gap-2">
        {["All", ...displaySymbols].map((sym) => (
          <button key={sym} type="button" onClick={() => setSymbolFilter(sym)} className="rounded-full">
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
        <div className="space-y-6">

          {/* Swing Exits */}
          {swingTrades.length > 0 && (
            <div className="space-y-3">
              <SectionLabel label="Swing Exits" count={swingTrades.length} color="violet" />
              {session.promotedTradeCount > 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-700 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-300">
                  <span>↗</span>
                  <span>
                    {session.promotedTradeCount === 1
                      ? "1 swing exit was"
                      : `${session.promotedTradeCount} swing exits were`}{" "}
                    automatically added to your <strong>Trades tab</strong> with entry date, exit date, and P&amp;L pre-filled.
                  </span>
                </div>
              )}
              {swingTrades.map((trade) => {
                const inPlan = planSymbols.includes(trade.symbol.toUpperCase());
                return (
                  <SwingTradeCard
                    key={trade.id}
                    trade={trade}
                    expanded={expanded.includes(`swing-${trade.id}`)}
                    onToggle={() => toggleExpanded(`swing-${trade.id}`)}
                    inPlan={inPlan}
                    sessionDate={session.sessionDate}
                  />
                );
              })}
            </div>
          )}

          {/* Today's Trades */}
          {intradayTrades.length > 0 && (
            <div className="space-y-3">
              {hasSwing && <SectionLabel label="Today's Trades" count={intradayTrades.length} color="slate" />}
              {intradayTrades.map((trade) => {
                const inPlan = planSymbols.includes(trade.symbol.toUpperCase());
                return (
                  <TradeCard
                    key={trade.id}
                    trade={trade}
                    expanded={expanded.includes(`intraday-${trade.id}`)}
                    onToggle={() => toggleExpanded(`intraday-${trade.id}`)}
                    inPlan={inPlan}
                    onAddToPlan={!inPlan ? () => addToPlan(trade.symbol) : undefined}
                    adding={addingToPlan === trade.symbol}
                  />
                );
              })}
            </div>
          )}

          {/* Carrying Forward */}
          {carryingForward.length > 0 && (
            <div>
              <SectionLabel label="Carrying Forward" count={carryingForward.length} color="amber" />
              <div className="mt-2 flex flex-wrap gap-2">
                {carryingForward.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm dark:border-amber-800 dark:bg-amber-950/30"
                  >
                    <span className="font-black">{t.symbol}</span>
                    <span className="text-muted-foreground">
                      {t.openBuyQty} sh @ {currency.format(t.avgBuyPrice)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      cost {currency.format(t.openBuyQty * t.avgBuyPrice)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredBase.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No trades for this symbol.</p>
          )}
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

// ── Swing Trade Card ─────────────────────────────────────────────────────────

function SwingTradeCard({ trade, expanded, onToggle, inPlan, sessionDate }: {
  trade: IntradayTradeEntry;
  expanded: boolean;
  onToggle: () => void;
  inPlan?: boolean;
  sessionDate: string;
}) {
  const unknownBasis = trade.totalBuyQty === 0;
  const outcomeColor = unknownBasis ? "text-muted-foreground" : trade.pnl > 0 ? "text-emerald-600" : trade.pnl < 0 ? "text-rose-600" : "text-muted-foreground";
  const outcomeTone = unknownBasis ? "slate" : trade.pnl > 0 ? "green" : trade.pnl < 0 ? "red" : "slate";
  const daysHeld = trade.entryDate ? daysBetween(trade.entryDate, sessionDate) : null;

  return (
    <Card className="border-l-4 border-l-violet-400 dark:border-l-violet-600">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
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
                <Badge tone="violet">Swing</Badge>
                {!unknownBasis && <Badge tone={outcomeTone}>{trade.outcome}</Badge>}
                {unknownBasis && <Badge tone="slate">Cost basis unknown</Badge>}
                {inPlan && <Badge tone="blue">In plan</Badge>}
                {trade.entryDate && (
                  <Badge tone="slate">
                    {formatShortDate(trade.entryDate)} → {formatShortDate(sessionDate)}
                    {daysHeld !== null && ` · ${daysHeld}d`}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className={`text-lg font-black ${outcomeColor}`}>
              {unknownBasis ? "N/A" : currency.format(trade.pnl)}
            </p>
            <p className="text-xs text-muted-foreground">{trade.matchedQty} sh exited</p>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="border-t border-border pt-4">
          <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat label="Entry date" value={trade.entryDate ? formatShortDate(trade.entryDate) : "—"} />
            <Stat label="Avg cost" value={unknownBasis ? "Unknown" : currency.format(trade.avgBuyPrice)} />
            <Stat label="Avg exit" value={currency.format(trade.avgSellPrice)} />
            <Stat label="Qty exited" value={`${trade.matchedQty} sh`} />
          </div>
          {trade.executions.length > 0 && (
            <>
              <p className="mb-2 text-xs font-bold uppercase text-muted-foreground">Executions (this session)</p>
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
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ── Intraday Trade Card ──────────────────────────────────────────────────────

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
                {trade.priorPositionSellQty > 0 && (
                  <Badge tone="slate">{trade.priorPositionSellQty} sh prior pos.</Badge>
                )}
              </div>
            </div>
          </div>

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
              <p className={`text-lg font-black ${outcomeColor}`}>
                {trade.matchedQty > 0 ? currency.format(trade.pnl) : "—"}
              </p>
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

// ── Shared sub-components ────────────────────────────────────────────────────

function SectionLabel({ label, count, color }: {
  label: string;
  count: number;
  color: "violet" | "slate" | "amber";
}) {
  const colors = {
    violet: "text-violet-700 dark:text-violet-400",
    slate: "text-muted-foreground",
    amber: "text-amber-700 dark:text-amber-400",
  };
  return (
    <div className="flex items-center gap-2">
      <p className={`text-xs font-bold uppercase ${colors[color]}`}>{label}</p>
      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">{count}</span>
      <div className="flex-1 border-t border-border" />
    </div>
  );
}

function KpiCard({ label, value, positive, neutral, accent }: {
  label: string;
  value: string;
  positive: boolean;
  neutral?: boolean;
  accent?: "violet";
}) {
  const color = neutral
    ? "text-muted-foreground"
    : accent === "violet"
      ? (positive ? "text-violet-600" : "text-rose-600")
      : positive ? "text-emerald-600" : "text-rose-600";
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
  } catch { return dateStr; }
}

function formatShortDate(dateStr: string) {
  try {
    const [y, m, d] = dateStr.split("T")[0].split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return dateStr; }
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from.split("T")[0]);
  const b = new Date(to.split("T")[0]);
  return Math.round(Math.abs(b.getTime() - a.getTime()) / 86_400_000);
}
