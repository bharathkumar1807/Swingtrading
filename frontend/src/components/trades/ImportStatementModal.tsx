import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, CheckCircle2, FileUp, Loader2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { tradesApi, type ImportCreateRow, type ImportedTrade, type OpenLot } from "@/services/tradesApi";
import { currency } from "@/lib/utils";

// ── Matched trade = one completed buy→sell round trip ──────────────────────
interface MatchedTrade {
  symbol: string;
  entryDate: string;
  exitDate: string;
  qty: number;
  avgEntry: number;
  avgExit: number;
  pnl: number;
  daysHeld: number;
  isPartial: boolean;
}

// ── Open position = buy without a matching sell in this statement ───────────
interface OpenPosition {
  symbol: string;
  date: string;
  qty: number;
  price: number;
}

function matchRows(
  rows: ImportedTrade[],
  existingLots: OpenLot[]
): { matched: MatchedTrade[]; opens: OpenPosition[] } {
  type Lot = { price: number; qty: number; date: string; fromStatement: boolean };
  const lots: Record<string, Lot[]> = {};

  // Seed with prior open lots from DB (FIFO order)
  for (const lot of [...existingLots].sort(
    (a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
  )) {
    if (!lots[lot.symbol]) lots[lot.symbol] = [];
    lots[lot.symbol].push({
      price: lot.entryPrice,
      qty: lot.remainingQuantity,
      date: lot.entryDate,
      fromStatement: false,
    });
  }

  const matched: MatchedTrade[] = [];

  // Process all rows in chronological order
  const sorted = [...rows].sort(
    (a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()
  );

  for (const row of sorted) {
    const action = row.action.toLowerCase();

    if (action === "buy") {
      if (!lots[row.symbol]) lots[row.symbol] = [];
      lots[row.symbol].push({
        price: row.price,
        qty: row.quantity,
        date: row.transactionDate,
        fromStatement: true,
      });
      continue;
    }

    if (action !== "sell") continue;

    const symbolLots = lots[row.symbol] ?? [];
    let remaining = row.quantity;
    let totalCost = 0;
    let totalMatched = 0;
    let earliestDate = row.transactionDate;

    for (const lot of symbolLots) {
      if (remaining <= 0.000_01 || lot.qty <= 0.000_01) continue;
      const take = Math.min(remaining, lot.qty);
      totalCost += take * lot.price;
      if (totalMatched === 0) earliestDate = lot.date;
      totalMatched += take;
      lot.qty -= take;
      remaining -= take;
    }
    lots[row.symbol] = symbolLots.filter((l) => l.qty > 0.000_01);

    if (totalMatched < 0.000_01) continue;

    const avgEntry = totalCost / totalMatched;
    const daysHeld = Math.max(
      0,
      Math.round(
        (new Date(row.transactionDate).getTime() - new Date(earliestDate).getTime()) /
          86_400_000
      )
    );

    // Merge same-symbol same-day sells
    const existing = matched.find(
      (m) => m.symbol === row.symbol && m.exitDate === row.transactionDate
    );
    if (existing) {
      const combined = existing.qty + totalMatched;
      existing.avgEntry = (existing.avgEntry * existing.qty + avgEntry * totalMatched) / combined;
      existing.avgExit = (existing.avgExit * existing.qty + row.price * totalMatched) / combined;
      existing.pnl += (row.price - avgEntry) * totalMatched;
      existing.qty = combined;
    } else {
      matched.push({
        symbol: row.symbol,
        entryDate: earliestDate,
        exitDate: row.transactionDate,
        qty: totalMatched,
        avgEntry,
        avgExit: row.price,
        pnl: (row.price - avgEntry) * totalMatched,
        daysHeld,
        isPartial: remaining > 0.000_01,
      });
    }
  }

  // Remaining statement lots = open positions (never re-import DB lots)
  const opens: OpenPosition[] = [];
  for (const [symbol, symbolLots] of Object.entries(lots)) {
    for (const lot of symbolLots) {
      if (lot.qty > 0.000_01 && lot.fromStatement) {
        opens.push({ symbol, date: lot.date, qty: lot.qty, price: lot.price });
      }
    }
  }

  return { matched, opens };
}

export function ImportStatementModal({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string }>();
  const [matched, setMatched] = useState<MatchedTrade[]>([]);
  const [opens, setOpens] = useState<OpenPosition[]>([]);
  const [selectedMatched, setSelectedMatched] = useState<number[]>([]);
  const [selectedOpens, setSelectedOpens] = useState<number[]>([]);
  const [strategy, setStrategy] = useState("Swing Trade");
  const [sector, setSector] = useState("Unclassified");
  const [slPct, setSlPct] = useState(5);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setLoading(true);
    setMessage(undefined);
    setMatched([]);
    setOpens([]);
    try {
      const [rows, lots] = await Promise.all([
        tradesApi.previewStatement(file),
        tradesApi.openLots(),
      ]);
      if (rows.length === 0) {
        setMessage({ type: "err", text: "No buy/sell rows found. Make sure this is a text-based Robinhood Account Activity PDF." });
        return;
      }
      const result = matchRows(rows, lots);
      setMatched(result.matched);
      setOpens(result.opens);
      setSelectedMatched(result.matched.map((_, i) => i));
      setSelectedOpens(result.opens.map((_, i) => i));
      setMessage({
        type: "ok",
        text: `Parsed ${rows.length} rows → ${result.matched.length} completed trade${result.matched.length !== 1 ? "s" : ""}, ${result.opens.length} open position${result.opens.length !== 1 ? "s" : ""}.`,
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Could not read this PDF.";
      setMessage({ type: "err", text: msg });
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (selectedMatched.length === 0 && selectedOpens.length === 0) return;
    setImporting(true);
    try {
      const rows: ImportCreateRow[] = [
        ...selectedMatched.map((i) => {
          const t = matched[i];
          return {
            symbol: t.symbol,
            broker: "Robinhood",
            sector,
            strategy,
            confidenceScore: 50,
            notes: `Imported: held ${t.daysHeld} day${t.daysHeld !== 1 ? "s" : ""}. Entry avg $${t.avgEntry.toFixed(2)}, exit avg $${t.avgExit.toFixed(2)}.`,
            tags: ["imported", "robinhood", t.pnl >= 0 ? "win" : "loss"],
            entryPrice: t.avgEntry,
            exitPrice: t.avgExit,
            stopLoss: t.avgEntry * (1 - slPct / 100),
            size: t.qty,
            mistakes: [],
            positionType: "Long" as const,
            entryDate: t.entryDate,
            exitDate: t.exitDate,
          };
        }),
        ...selectedOpens.map((i) => {
          const p = opens[i];
          return {
            symbol: p.symbol,
            broker: "Robinhood",
            sector,
            strategy,
            confidenceScore: 50,
            notes: "Open position imported from Robinhood statement.",
            tags: ["imported", "robinhood", "open"],
            entryPrice: p.price,
            stopLoss: p.price * (1 - slPct / 100),
            size: p.qty,
            mistakes: [],
            positionType: "Long" as const,
            entryDate: p.date,
          };
        }),
      ];
      await tradesApi.importRows(rows);
      onImported();
      onOpenChange(false);
    } finally {
      setImporting(false);
    }
  }

  function toggleMatched(i: number) {
    setSelectedMatched((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
  }

  function toggleOpen(i: number) {
    setSelectedOpens((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
  }

  const totalSelected = selectedMatched.length + selectedOpens.length;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[94vw] max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-2xl">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-2xl font-black">Import Robinhood Statement</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                Upload your monthly PDF — buys and sells are automatically matched into swing trades.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon"><X size={18} /></Button>
            </Dialog.Close>
          </div>

          {/* Upload + settings row */}
          <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto_auto_auto]">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/40 px-4 py-3 text-sm font-semibold text-muted-foreground transition hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10">
              <FileUp size={20} className="shrink-0 text-emerald-600" />
              {loading ? "Reading PDF…" : "Click to upload statement PDF"}
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                disabled={loading}
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </label>
            <label className="text-sm font-semibold">
              Strategy
              <Input className="mt-1 w-36" value={strategy} onChange={(e) => setStrategy(e.target.value)} />
            </label>
            <label className="text-sm font-semibold">
              Sector
              <Input className="mt-1 w-36" value={sector} onChange={(e) => setSector(e.target.value)} />
            </label>
            <label className="text-sm font-semibold">
              Stop-loss %
              <Input
                className="mt-1 w-24"
                type="number"
                min="0"
                step="0.5"
                value={slPct}
                onChange={(e) => setSlPct(Number(e.target.value))}
              />
            </label>
          </div>

          {/* Status message */}
          {loading && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted p-3 text-sm">
              <Loader2 size={16} className="animate-spin text-emerald-600" /> Reading statement…
            </div>
          )}
          {message && !loading && (
            <div className={`mt-4 flex items-center gap-2 rounded-lg border p-3 text-sm font-semibold ${message.type === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300" : "border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-900/20"}`}>
              {message.type === "ok" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              {message.text}
            </div>
          )}

          {/* Completed trades */}
          {matched.length > 0 && (
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-black">Completed Trades</h3>
                  <p className="text-xs text-muted-foreground">Buy → Sell round trips with calculated P&L</p>
                </div>
                <button
                  type="button"
                  className="text-xs font-semibold text-emerald-600 hover:underline"
                  onClick={() =>
                    setSelectedMatched(
                      selectedMatched.length === matched.length ? [] : matched.map((_, i) => i)
                    )
                  }
                >
                  {selectedMatched.length === matched.length ? "Deselect all" : "Select all"}
                </button>
              </div>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-muted text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="p-3 w-10"></th>
                      <th className="p-3">Symbol</th>
                      <th className="p-3">Entry Date</th>
                      <th className="p-3">Exit Date</th>
                      <th className="p-3">Days Held</th>
                      <th className="p-3">Qty</th>
                      <th className="p-3">Avg Entry</th>
                      <th className="p-3">Avg Exit</th>
                      <th className="p-3">P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matched.map((t, i) => (
                      <tr key={i} className={`border-t border-border transition ${selectedMatched.includes(i) ? "bg-card" : "bg-muted/30 opacity-50"}`}>
                        <td className="p-3">
                          <input type="checkbox" checked={selectedMatched.includes(i)} onChange={() => toggleMatched(i)} />
                        </td>
                        <td className="p-3 font-black">{t.symbol}</td>
                        <td className="p-3">{new Date(t.entryDate).toLocaleDateString()}</td>
                        <td className="p-3">{new Date(t.exitDate).toLocaleDateString()}</td>
                        <td className="p-3">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold dark:bg-slate-800">
                            {t.daysHeld}d
                          </span>
                        </td>
                        <td className="p-3 tabular-nums">{t.qty.toFixed(4)}</td>
                        <td className="p-3 tabular-nums">{currency.format(t.avgEntry)}</td>
                        <td className="p-3 tabular-nums">{currency.format(t.avgExit)}</td>
                        <td className={`p-3 font-black tabular-nums ${t.pnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {t.pnl >= 0 ? "+" : ""}{currency.format(t.pnl)}
                          {t.isPartial && <span className="ml-1 text-xs text-amber-500" title="Partially matched">*</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Open positions */}
          {opens.length > 0 && (
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-black">Open Positions</h3>
                  <p className="text-xs text-muted-foreground">Buys without a matching sell — still in your account</p>
                </div>
                <button
                  type="button"
                  className="text-xs font-semibold text-emerald-600 hover:underline"
                  onClick={() =>
                    setSelectedOpens(
                      selectedOpens.length === opens.length ? [] : opens.map((_, i) => i)
                    )
                  }
                >
                  {selectedOpens.length === opens.length ? "Deselect all" : "Select all"}
                </button>
              </div>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="bg-muted text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="p-3 w-10"></th>
                      <th className="p-3">Symbol</th>
                      <th className="p-3">Entry Date</th>
                      <th className="p-3">Qty</th>
                      <th className="p-3">Entry Price</th>
                      <th className="p-3">Cost Basis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {opens.map((p, i) => (
                      <tr key={i} className={`border-t border-border transition ${selectedOpens.includes(i) ? "bg-card" : "bg-muted/30 opacity-50"}`}>
                        <td className="p-3">
                          <input type="checkbox" checked={selectedOpens.includes(i)} onChange={() => toggleOpen(i)} />
                        </td>
                        <td className="p-3 font-black">{p.symbol}</td>
                        <td className="p-3">{new Date(p.date).toLocaleDateString()}</td>
                        <td className="p-3 tabular-nums">{p.qty.toFixed(4)}</td>
                        <td className="p-3 tabular-nums">{currency.format(p.price)}</td>
                        <td className="p-3 font-semibold tabular-nums">{currency.format(p.price * p.qty)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer */}
          {(matched.length > 0 || opens.length > 0) && (
            <div className="mt-6 flex items-center justify-between gap-4 border-t border-border pt-4">
              <p className="text-sm text-muted-foreground">
                {totalSelected} item{totalSelected !== 1 ? "s" : ""} selected
                {selectedMatched.length > 0 && ` · ${selectedMatched.length} trade${selectedMatched.length !== 1 ? "s" : ""}`}
                {selectedOpens.length > 0 && ` · ${selectedOpens.length} open position${selectedOpens.length !== 1 ? "s" : ""}`}
              </p>
              <Button disabled={totalSelected === 0 || importing} onClick={handleImport}>
                {importing ? <><Loader2 size={16} className="animate-spin" /> Importing…</> : <><FileUp size={16} /> Import {totalSelected} selected</>}
              </Button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
