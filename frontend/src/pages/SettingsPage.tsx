import { Moon, RotateCcw, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { setDarkMode } from "@/store/uiSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { tradesApi } from "@/services/tradesApi";

export function SettingsPage() {
  const dispatch = useAppDispatch();
  const dark = useAppSelector((state) => state.ui.darkMode);
  const user = useAppSelector((state) => state.auth.user);
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card><CardHeader><CardTitle>Profile</CardTitle></CardHeader><CardContent className="space-y-4"><Input value={user?.fullName ?? ""} readOnly /><Input value={user?.email ?? ""} readOnly /><Input type="password" placeholder="New password" /></CardContent></Card>
      <Card><CardHeader><CardTitle>Preferences</CardTitle></CardHeader><CardContent className="space-y-4"><Button variant="outline" onClick={() => dispatch(setDarkMode(!dark))}>{dark ? <Sun size={16} /> : <Moon size={16} />} {dark ? "Light theme" : "Dark theme"}</Button><Input placeholder="Default broker" /><Input placeholder="Default strategy" /><select className="h-10 w-full rounded-lg border border-border bg-card px-3"><option>Long</option><option>Short</option></select></CardContent></Card>
      <Card className="xl:col-span-2"><CardHeader><CardTitle>Data management</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-3"><Button variant="outline">Export data</Button><Button variant="outline">Import backup</Button><Button variant="destructive" onClick={() => tradesApi.reset()}><RotateCcw size={16} /> Reset all trades</Button></CardContent></Card>
    </div>
  );
}
