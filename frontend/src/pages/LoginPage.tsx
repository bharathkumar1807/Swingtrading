import { FormEvent, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login, register } from "@/store/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const QUOTES = [
  { text: "The goal of a successful trader is to make the best trades. Money is secondary.", author: "Alexander Elder" },
  { text: "I'm always thinking about losing money as opposed to making money.", author: "Paul Tudor Jones" },
  { text: "Risk comes from not knowing what you're doing.", author: "Warren Buffett" },
  { text: "It's not whether you're right or wrong, but how much money you make when you're right.", author: "George Soros" },
  { text: "Amateurs focus on rewards. Professionals focus on risk.", author: "Unknown" },
  { text: "Plan the trade and trade the plan.", author: "Floor Trader Maxim" },
  { text: "The market can remain irrational longer than you can remain solvent.", author: "John Maynard Keynes" },
  { text: "In trading, the impossible happens about twice a year.", author: "Henri M. Simoes" },
];

const CHART_PATH =
  "M0,120 C30,115 50,90 80,85 S130,60 160,55 S220,40 250,30 S310,45 340,50 S390,35 420,20 S470,10 500,5";

export function LoginPage() {
  const dispatch = useAppDispatch();
  const user     = useAppSelector((s) => s.auth.user);
  const { loading, error } = useAppSelector((s) => s.auth);

  const [mode, setMode]       = useState<"login" | "register">("login");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [fading, setFading]   = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setFading(true);
      setTimeout(() => { setQuoteIndex((i) => (i + 1) % QUOTES.length); setFading(false); }, 500);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  if (user) return <Navigate to="/" replace />;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (mode === "login") dispatch(login({ email, password }));
    else dispatch(register({ email, password, fullName }));
  }

  const quote = QUOTES[quoteIndex];

  return (
    /* Stack on mobile, side-by-side on lg+ */
    <main className="flex min-h-screen flex-col lg:grid lg:grid-cols-[1.15fr_0.85fr]">

      {/* ── Brand / quote panel ────────────────────────────────────── */}
      <section className="relative flex flex-col justify-between overflow-hidden bg-slate-950
        px-6 py-8 lg:px-14 lg:py-14">

        {/* Glow blobs — desktop only (expensive blur, skip on mobile) */}
        <div className="pointer-events-none absolute inset-0 hidden lg:block">
          <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-blue-600/15 blur-3xl" />
          <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/10 blur-2xl" />
        </div>

        {/* Decorative equity curve — desktop only */}
        <div className="pointer-events-none absolute inset-x-0 bottom-32 opacity-20 hidden lg:block">
          <svg viewBox="0 0 500 130" preserveAspectRatio="none" className="h-32 w-full">
            <defs>
              <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={`${CHART_PATH} L500,130 L0,130 Z`} fill="url(#curveGrad)" />
            <path d={CHART_PATH} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500 shadow-lg shadow-emerald-500/40 lg:h-10 lg:w-10">
            <BarChart2 size={18} className="text-white" />
          </div>
          <span className="text-lg font-black tracking-tight text-white lg:text-xl">PnL Atlas</span>
        </div>

        {/* Center content */}
        <div className="relative z-10 space-y-4 py-4 lg:space-y-8 lg:py-0">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400 lg:mb-3 lg:text-xs">
              Professional Trading Journal
            </p>
            <h1 className="max-w-lg text-2xl font-black leading-tight tracking-tight text-white lg:text-5xl lg:leading-[1.1]">
              Map every trade.<br className="hidden lg:block" /> Build your edge.
            </h1>
          </div>

          {/* Rotating quote */}
          <div
            className="max-w-sm border-l-2 border-emerald-500 pl-4 transition-opacity duration-500 lg:pl-5"
            style={{ opacity: fading ? 0 : 1 }}
          >
            <p className="text-sm font-medium italic leading-relaxed text-slate-200 lg:text-base">
              "{quote.text}"
            </p>
            <p className="mt-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400 lg:mt-2 lg:text-xs">
              — {quote.author}
            </p>
          </div>

          {/* Quote dots */}
          <div className="flex gap-1.5">
            {QUOTES.map((_, i) => (
              <button
                key={i}
                onClick={() => { setFading(false); setQuoteIndex(i); }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === quoteIndex ? "w-5 bg-emerald-400" : "w-1.5 bg-slate-600 hover:bg-slate-400"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Bottom tagline — desktop only */}
        <div className="relative z-10 hidden lg:block">
          <p className="text-xs text-slate-500">
            Analytics · Mistake tracking · Review rituals · Edge measurement
          </p>
        </div>
      </section>

      {/* ── Form panel ─────────────────────────────────────────────── */}
      <section className="flex flex-col items-center justify-center bg-slate-950 p-6 lg:bg-slate-900">
        <form
          onSubmit={submit}
          className="w-full max-w-sm space-y-5 rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-sm"
        >
          <div>
            <p className="text-2xl font-black text-white">
              {mode === "login" ? "Welcome back" : "Create account"}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {mode === "login"
                ? "Sign in to your trading command center."
                : "Start mapping your trading edge."}
            </p>
          </div>

          <div className="space-y-4">
            {mode === "register" && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Full name</span>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                  className="border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus-visible:ring-emerald-500"
                />
              </label>
            )}
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Email</span>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus-visible:ring-emerald-500"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Password</span>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus-visible:ring-emerald-500"
              />
            </label>
          </div>

          {error && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm font-semibold text-rose-400">
              {error}
            </div>
          )}

          <Button className="w-full bg-emerald-500 font-bold text-white hover:bg-emerald-400" disabled={loading}>
            {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </Button>

          <button
            type="button"
            className="w-full text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "Don't have an account? Register" : "Already have an account? Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
