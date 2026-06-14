import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { CandlestickChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login, register } from "@/store/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export function LoginPage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const { loading, error } = useAppSelector((state) => state.auth);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("trader@example.com");
  const [password, setPassword] = useState("Password123");
  const [fullName, setFullName] = useState("Professional Trader");

  if (user) return <Navigate to="/" replace />;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (mode === "login") dispatch(login({ email, password }));
    else dispatch(register({ email, password, fullName }));
  }

  return (
    <main className="grid min-h-screen bg-slate-950 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="relative hidden overflow-hidden p-12 text-white lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.45),transparent_30%),radial-gradient(circle_at_80%_40%,rgba(59,130,246,0.35),transparent_35%)]" />
        <div className="relative z-10 flex h-full flex-col justify-between">
          <div className="flex items-center gap-3 text-xl font-black"><CandlestickChart /> EdgeLedger</div>
          <div>
            <p className="mb-4 max-w-xl text-5xl font-black tracking-tight">Trade smarter with a journal that measures behavior and edge.</p>
            <p className="max-w-lg text-slate-300">Premium analytics, mistake tracking, review rituals, and exports for active traders.</p>
          </div>
        </div>
      </section>
      <section className="flex items-center justify-center bg-background p-6">
        <form onSubmit={submit} className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-soft">
          <p className="text-2xl font-black">{mode === "login" ? "Welcome back" : "Create account"}</p>
          <p className="mt-1 text-sm text-muted-foreground">Connect to your trading command center.</p>
          {mode === "register" && <label className="mt-5 block text-sm font-semibold">Full name<Input className="mt-1" value={fullName} onChange={(e) => setFullName(e.target.value)} /></label>}
          <label className="mt-5 block text-sm font-semibold">Email<Input className="mt-1" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="mt-4 block text-sm font-semibold">Password<Input className="mt-1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          {error && <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</div>}
          <Button className="mt-6 w-full" disabled={loading}>{loading ? "Please wait..." : mode === "login" ? "Sign in" : "Register"}</Button>
          <button type="button" className="mt-4 w-full text-sm font-semibold text-emerald-700" onClick={() => setMode(mode === "login" ? "register" : "login")}>
            {mode === "login" ? "Create a new account" : "Use existing account"}
          </button>
        </form>
      </section>
    </main>
  );
}
