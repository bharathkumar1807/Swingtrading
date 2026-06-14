import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { intradayApi } from "@/services/intradayApi";
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

  useEffect(() => {
    if (!id) return;
    intradayApi.getSession(id)
      .then(setSession)
      .catch(() => navigate("/intraday"))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  function toggleExpanded(symbol: string) {
    setExpanded((prev) => prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]);
  }

  if (loading) {
    return <div className="py-20 text-center text-muted-foreground">Loading session...</div>;
  }

  if (!session) return null;

  const winRate = (session.winCount + session.lossCount) > 0
    ? Math.round((session.winCount / (session.winCount + session.lossCount)) * 100)
    : 0;

  const allExecutions = session.intradayTrades.flatMap((t) => t.executions)
    .sort((a, b) => a.sequenceOrder - b.sequenceOrder);

  const filteredExecutions = symbolFilter === "All"
    ? allExecutions
    : allExecutions.filter((e) => e.symbol === symbolFilter);

  const filteredTrades = symbolFilter === "All"
    ? session.intradayTrades
    : session.intradayTrades.filter((t) => t.symbol === symbolFilter);

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

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <KpiCard label="Total P&L" value={currency.format(session.totalPnl)} positive={session.totalPnl >= 0} />
        <KpiCard label="Win rate" value={`${winRate}%`} positive={winRate >= 50} />
        <KpiCard label="Winners" value={`${session.winCount}`} positive />
        <KpiCard label="Losers" value={`${session.lossCount}`} positive={false} neutral={session.lossCount === 0} />
        <KpiCard label="Symbols" value={`${session.symbols.length}`} positive />
      </div>

      {/* Symbol filter pills */}
      <div className="flex flex-wrap gap-2">
        {["All", ...session.symbols].map((sym) => (
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
          {filteredTrades.map((trade) => (
            <TradeCard key={trade.id} trade={trade} expanded={expanded.includes(trade.symbol)} onToggle={() => toggleExpanded(trade.symbol)} />
          ))}
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

function TradeCard({ trade, expanded, onToggle }: { trade: IntradayTradeEntry; expanded: boolean; onToggle: () => void }) {
  const outcomeColor = trade.pnl > 0 ? "text-emerald-600" : trade.pnl < 0 ? "text-rose-600" : "text-muted-foreground";
  const outcomeTone = trade.pnl > 0 ? "green" : trade.pnl < 0 ? "red" : "slate";

  return (
    <Card>
      <button
        type="button"
        className="w-full text-left"
        onClick={onToggle}
      >
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {expanded ? <ChevronDown size={18} className="shrink-0" /> : <ChevronRight size={18} className="shrink-0" />}
              <div>
                <p className="text-base font-black">{trade.symbol}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">{trade.companyName}</span>
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Badge tone={outcomeTone}>{trade.outcome}</Badge>
                  {!trade.isFullyClosed && <Badge tone="amber">{trade.openBuyQty} sh open</Badge>}
                  {trade.priorPositionSellQty > 0 && <Badge tone="slate">{trade.priorPositionSellQty} sh prior pos.</Badge>}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className={`text-lg font-black ${outcomeColor}`}>{trade.matchedQty > 0 ? currency.format(trade.pnl) : "—"}</p>
              <p className="text-xs text-muted-foreground">{trade.matchedQty} sh matched</p>
            </div>
          </div>
        </CardHeader>
      </button>

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
