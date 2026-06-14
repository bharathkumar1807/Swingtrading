import * as Dialog from "@radix-ui/react-dialog";
import { FileUp, X, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { intradayApi } from "@/services/intradayApi";
import { currency } from "@/lib/utils";
import type { IntradayPreview, IntradayTradeEntry } from "@/types";

export function UploadIntradayModal({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}) {
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState<IntradayPreview>();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  async function handleFileChange(selected?: File) {
    if (!selected) return;
    setFile(selected);
    setLoading(true);
    setMessage(undefined);
    setError(undefined);
    setPreview(undefined);
    try {
      const result = await intradayApi.preview(selected);
      setPreview(result);
      if (result.totalExecutions === 0) {
        setError("No trade executions found. Make sure this is a Robinhood Transaction Confirmation PDF.");
      } else {
        setMessage(`Found ${result.totalExecutions} executions across ${result.trades.length} symbols on ${formatDate(result.sessionDate)}.`);
      }
    } catch (err: unknown) {
      const backendMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(backendMsg ?? "Could not read this statement. Make sure it is a Robinhood Transaction Confirmation PDF.");
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (!file || !preview || preview.totalExecutions === 0) return;
    setLoading(true);
    setError(undefined);
    try {
      await intradayApi.import(file);
      onImported();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Import failed.";
      setError(msg.includes("already exists") ? `A session for ${formatDate(preview.sessionDate)} already exists.` : "Import failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setFile(undefined);
    setPreview(undefined);
    setMessage(undefined);
    setError(undefined);
  }

  const totalPnl = preview?.trades.reduce((sum, t) => sum + t.pnl, 0) ?? 0;
  const wins = preview?.trades.filter((t) => t.pnl > 0).length ?? 0;
  const losses = preview?.trades.filter((t) => t.pnl < 0).length ?? 0;
  const openPositions = preview?.trades.filter((t) => !t.isFullyClosed).length ?? 0;

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[94vw] max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-background p-6 shadow-2xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Dialog.Title className="text-2xl font-black">Import Intraday Statement</Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">
                Upload a Robinhood Transaction Confirmation PDF to log a day&apos;s trading activity.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon"><X size={18} /></Button>
            </Dialog.Close>
          </div>

          <Card className="mt-5">
            <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <label className="w-full text-sm font-semibold md:max-w-md">
                Transaction Confirmation PDF
                <Input className="mt-1" type="file" accept="application/pdf" onChange={(e) => handleFileChange(e.target.files?.[0])} />
              </label>
              <Button
                disabled={!file || !preview || preview.totalExecutions === 0 || loading}
                onClick={handleImport}
              >
                <FileUp size={16} /> Save session
              </Button>
            </CardContent>
          </Card>

          {loading && (
            <div className="mt-4 rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
              Reading statement...
            </div>
          )}

          {message && !error && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
              {message}
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-500/10 dark:text-rose-300">
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          {preview && preview.totalExecutions > 0 && (
            <>
              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard label="Est. P&L" value={currency.format(totalPnl)} positive={totalPnl >= 0} />
                <StatCard label="Winners" value={`${wins}`} positive />
                <StatCard label="Losers" value={`${losses}`} positive={false} />
                <StatCard label="Open positions" value={`${openPositions}`} positive={openPositions === 0} />
              </div>

              <div className="mt-5 overflow-x-auto rounded-xl border border-border bg-card">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-muted text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="p-3">Symbol</th>
                      <th className="p-3">Bought</th>
                      <th className="p-3">Sold</th>
                      <th className="p-3">Avg Buy</th>
                      <th className="p-3">Avg Sell</th>
                      <th className="p-3">Est. P&L</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.trades.map((trade) => (
                      <TradePreviewRow key={trade.symbol} trade={trade} />
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function TradePreviewRow({ trade }: { trade: IntradayTradeEntry }) {
  const hasOpen = !trade.isFullyClosed;
  const hasPrior = trade.priorPositionSellQty > 0;

  return (
    <tr className="border-t border-border">
      <td className="p-3 font-black">
        {trade.symbol}
        <p className="text-xs font-normal text-muted-foreground">{trade.companyName}</p>
      </td>
      <td className="p-3">
        {trade.totalBuyQty > 0 ? `${trade.totalBuyQty} sh` : <span className="text-muted-foreground">—</span>}
      </td>
      <td className="p-3">
        {trade.totalSellQty > 0 ? `${trade.totalSellQty} sh` : <span className="text-muted-foreground">—</span>}
      </td>
      <td className="p-3">
        {trade.avgBuyPrice > 0 ? currency.format(trade.avgBuyPrice) : <span className="text-muted-foreground">—</span>}
      </td>
      <td className="p-3">
        {trade.avgSellPrice > 0 ? currency.format(trade.avgSellPrice) : <span className="text-muted-foreground">—</span>}
      </td>
      <td className={`p-3 font-bold ${trade.pnl > 0 ? "text-emerald-600" : trade.pnl < 0 ? "text-rose-600" : "text-muted-foreground"}`}>
        {trade.matchedQty > 0 ? currency.format(trade.pnl) : <span className="text-muted-foreground">—</span>}
      </td>
      <td className="p-3">
        <div className="flex flex-wrap gap-1">
          {trade.isFullyClosed && !hasPrior && <Badge tone="green">Closed</Badge>}
          {hasOpen && <Badge tone="amber">{trade.openBuyQty} sh open</Badge>}
          {hasPrior && <Badge tone="slate">{trade.priorPositionSellQty} sh prior pos.</Badge>}
        </div>
      </td>
    </tr>
  );
}

function StatCard({ label, value, positive }: { label: string; value: string; positive: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-black ${positive ? "text-emerald-600" : "text-rose-600"}`}>{value}</p>
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
