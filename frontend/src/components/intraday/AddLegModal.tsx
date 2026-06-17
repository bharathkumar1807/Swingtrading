import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dailyPlanApi } from "@/services/dailyPlanApi";
import type { DailyStockPlan } from "@/types";

const BUY_LEG_TYPES = ["Entry", "AddToPosition"] as const;
const SELL_LEG_TYPES = ["PartialExit", "StopLossExit", "FullExit"] as const;

const LEG_TYPE_LABELS: Record<string, string> = {
  Entry: "Entry", AddToPosition: "Add to Position",
  PartialExit: "Partial Exit", StopLossExit: "Stop Loss Exit", FullExit: "Full Exit",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  symbol: string;
  onSaved: (plan: DailyStockPlan) => void;
}

export function AddLegModal({ open, onOpenChange, planId, symbol, onSaved }: Props) {
  const [action, setAction] = useState<"Buy" | "Sell">("Buy");
  const [legType, setLegType] = useState("Entry");
  const [time, setTime] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  function switchAction(a: "Buy" | "Sell") {
    setAction(a);
    setLegType(a === "Buy" ? "Entry" : "PartialExit");
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!time || !quantity || !price) { setError("Time, quantity, and price are required."); return; }
    setSaving(true); setError(undefined);
    try {
      const result = await dailyPlanApi.addLeg(planId, {
        time, action, legType,
        quantity: parseFloat(quantity),
        price: parseFloat(price),
        notes: notes || undefined,
      });
      onSaved(result);
      onOpenChange(false);
      setTime(""); setQuantity(""); setPrice(""); setNotes("");
    } catch { setError("Failed to save leg."); }
    finally { setSaving(false); }
  }

  const legTypes = action === "Buy" ? BUY_LEG_TYPES : SELL_LEG_TYPES;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed right-0 top-0 z-50 h-full w-full max-w-sm overflow-y-auto border-l border-border bg-background p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <Dialog.Title className="text-xl font-black">Add leg — {symbol}</Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">Log a buy, scale-in, or sell execution.</Dialog.Description>
            </div>
            <Dialog.Close asChild><Button variant="ghost" size="icon"><X size={18} /></Button></Dialog.Close>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-5">
            {/* Buy / Sell toggle */}
            <div className="flex rounded-lg overflow-hidden border border-border">
              <button type="button"
                className={`flex-1 py-2 text-sm font-bold transition ${action === "Buy" ? "bg-emerald-500 text-white" : "text-muted-foreground hover:bg-muted"}`}
                onClick={() => switchAction("Buy")}>Buy</button>
              <button type="button"
                className={`flex-1 py-2 text-sm font-bold transition ${action === "Sell" ? "bg-rose-500 text-white" : "text-muted-foreground hover:bg-muted"}`}
                onClick={() => switchAction("Sell")}>Sell</button>
            </div>

            {/* Leg type */}
            <div>
              <p className="text-sm font-semibold mb-2">Type</p>
              <div className="flex flex-wrap gap-2">
                {legTypes.map((lt) => (
                  <button key={lt} type="button"
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${legType === lt ? "border-blue-500 bg-blue-500 text-white" : "border-border text-muted-foreground hover:border-blue-400"}`}
                    onClick={() => setLegType(lt)}>{LEG_TYPE_LABELS[lt]}</button>
                ))}
              </div>
            </div>

            {/* Time */}
            <label className="text-sm font-semibold">
              Time *
              <Input className="mt-1" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
            </label>

            {/* Quantity + Price */}
            <div className="grid grid-cols-2 gap-4">
              <label className="text-sm font-semibold">
                Shares *
                <Input className="mt-1" type="number" step="1" min="1" placeholder="50" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
              </label>
              <label className="text-sm font-semibold">
                Price *
                <Input className="mt-1" type="number" step="0.01" placeholder="0.00" value={price} onChange={(e) => setPrice(e.target.value)} required />
              </label>
            </div>

            {/* Estimated P&L for sells */}
            {action === "Sell" && quantity && price && (
              <div className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-semibold">{quantity} shares @ ${price}</span>
                {" "}— realized P&L will be calculated from your avg entry cost.
              </div>
            )}

            {/* Notes */}
            <label className="text-sm font-semibold">
              Notes
              <Input className="mt-1" placeholder="Why scaling in, stop triggered, etc." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>

            {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">{error}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <Dialog.Close asChild><Button type="button" variant="outline">Cancel</Button></Dialog.Close>
              <Button type="submit" disabled={saving}
                className={action === "Buy" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}>
                {saving ? "Saving..." : action === "Buy" ? "Add Buy" : "Add Sell"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
