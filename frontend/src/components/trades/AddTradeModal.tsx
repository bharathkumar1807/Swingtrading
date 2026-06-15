import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { tradesApi, type UpsertTrade } from "@/services/tradesApi";

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const mistakes = ["Entered too early", "Entered too late", "Moved stop-loss", "Over-leveraged", "Emotional entry", "Overtrading"];

const emptyTrade: UpsertTrade = {
  symbol: "",
  sector: "",
  broker: "",
  strategy: "",
  confidenceScore: 70,
  notes: "",
  screenshotUrl: "",
  tags: [],
  entryPrice: 0,
  exitPrice: undefined,
  stopLoss: 0,
  size: 1,
  fees: 0,
  slippage: 0,
  mistakes: [],
  positionType: "Long",
  entryDate: new Date().toISOString(),
  exitDate: undefined,
};

export function AddTradeModal({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void; }) {
  const [form, setForm] = useState<UpsertTrade>(emptyTrade);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<string>();
  const [error, setError] = useState<string>();

  const update = (key: keyof UpsertTrade, value: unknown) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(undefined);
    try {
      await tradesApi.create(form);
      onSaved();
      onOpenChange(false);
      setForm(emptyTrade);
      setPreview(undefined);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? "Failed to save trade. Check all required fields and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function upload(file?: File) {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    const result = await tradesApi.uploadScreenshot(file);
    update("screenshotUrl", result.url);
  }

  const estimatedRisk = Math.abs(Number(form.entryPrice) - Number(form.stopLoss)) * Number(form.size || 0);
  const exit = Number(form.exitPrice || form.entryPrice);
  const estimatedPnl = (form.positionType === "Short" ? Number(form.entryPrice) - exit : exit - Number(form.entryPrice)) * Number(form.size || 0) - Number(form.fees || 0) - Number(form.slippage || 0);

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) { setError(undefined); setPreview(undefined); setForm(emptyTrade); } onOpenChange(o); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed right-0 top-0 z-50 h-full w-full max-w-3xl overflow-y-auto border-l border-border bg-background p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <Dialog.Title className="text-2xl font-black">Add trade</Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">Log execution, behavior, risk, and screenshots in one pass.</Dialog.Description>
            </div>
            <Dialog.Close asChild><Button variant="ghost" size="icon"><X size={18} /></Button></Dialog.Close>
          </div>
          <form onSubmit={submit} className="mt-6 grid gap-4 md:grid-cols-2">
            {(["symbol", "sector", "broker", "strategy"] as const).map((field) => (
              <label key={field} className="text-sm font-semibold capitalize">{field}<Input className="mt-1" value={String(form[field] ?? "")} onChange={(e) => update(field, e.target.value)} required /></label>
            ))}
            <label className="text-sm font-semibold">Position type<select className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3" value={String(form.positionType)} onChange={(e) => update("positionType", e.target.value)}><option>Long</option><option>Short</option></select></label>
            <label className="text-sm font-semibold">Confidence {form.confidenceScore}<input className="mt-3 w-full accent-emerald-600" type="range" min="0" max="100" value={form.confidenceScore} onChange={(e) => update("confidenceScore", Number(e.target.value))} /></label>
            {(["entryPrice", "exitPrice", "stopLoss", "size", "fees", "slippage"] as const).map((field) => (
              <label key={field} className="text-sm font-semibold capitalize">{field.replace(/([A-Z])/g, " $1")}<Input className="mt-1" type="number" step="0.01" value={form[field] ?? ""} onChange={(e) => update(field, e.target.value === "" ? undefined : Number(e.target.value))} required={field !== "exitPrice"} /></label>
            ))}
            <label className="text-sm font-semibold">Entry date<Input className="mt-1" type="datetime-local" value={toDatetimeLocal(form.entryDate)} onChange={(e) => update("entryDate", e.target.value ? new Date(e.target.value).toISOString() : form.entryDate)} required /></label>
            <label className="text-sm font-semibold">Exit date<Input className="mt-1" type="datetime-local" value={form.exitDate ? toDatetimeLocal(form.exitDate) : ""} onChange={(e) => update("exitDate", e.target.value ? new Date(e.target.value).toISOString() : undefined)} /></label>
            <label className="text-sm font-semibold md:col-span-2">Tags<Input className="mt-1" placeholder="breakout, nifty, morning" onChange={(e) => update("tags", e.target.value.split(",").map((x) => x.trim()))} /></label>
            <div className="md:col-span-2">
              <p className="mb-2 text-sm font-semibold">Mistake tags</p>
              <div className="flex flex-wrap gap-2">
                {mistakes.map((mistake) => (
                  <button type="button" key={mistake} onClick={() => update("mistakes", form.mistakes.includes(mistake) ? form.mistakes.filter((x) => x !== mistake) : [...form.mistakes, mistake])} className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${form.mistakes.includes(mistake) ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-card ring-border"}`}>{mistake}</button>
                ))}
              </div>
            </div>
            <label className="text-sm font-semibold md:col-span-2">Notes<textarea className="mt-1 min-h-24 w-full rounded-lg border border-border bg-card p-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" onChange={(e) => update("notes", e.target.value)} /></label>
            <label className="text-sm font-semibold">Screenshot<Input className="mt-1" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => upload(e.target.files?.[0])} /></label>
            {preview && <img src={preview} className="h-28 rounded-lg border border-border object-cover" alt="Screenshot preview" />}
            <div className="md:col-span-2 rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-semibold">Auto calculation preview</p>
              <div className="mt-2 grid gap-3 text-sm md:grid-cols-3">
                <span>Net P&L: <b className={estimatedPnl >= 0 ? "text-emerald-600" : "text-rose-600"}>{estimatedPnl.toFixed(2)}</b></span>
                <span>Risk: <b>{estimatedRisk.toFixed(2)}</b></span>
                <span>R multiple: <b>{estimatedRisk ? (estimatedPnl / estimatedRisk).toFixed(2) : "0.00"}</b></span>
              </div>
            </div>
            {error && (
              <div className="md:col-span-2 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-500/10 dark:text-rose-300">
                <AlertTriangle size={16} className="shrink-0" /> {error}
              </div>
            )}
            <div className="flex justify-end gap-3 md:col-span-2">
              <Dialog.Close asChild><Button type="button" variant="outline">Cancel</Button></Dialog.Close>
              <Button disabled={saving}>{saving ? "Saving..." : "Save trade"}</Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
