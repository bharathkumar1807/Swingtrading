import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Download, FileUp, Plus, Search, Trash2 } from "lucide-react";
import { AddTradeModal } from "@/components/trades/AddTradeModal";
import { ImportStatementModal } from "@/components/trades/ImportStatementModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { clearSelected, fetchTrades, setSelected, toggleSelected } from "@/store/tradesSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { tradesApi } from "@/services/tradesApi";
import { TradesPerformancePanel } from "@/components/trades/TradesPerformancePanel";
import { currency } from "@/lib/utils";
import type { Trade } from "@/types";

interface TradeGroup {
  symbol: string;
  sector: string;
  broker: string;
  strategies: string;
  trades: Trade[];
  pnl: number;
  rMultiple: number;
  buyCount: number;
  sellCount: number;
  latestDate: string;
}

export function TradesPage() {
  const dispatch = useAppDispatch();
  const { data, selectedIds, loading } = useAppSelector((state) => state.trades);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [savingTradeId, setSavingTradeId] = useState<string>();
  useEffect(() => { dispatch(fetchTrades({ search, pageSize: 100 })); }, [dispatch, search]);

  const groups = groupTrades(data.items);
  const visibleIds = data.items.map((trade) => trade.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  async function exportCsv() {
    const blob = await tradesApi.exportCsv(selectedIds);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "trades.csv";
    a.click();
  }

  async function deleteSelected() {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected trade${selectedIds.length === 1 ? "" : "s"}?`)) return;
    await Promise.all(selectedIds.map((id) => tradesApi.remove(id)));
    dispatch(clearSelected());
    dispatch(fetchTrades({ search, pageSize: 100 }));
  }

  async function updateJournalFields(trade: Trade, values: Partial<Pick<Trade, "strategy" | "tags" | "mistakes">>) {
    setSavingTradeId(trade.id);
    try {
      await tradesApi.update(trade.id, {
        symbol: trade.symbol,
        sector: trade.sector,
        broker: trade.broker,
        strategy: values.strategy ?? trade.strategy,
        confidenceScore: trade.confidenceScore,
        notes: trade.notes,
        screenshotUrl: trade.screenshotUrl,
        tags: values.tags ?? trade.tags,
        entryPrice: trade.entryPrice,
        exitPrice: trade.exitPrice,
        stopLoss: trade.stopLoss,
        size: trade.size,
        fees: trade.fees,
        slippage: trade.slippage,
        mistakes: values.mistakes ?? trade.mistakes,
        positionType: trade.positionType,
        entryDate: trade.entryDate,
        exitDate: trade.exitDate,
      });
      dispatch(fetchTrades({ search, pageSize: 100 }));
    } finally {
      setSavingTradeId(undefined);
    }
  }

  function toggleExpanded(symbol: string) {
    setExpanded((current) => current.includes(symbol) ? current.filter((item) => item !== symbol) : [...current, symbol]);
  }

  function toggleGroup(group: TradeGroup) {
    const groupIds = group.trades.map((trade) => trade.id);
    const selected = groupIds.every((id) => selectedIds.includes(id));
    dispatch(setSelected(selected ? selectedIds.filter((id) => !groupIds.includes(id)) : Array.from(new Set([...selectedIds, ...groupIds]))));
  }

  function toggleAllVisible() {
    dispatch(setSelected(allVisibleSelected ? selectedIds.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...selectedIds, ...visibleIds]))));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div><h2 className="text-2xl font-black tracking-tight">Trades</h2><p className="text-sm text-muted-foreground">Search, filter, export, and inspect executions.</p></div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportCsv}><Download size={16} /> Export</Button>
          <Button variant="destructive" disabled={selectedIds.length === 0} onClick={deleteSelected}><Trash2 size={16} /> Delete selected</Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}><FileUp size={16} /> Import statement</Button>
          <Button onClick={() => setOpen(true)}><Plus size={16} /> Add trade</Button>
        </div>
      </div>
      {!loading && data.items.length > 0 && (
        <TradesPerformancePanel trades={data.items} />
      )}
      <Card>
        <CardHeader>
          <CardTitle>Trade blotter</CardTitle>
          <div className="relative w-full max-w-sm"><Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} /><Input className="pl-9" placeholder="Search symbol, strategy, tags" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-3"><input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} /></th>
                <th></th>
                <th>Symbol</th>
                <th>Broker</th>
                <th>Strategies</th>
                <th>Trades</th>
                <th>Buy/Sell</th>
                <th>P&L</th>
                <th>Avg R</th>
                <th>Latest</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={10} className="py-12 text-center text-muted-foreground">Loading trades...</td></tr>}
              {!loading && groups.length === 0 && <tr><td colSpan={10} className="py-12 text-center text-muted-foreground">No trades found.</td></tr>}
              {!loading && groups.map((group) => {
                const isExpanded = expanded.includes(group.symbol);
                const groupSelected = group.trades.every((trade) => selectedIds.includes(trade.id));
                return (
                  <>
                    <tr key={group.symbol} className="border-b border-border/70 bg-card transition hover:bg-muted/60">
                      <td className="py-4"><input type="checkbox" checked={groupSelected} onChange={() => toggleGroup(group)} /></td>
                      <td><button className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted" onClick={() => toggleExpanded(group.symbol)}>{isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button></td>
                      <td className="font-black">{group.symbol}<p className="text-xs font-normal text-muted-foreground">{group.sector}</p></td>
                      <td>{group.broker}</td>
                      <td className="max-w-xs truncate">{group.strategies}</td>
                      <td><Badge tone="slate">{group.trades.length} executions</Badge></td>
                      <td><span className="text-emerald-600">{group.buyCount} buy</span> / <span className="text-rose-600">{group.sellCount} sell</span></td>
                      <td className={group.pnl >= 0 ? "font-bold text-emerald-600" : "font-bold text-rose-600"}>{currency.format(group.pnl)}</td>
                      <td>{group.rMultiple.toFixed(2)}R</td>
                      <td>{new Date(group.latestDate).toLocaleDateString()}</td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${group.symbol}-history`} className="border-b border-border bg-slate-50/70 dark:bg-slate-900/50">
                        <td></td>
                        <td colSpan={9} className="p-0">
                          <div className="p-4">
                            <p className="mb-3 text-xs font-bold uppercase text-muted-foreground">Buy and sell history</p>
                            <table className="w-full text-sm">
                              <thead className="text-xs uppercase text-muted-foreground"><tr className="border-b border-border"><th className="py-2"></th><th>Date</th><th>Action</th><th>Strategy</th><th>Tags</th><th>Mistakes</th><th>Qty</th><th>Entry</th><th>Exit</th><th>P&L</th><th>R</th><th>Status</th></tr></thead>
                              <tbody>
                                {group.trades.map((trade) => (
                                  <tr key={trade.id} className="border-b border-border/70 last:border-0">
                                    <td className="py-3"><input type="checkbox" checked={selectedIds.includes(trade.id)} onChange={() => dispatch(toggleSelected(trade.id))} /></td>
                                    <td>{new Date(trade.entryDate).toLocaleDateString()}</td>
                                    <td><Badge tone={String(trade.positionType).includes("Short") || trade.positionType === 1 ? "amber" : "blue"}>{trade.exitPrice ? "Sell/Closed" : "Buy/Open"}</Badge></td>
                                    <td>
                                      <Input
                                        className="h-8 min-w-40"
                                        defaultValue={trade.strategy}
                                        disabled={savingTradeId === trade.id}
                                        onBlur={(event) => {
                                          const strategy = event.target.value.trim();
                                          if (strategy && strategy !== trade.strategy) updateJournalFields(trade, { strategy });
                                        }}
                                      />
                                    </td>
                                    <td>
                                      <Input
                                        className="h-8 min-w-48"
                                        defaultValue={trade.tags.join(", ")}
                                        disabled={savingTradeId === trade.id}
                                        onBlur={(event) => {
                                          const tags = event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean);
                                          if (tags.join("|") !== trade.tags.join("|")) updateJournalFields(trade, { tags });
                                        }}
                                      />
                                    </td>
                                    <td>
                                      <select
                                        className="h-8 min-w-48 rounded-lg border border-border bg-card px-2 text-sm"
                                        value={trade.mistakes[0] ?? ""}
                                        disabled={savingTradeId === trade.id}
                                        onChange={(event) => updateJournalFields(trade, { mistakes: event.target.value ? [event.target.value] : [] })}
                                      >
                                        <option value="">No mistake</option>
                                        <option value="Entered too early">Entered too early</option>
                                        <option value="Entered too late">Entered too late</option>
                                        <option value="Moved stop-loss">Moved stop-loss</option>
                                        <option value="Over-leveraged">Over-leveraged</option>
                                        <option value="Emotional entry">Emotional entry</option>
                                        <option value="Overtrading">Overtrading</option>
                                      </select>
                                    </td>
                                    <td>{trade.size}</td>
                                    <td>{currency.format(trade.entryPrice)}</td>
                                    <td>{trade.exitPrice ? currency.format(trade.exitPrice) : "-"}</td>
                                    <td className={trade.pnl >= 0 ? "font-bold text-emerald-600" : "font-bold text-rose-600"}>{currency.format(trade.pnl)}</td>
                                    <td>{trade.rMultiple.toFixed(2)}R</td>
                                    <td><Badge tone={trade.pnl > 0 ? "green" : trade.pnl < 0 ? "red" : "slate"}>{String(trade.outcome)}</Badge></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <AddTradeModal open={open} onOpenChange={setOpen} onSaved={() => dispatch(fetchTrades({ search }))} />
      <ImportStatementModal open={importOpen} onOpenChange={setImportOpen} onImported={() => dispatch(fetchTrades({ search }))} />
    </div>
  );
}

function groupTrades(trades: Trade[]): TradeGroup[] {
  const map = new Map<string, Trade[]>();
  for (const trade of trades) {
    map.set(trade.symbol, [...(map.get(trade.symbol) ?? []), trade]);
  }

  return Array.from(map.entries()).map(([symbol, groupTrades]) => {
    const sorted = [...groupTrades].sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
    const strategies = Array.from(new Set(sorted.map((trade) => trade.strategy))).join(", ");
    const pnl = sorted.reduce((sum, trade) => sum + trade.pnl, 0);
    return {
      symbol,
      sector: sorted[0]?.sector ?? "",
      broker: Array.from(new Set(sorted.map((trade) => trade.broker))).join(", "),
      strategies,
      trades: sorted,
      pnl,
      rMultiple: sorted.length ? sorted.reduce((sum, trade) => sum + trade.rMultiple, 0) / sorted.length : 0,
      buyCount: sorted.filter((trade) => !trade.exitPrice).length,
      sellCount: sorted.filter((trade) => Boolean(trade.exitPrice) || String(trade.positionType).includes("Short") || trade.positionType === 1).length,
      latestDate: sorted[0]?.entryDate ?? new Date().toISOString(),
    };
  }).sort((a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime());
}
