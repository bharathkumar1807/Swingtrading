import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dailyPlanApi, type CreatePlanRequest, type UpdatePlanRequest } from "@/services/dailyPlanApi";
import type { DailyStockPlan } from "@/types";

const MARKET_DIRECTIONS = ["TrendingUp", "TrendingDown", "Choppy", "RangeBound"] as const;
const SECTOR_BEHAVIORS = ["Strong", "Weak", "Mixed"] as const;
const OUTCOMES = ["Win", "Loss", "Breakeven", "Skipped"] as const;
const RESULTS_VS_PLAN = ["FollowedPlan", "BrokeRule", "Partial"] as const;

const DIRECTION_LABELS: Record<string, string> = {
  TrendingUp: "Trending Up", TrendingDown: "Trending Down", Choppy: "Choppy", RangeBound: "Range-bound",
};
const RESULT_LABELS: Record<string, string> = {
  FollowedPlan: "Followed Plan", BrokeRule: "Broke Rule", Partial: "Partial",
};

function todayIso() { return new Date().toISOString().split("T")[0]; }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (plan: DailyStockPlan) => void;
  editing?: DailyStockPlan;
  defaultDate?: string;
}

type FormState = {
  date: string; symbol: string; stopLossPrice: string; maxLossAllowed: string;
  marketDirection: string; sectorBehavior: string; outcome: string;
  resultVsPlan: string; behaviorNotes: string; entryTime: string;
};

function emptyForm(defaultDate?: string): FormState {
  return {
    date: defaultDate ?? todayIso(), symbol: "", stopLossPrice: "",
    maxLossAllowed: "50", marketDirection: "TrendingUp", sectorBehavior: "Strong",
    outcome: "Win", resultVsPlan: "FollowedPlan", behaviorNotes: "", entryTime: "",
  };
}

function fromPlan(p: DailyStockPlan): FormState {
  return {
    date: p.date, symbol: p.symbol,
    stopLossPrice: p.stopLossPrice ? String(p.stopLossPrice) : "",
    maxLossAllowed: String(p.maxLossAllowed),
    marketDirection: p.marketDirection, sectorBehavior: p.sectorBehavior,
    outcome: p.outcome, resultVsPlan: p.resultVsPlan, behaviorNotes: p.behaviorNotes ?? "",
    entryTime: p.entryTime ?? "",
  };
}

export function AddStockPlanModal({ open, onOpenChange, onSaved, editing, defaultDate }: Props) {
  const [form, setForm] = useState<FormState>(() => editing ? fromPlan(editing) : emptyForm(defaultDate));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (open) { setForm(editing ? fromPlan(editing) : emptyForm(defaultDate)); setError(undefined); }
  }, [open, editing, defaultDate]);

  const set = (key: keyof FormState, value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true); setError(undefined);
    try {
      const base = {
        stopLossPrice: parseFloat(form.stopLossPrice) || 0,
        maxLossAllowed: parseFloat(form.maxLossAllowed) || 0,
        marketDirection: form.marketDirection, sectorBehavior: form.sectorBehavior,
        outcome: form.outcome, resultVsPlan: form.resultVsPlan,
        behaviorNotes: form.behaviorNotes || undefined,
        entryTime: form.entryTime || undefined,
      };
      let result: DailyStockPlan;
      if (editing) {
        result = await dailyPlanApi.update(editing.id, base as UpdatePlanRequest);
      } else {
        result = await dailyPlanApi.create({ ...base, date: form.date, symbol: form.symbol.toUpperCase().trim() } as CreatePlanRequest);
      }
      onSaved(result);
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ? `Save failed: ${msg}` : "Failed to save. Check all fields and try again.");
    }
    finally { setSaving(false); }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed right-0 top-0 z-50 h-full w-full max-w-xl overflow-y-auto border-l border-border bg-background p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <Dialog.Title className="text-xl font-black">{editing ? "Edit stock" : "Add stock"}</Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">
                {editing ? "Update plan details. Legs are managed from the card." : "Add a stock to track. Add trade legs after saving."}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild><Button variant="ghost" size="icon"><X size={18} /></Button></Dialog.Close>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <label className="text-sm font-semibold">
                Date
                <Input className="mt-1" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} required disabled={!!editing} />
              </label>
              <label className="text-sm font-semibold">
                Symbol
                <Input className="mt-1 uppercase" placeholder="NVDA" value={form.symbol} onChange={(e) => set("symbol", e.target.value.toUpperCase())} required disabled={!!editing} />
              </label>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <label className="text-sm font-semibold">
                Stop loss price ($)
                <Input className="mt-1" type="number" step="0.01" placeholder="0.00" value={form.stopLossPrice} onChange={(e) => set("stopLossPrice", e.target.value)} />
              </label>
              <label className="text-sm font-semibold">
                Max loss allowed ($)
                <Input className="mt-1" type="number" step="1" placeholder="50" value={form.maxLossAllowed} onChange={(e) => set("maxLossAllowed", e.target.value)} required />
              </label>
              <label className="text-sm font-semibold">
                Entry time
                <Input className="mt-1" type="time" value={form.entryTime} onChange={(e) => set("entryTime", e.target.value)} />
              </label>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">Market direction</p>
              <div className="flex flex-wrap gap-2">
                {MARKET_DIRECTIONS.map((d) => (
                  <button key={d} type="button"
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${form.marketDirection === d ? "border-blue-500 bg-blue-500 text-white" : "border-border text-muted-foreground hover:border-blue-400"}`}
                    onClick={() => set("marketDirection", d)}>{DIRECTION_LABELS[d]}</button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">Sector behavior</p>
              <div className="flex gap-2">
                {SECTOR_BEHAVIORS.map((s) => (
                  <button key={s} type="button"
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${form.sectorBehavior === s ? "border-violet-500 bg-violet-500 text-white" : "border-border text-muted-foreground hover:border-violet-400"}`}
                    onClick={() => set("sectorBehavior", s)}>{s}</button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">Outcome</p>
              <div className="flex flex-wrap gap-2">
                {OUTCOMES.map((o) => {
                  const active = form.outcome === o;
                  const cls = active
                    ? o === "Win" ? "border-emerald-500 bg-emerald-500 text-white"
                      : o === "Loss" ? "border-rose-500 bg-rose-500 text-white"
                      : o === "Breakeven" ? "border-amber-500 bg-amber-500 text-white"
                      : "border-slate-500 bg-slate-500 text-white"
                    : "border-border text-muted-foreground hover:text-foreground";
                  return (
                    <button key={o} type="button"
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${cls}`}
                      onClick={() => set("outcome", o)}>{o}</button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">Result vs plan</p>
              <div className="flex flex-wrap gap-2">
                {RESULTS_VS_PLAN.map((r) => (
                  <button key={r} type="button"
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${form.resultVsPlan === r ? "border-orange-500 bg-orange-500 text-white" : "border-border text-muted-foreground hover:border-orange-400"}`}
                    onClick={() => set("resultVsPlan", r)}>{RESULT_LABELS[r]}</button>
                ))}
              </div>
            </div>

            <label className="text-sm font-semibold">
              Behavior notes
              <textarea className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                rows={3} placeholder="Market context, how the stock behaved..."
                value={form.behaviorNotes} onChange={(e) => set("behaviorNotes", e.target.value)} />
            </label>

            {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">{error}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <Dialog.Close asChild><Button type="button" variant="outline">Cancel</Button></Dialog.Close>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : editing ? "Update" : "Add stock"}</Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
