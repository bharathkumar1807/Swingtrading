import * as Dialog from "@radix-ui/react-dialog";
import { FileUp, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { tradesApi, type ImportCreateRow, type ImportedTrade, type OpenLot } from "@/services/tradesApi";
import { currency } from "@/lib/utils";

const mistakeOptions = ["Entered too early", "Entered too late", "Moved stop-loss", "Over-leveraged", "Emotional entry", "Overtrading"];

interface RowSettings {
  broker: string;
  sector: string;
  strategy: string;
  confidenceScore: number;
  stopLossPercent: number;
  tags: string;
  mistakes: string;
}

interface PnlEstimate {
  matchedQuantity: number;
  averageCost: number;
  pnl: number;
  complete: boolean;
}

export function ImportStatementModal({ open, onOpenChange, onImported }: { open: boolean; onOpenChange: (open: boolean) => void; onImported: () => void }) {
  const [file, setFile] = useState<File>();
  const [rows, setRows] = useState<ImportedTrade[]>([]);
  const [openLots, setOpenLots] = useState<OpenLot[]>([]);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [rowSettings, setRowSettings] = useState<Record<number, RowSettings>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>();
  const [broker, setBroker] = useState("Robinhood");
  const [sector, setSector] = useState("Unclassified");
  const [strategy, setStrategy] = useState("Statement Import");
  const [confidenceScore, setConfidenceScore] = useState(50);
  const [stopLossPercent, setStopLossPercent] = useState(2);
  const [tags, setTags] = useState("imported, statement");
  const [mistakes, setMistakes] = useState<string[]>([]);

  async function preview(selected?: File) {
    if (!selected) return;
    setFile(selected);
    setLoading(true);
    setMessage(undefined);
    try {
      const result = await tradesApi.previewStatement(selected);
      const lots = await tradesApi.openLots();
      setRows(result);
      setOpenLots(lots);
      setSelectedRows(result.map((_, index) => index));
      setRowSettings(Object.fromEntries(result.map((_, index) => [index, defaultSettings()])));
      setMessage(result.length ? `Found ${result.length} buy/sell rows.` : "No buy/sell trade rows were found in this statement.");
    } catch {
      setMessage("Could not read this statement. Make sure it is a text-based Robinhood PDF.");
    } finally {
      setLoading(false);
    }
  }

  async function importRows() {
    if (!file || rows.length === 0 || selectedRows.length === 0) return;
    setLoading(true);
    try {
      const importRows: ImportCreateRow[] = selectedRows.map((index) => {
        const row = rows[index];
        const settings = rowSettings[index] ?? defaultSettings();
        const estimate = estimatePnl(rows, index, openLots);
        const entryPrice = estimate ? estimate.averageCost : row.price;
        const exitPrice = estimate ? row.price : undefined;
        const size = estimate ? estimate.matchedQuantity : row.quantity;
        const stopLoss = entryPrice * (1 - settings.stopLossPercent / 100);

        return {
          symbol: row.symbol,
          sector: settings.sector,
          broker: settings.broker,
          strategy: settings.strategy,
          confidenceScore: settings.confidenceScore,
          notes: `Imported from Robinhood statement. Action: ${row.action}. Description: ${row.description}. Amount: ${row.amount}.${estimate ? ` Estimated FIFO P&L: ${estimate.pnl.toFixed(2)}.` : ""}`,
          screenshotUrl: "",
          tags: settings.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
          entryPrice,
          exitPrice,
          stopLoss,
          size,
          fees: 0,
          slippage: 0,
          mistakes: settings.mistakes.split(",").map((mistake) => mistake.trim()).filter(Boolean),
          positionType: "Long",
          entryDate: row.transactionDate,
          exitDate: estimate ? row.transactionDate : undefined,
        };
      });
      await tradesApi.importRows(importRows);
      setMessage(`Imported ${selectedRows.length} selected trades with row-level journal settings.`);
      onImported();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  function defaultSettings(): RowSettings {
    return {
      broker,
      sector,
      strategy,
      confidenceScore,
      stopLossPercent,
      tags,
      mistakes: mistakes.join(", "),
    };
  }

  function updateRow(index: number, values: Partial<RowSettings>) {
    setRowSettings((current) => ({
      ...current,
      [index]: { ...(current[index] ?? defaultSettings()), ...values },
    }));
  }

  function toggleRow(index: number) {
    setSelectedRows((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index]);
  }

  function applyBulkToSelected() {
    setRowSettings((current) => {
      const next = { ...current };
      for (const index of selectedRows) {
        next[index] = defaultSettings();
      }
      return next;
    });
    setMessage(`Applied bulk values to ${selectedRows.length} selected rows.`);
  }

  function estimatePnl(sourceRows: ImportedTrade[], rowIndex: number, existingLots: OpenLot[]): PnlEstimate | undefined {
    const row = sourceRows[rowIndex];
    if (row.action.toLowerCase() !== "sell") return undefined;

    let remaining = row.quantity;
    let cost = 0;
    let matchedQuantity = 0;

    for (const lot of existingLots.filter((lot) => lot.symbol === row.symbol).sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime())) {
      const matched = Math.min(remaining, lot.remainingQuantity);
      cost += matched * lot.entryPrice;
      matchedQuantity += matched;
      remaining -= matched;

      if (remaining <= 0.000001) break;
    }

    for (let index = 0; index < rowIndex; index += 1) {
      const candidate = sourceRows[index];
      if (remaining <= 0.000001) break;
      if (candidate.symbol !== row.symbol || candidate.action.toLowerCase() !== "buy") continue;

      const matched = Math.min(remaining, candidate.quantity);
      cost += matched * candidate.price;
      matchedQuantity += matched;
      remaining -= matched;

      if (remaining <= 0.000001) break;
    }

    if (matchedQuantity === 0) return undefined;

    const averageCost = cost / matchedQuantity;
    return {
      matchedQuantity,
      averageCost,
      pnl: (row.price - averageCost) * matchedQuantity,
      complete: remaining <= 0.000001,
    };
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[88vh] w-[94vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-background p-6 shadow-2xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Dialog.Title className="text-2xl font-black">Import broker statement</Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">Upload a Robinhood account statement PDF to extract buy/sell activity into journal trades.</Dialog.Description>
            </div>
            <Dialog.Close asChild><Button variant="ghost" size="icon"><X size={18} /></Button></Dialog.Close>
          </div>

          <Card className="mt-5">
            <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <label className="w-full text-sm font-semibold md:max-w-md">Statement PDF<Input className="mt-1" type="file" accept="application/pdf" onChange={(event) => preview(event.target.files?.[0])} /></label>
              <Button disabled={!file || rows.length === 0 || selectedRows.length === 0 || loading} onClick={importRows}><FileUp size={16} /> Save selected trades</Button>
            </CardContent>
          </Card>

          {message && <div className="mt-4 rounded-lg border border-border bg-card p-3 text-sm font-semibold">{message}</div>}

          <Card className="mt-5">
            <CardContent>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-black">Bulk values</p>
                  <p className="text-xs text-muted-foreground">Set these, select rows below, then apply them only to those rows.</p>
                </div>
                <Button variant="outline" disabled={selectedRows.length === 0} onClick={applyBulkToSelected}>Apply to selected rows</Button>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <label className="text-sm font-semibold">Broker<Input className="mt-1" value={broker} onChange={(event) => setBroker(event.target.value)} /></label>
                <label className="text-sm font-semibold">Sector<Input className="mt-1" value={sector} onChange={(event) => setSector(event.target.value)} /></label>
                <label className="text-sm font-semibold">Strategy<Input className="mt-1" value={strategy} onChange={(event) => setStrategy(event.target.value)} /></label>
                <label className="text-sm font-semibold">Confidence {confidenceScore}<input className="mt-3 w-full accent-emerald-600" type="range" min="0" max="100" value={confidenceScore} onChange={(event) => setConfidenceScore(Number(event.target.value))} /></label>
                <label className="text-sm font-semibold">Stop-loss assumption %<Input className="mt-1" type="number" min="0" step="0.25" value={stopLossPercent} onChange={(event) => setStopLossPercent(Number(event.target.value))} /></label>
                <label className="text-sm font-semibold">Tags<Input className="mt-1" value={tags} onChange={(event) => setTags(event.target.value)} /></label>
              </div>
              <div className="mt-4">
                <p className="mb-2 text-sm font-semibold">Mistake tags</p>
                <div className="flex flex-wrap gap-2">
                  {mistakeOptions.map((mistake) => (
                    <button
                      type="button"
                      key={mistake}
                      onClick={() => setMistakes((current) => current.includes(mistake) ? current.filter((item) => item !== mistake) : [...current, mistake])}
                      className="rounded-full"
                    >
                      <Badge tone={mistakes.includes(mistake) ? "red" : "slate"}>{mistake}</Badge>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="mt-5 overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[1500px] text-left text-sm">
              <thead className="bg-muted text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3"><input type="checkbox" checked={rows.length > 0 && selectedRows.length === rows.length} onChange={(event) => setSelectedRows(event.target.checked ? rows.map((_, index) => index) : [])} /></th>
                  <th>Date</th><th>Symbol</th><th>Action</th><th>Qty</th><th>Price</th><th>Amount</th><th>Est. P&L</th><th>Broker</th><th>Sector</th><th>Strategy</th><th>Confidence</th><th>SL %</th><th>Tags</th><th>Mistakes</th><th>Description</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={16} className="p-8 text-center text-muted-foreground">Reading statement...</td></tr>}
                {!loading && rows.length === 0 && <tr><td colSpan={16} className="p-8 text-center text-muted-foreground">Upload a PDF to preview imported trades.</td></tr>}
                {!loading && rows.map((row, index) => {
                  const settings = rowSettings[index] ?? defaultSettings();
                  const selected = selectedRows.includes(index);
                  const estimate = estimatePnl(rows, index, openLots);
                  return (
                  <tr key={`${row.symbol}-${row.transactionDate}-${index}`} className="border-t border-border">
                    <td className="p-3"><input type="checkbox" checked={selected} onChange={() => toggleRow(index)} /></td>
                    <td>{new Date(row.transactionDate).toLocaleDateString()}</td>
                    <td className="font-black">{row.symbol}</td>
                    <td>{row.action}</td>
                    <td>{row.quantity}</td>
                    <td>{currency.format(row.price)}</td>
                    <td>{currency.format(row.amount)}</td>
                    <td>
                      {estimate ? (
                        <span className={estimate.pnl >= 0 ? "font-bold text-emerald-600" : "font-bold text-rose-600"}>
                          {currency.format(estimate.pnl)} {!estimate.complete && <span className="text-xs text-amber-600">*</span>}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Open</span>
                      )}
                    </td>
                    <td><Input className="h-8 min-w-32" value={settings.broker} onChange={(event) => updateRow(index, { broker: event.target.value })} /></td>
                    <td><Input className="h-8 min-w-36" value={settings.sector} onChange={(event) => updateRow(index, { sector: event.target.value })} /></td>
                    <td><Input className="h-8 min-w-40" value={settings.strategy} onChange={(event) => updateRow(index, { strategy: event.target.value })} /></td>
                    <td><Input className="h-8 w-20" type="number" min="0" max="100" value={settings.confidenceScore} onChange={(event) => updateRow(index, { confidenceScore: Number(event.target.value) })} /></td>
                    <td><Input className="h-8 w-20" type="number" min="0" step="0.25" value={settings.stopLossPercent} onChange={(event) => updateRow(index, { stopLossPercent: Number(event.target.value) })} /></td>
                    <td><Input className="h-8 min-w-44" value={settings.tags} onChange={(event) => updateRow(index, { tags: event.target.value })} /></td>
                    <td><Input className="h-8 min-w-56" value={settings.mistakes} onChange={(event) => updateRow(index, { mistakes: event.target.value })} /></td>
                    <td className="max-w-xs truncate">{row.description}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
