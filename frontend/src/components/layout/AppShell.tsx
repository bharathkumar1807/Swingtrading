import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { BarChart3, BookOpenCheck, Brain, ChevronRight, LineChart, LogOut, PieChart, Settings, Table2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/store/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: LineChart },
  { to: "/trades", label: "Trades", icon: Table2 },
  { to: "/review", label: "Review", icon: BookOpenCheck },
  { to: "/mistakes", label: "Mistakes", icon: Brain },
  { to: "/strategies", label: "Strategies", icon: PieChart },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppShell() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_32%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] dark:bg-none dark:bg-background">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-border bg-white/90 p-5 backdrop-blur xl:block dark:bg-card/90">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/25">
            <TrendingUp size={22} />
          </div>
          <div>
            <p className="text-lg font-black tracking-tight">EdgeLedger</p>
            <p className="text-xs text-muted-foreground">Trading Journal</p>
          </div>
        </div>
        <nav className="mt-8 space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn("flex items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800", isActive && "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300")}
            >
              <span className="flex items-center gap-3"><item.icon size={18} />{item.label}</span>
              <ChevronRight size={16} />
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-5 left-5 right-5 rounded-xl border border-border bg-slate-50 p-4 dark:bg-slate-900">
          <p className="text-sm font-semibold">{user?.fullName ?? "Trader"}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          <Button variant="ghost" size="sm" className="mt-3 w-full justify-start" onClick={() => { dispatch(logout()); navigate("/login"); }}>
            <LogOut size={16} /> Sign out
          </Button>
        </div>
      </aside>
      <main className="xl:pl-72">
        <header className="sticky top-0 z-10 border-b border-border bg-white/80 px-4 py-3 backdrop-blur dark:bg-card/80 md:px-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Professional trading analytics</p>
              <h1 className="text-xl font-black tracking-tight md:text-2xl">Journal command center</h1>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm font-semibold md:flex">
              <BarChart3 size={16} className="text-emerald-600" /> Live edge tracking
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
