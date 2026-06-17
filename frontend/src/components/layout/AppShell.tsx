import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BarChart3, BookOpenCheck, Brain, ChevronRight,
  LineChart, LogOut, PieChart, Settings, ShieldAlert,
  Table2, TrendingUp, Zap,
} from "lucide-react";
import { logout } from "@/store/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: React.ElementType };

const swingNav: NavItem[] = [
  { to: "/",          label: "Dashboard",  icon: LineChart    },
  { to: "/trades",    label: "Trades",     icon: Table2       },
  { to: "/review",    label: "Review",     icon: BookOpenCheck },
  { to: "/mistakes",  label: "Mistakes",   icon: Brain        },
  { to: "/strategies",label: "Strategies", icon: PieChart     },
];

const intradayNav: NavItem[] = [
  { to: "/intraday", label: "Intraday", icon: Zap },
];

const generalNav: NavItem[] = [
  { to: "/settings", label: "Settings", icon: Settings },
];

function initials(name: string) {
  return name.trim().split(/\s+/).map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "T";
}

/* ── Reusable nav item ─────────────────────────────────────────── */
function SideNavItem({
  item, exact, iconGrad, activeTxt, activeBg,
}: {
  item: NavItem;
  exact?: boolean;
  iconGrad: string;
  activeTxt: string;
  activeBg: string;
}) {
  return (
    <NavLink
      to={item.to}
      end={exact}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold transition-all duration-150 select-none",
          isActive
            ? cn(activeBg, activeTxt)
            : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-200",
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* icon box */}
          <span className={cn(
            "grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg transition-all duration-150",
            isActive
              ? cn(iconGrad, "shadow-sm")
              : "bg-slate-100/80 dark:bg-white/[0.07] group-hover:bg-slate-200/70 dark:group-hover:bg-white/10",
          )}>
            <item.icon
              size={14}
              strokeWidth={isActive ? 2.4 : 1.9}
              className={isActive ? "text-white" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"}
            />
          </span>

          <span className="flex-1 leading-none">{item.label}</span>

          <ChevronRight
            size={12}
            className={cn(
              "shrink-0 transition-opacity",
              isActive ? "opacity-35" : "opacity-0 group-hover:opacity-20",
            )}
          />
        </>
      )}
    </NavLink>
  );
}

/* ── Section header ────────────────────────────────────────────── */
function NavSection({ label, accent, children }: {
  label: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-2 px-3 mb-1.5">
        <span className={cn("text-[9.5px] font-extrabold uppercase tracking-[0.18em]", accent)}>
          {label}
        </span>
        <div className="flex-1 h-px bg-slate-200 dark:bg-white/[0.06]" />
      </div>
      {children}
    </div>
  );
}

/* ── Shell ─────────────────────────────────────────────────────── */
export function AppShell() {
  const dispatch   = useAppDispatch();
  const navigate   = useNavigate();
  const user       = useAppSelector((s) => s.auth.user);
  const isAdmin    = user?.roles?.includes("Admin") ?? false;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_32%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] dark:bg-none dark:bg-background">

      {/* ══ Desktop sidebar ══════════════════════════════════════════ */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 flex-col xl:flex
        bg-white dark:bg-[#0d0f14]
        border-r border-slate-200/70 dark:border-white/[0.05]">

        {/* Logo ---------------------------------------------------- */}
        <div className="flex shrink-0 items-center gap-3 px-5 py-[18px] border-b border-slate-100 dark:border-white/[0.05]">
          <div className="relative grid h-10 w-10 place-items-center rounded-xl
            bg-gradient-to-br from-emerald-400 to-emerald-700
            shadow-lg shadow-emerald-600/30 text-white">
            <TrendingUp size={19} strokeWidth={2.5} />
            {/* live dot */}
            <span className="absolute -right-0.5 -top-0.5 h-[9px] w-[9px] rounded-full bg-emerald-400 ring-[2px] ring-white dark:ring-[#0d0f14]" />
          </div>
          <div>
            <p className="text-[15px] font-black tracking-tight text-slate-900 dark:text-white leading-none">
              PnL Atlas
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-[3px]">
              Trading Journal
            </p>
          </div>
        </div>

        {/* Nav groups ---------------------------------------------- */}
        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">

          <NavSection label="Swing Trading" accent="text-emerald-500 dark:text-emerald-400">
            {swingNav.map((item) => (
              <SideNavItem
                key={item.to}
                item={item}
                exact={item.to === "/"}
                iconGrad="bg-gradient-to-br from-emerald-400 to-emerald-600"
                activeTxt="text-emerald-700 dark:text-emerald-300"
                activeBg="bg-emerald-50 dark:bg-emerald-500/[0.12]"
              />
            ))}
          </NavSection>

          <NavSection label="Intraday" accent="text-blue-500 dark:text-blue-400">
            {intradayNav.map((item) => (
              <SideNavItem
                key={item.to}
                item={item}
                iconGrad="bg-gradient-to-br from-blue-400 to-blue-600"
                activeTxt="text-blue-700 dark:text-blue-300"
                activeBg="bg-blue-50 dark:bg-blue-500/[0.12]"
              />
            ))}
          </NavSection>

          <NavSection label="General" accent="text-slate-400 dark:text-slate-500">
            {generalNav.map((item) => (
              <SideNavItem
                key={item.to}
                item={item}
                iconGrad="bg-gradient-to-br from-slate-400 to-slate-600"
                activeTxt="text-slate-700 dark:text-slate-200"
                activeBg="bg-slate-100 dark:bg-white/[0.08]"
              />
            ))}
          </NavSection>

          {isAdmin && (
            <NavSection label="Administration" accent="text-violet-500 dark:text-violet-400">
              <SideNavItem
                item={{ to: "/admin", label: "Command Center", icon: ShieldAlert }}
                iconGrad="bg-gradient-to-br from-violet-400 to-violet-600"
                activeTxt="text-violet-700 dark:text-violet-300"
                activeBg="bg-violet-50 dark:bg-violet-500/[0.12]"
              />
            </NavSection>
          )}
        </nav>

        {/* User footer --------------------------------------------- */}
        <div className="shrink-0 border-t border-slate-100 dark:border-white/[0.05] px-4 py-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-white/[0.04] px-3 py-2.5">
            {/* avatar */}
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg
              bg-gradient-to-br from-emerald-400 to-emerald-600
              text-[11px] font-black text-white shadow shadow-emerald-600/20 select-none">
              {initials(user?.fullName ?? "Trader")}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100 truncate leading-none">
                {user?.fullName ?? "Trader"}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-[3px]">
                {user?.email}
              </p>
            </div>
            <button
              onClick={() => { dispatch(logout()); navigate("/login"); }}
              title="Sign out"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg
                text-slate-400 hover:bg-rose-50 hover:text-rose-500
                dark:hover:bg-rose-500/10 dark:hover:text-rose-400
                transition-colors"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ══ Main content ═════════════════════════════════════════════ */}
      <main className="pb-20 xl:pb-0 xl:pl-72">

        {/* Top header */}
        <header className="sticky top-0 z-10 border-b border-border bg-white/80 px-4 py-3 backdrop-blur dark:bg-card/80 md:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 text-white xl:hidden">
                <TrendingUp size={16} />
              </div>
              <div>
                <p className="hidden text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 sm:block">
                  Welcome back, {user?.fullName?.split(" ")[0] ?? "Trader"}
                </p>
                <h1 className="text-[17px] font-black tracking-tight md:text-2xl">
                  Journal command center
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[13px] font-semibold md:flex">
                <BarChart3 size={14} className="text-emerald-600" />
                Live edge tracking
              </div>
              <button
                onClick={() => { dispatch(logout()); navigate("/login"); }}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-rose-500 transition xl:hidden dark:text-slate-400 dark:hover:bg-slate-800"
                title="Sign out"
              >
                <LogOut size={17} />
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
          <Outlet />
        </div>
      </main>

      {/* ══ Mobile bottom nav ════════════════════════════════════════ */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 xl:hidden
        border-t border-border bg-white/95 dark:bg-card/95 backdrop-blur">
        <div className="flex items-center justify-around px-1 py-1.5">
          {[...swingNav, ...intradayNav, ...generalNav].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-0.5 px-2 py-1.5 text-[9.5px] font-semibold transition-colors",
                  isActive
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-slate-400 dark:text-slate-500",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cn(
                    "grid h-7 w-7 place-items-center rounded-lg mb-0.5 transition-all",
                    isActive ? "bg-emerald-100 dark:bg-emerald-500/20" : "",
                  )}>
                    <item.icon size={16} strokeWidth={isActive ? 2.4 : 1.8} />
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-0.5 px-2 py-1.5 text-[9.5px] font-semibold transition-colors",
                  isActive
                    ? "text-violet-700 dark:text-violet-400"
                    : "text-slate-400 dark:text-slate-500",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cn(
                    "grid h-7 w-7 place-items-center rounded-lg mb-0.5 transition-all",
                    isActive ? "bg-violet-100 dark:bg-violet-500/20" : "",
                  )}>
                    <ShieldAlert size={16} strokeWidth={isActive ? 2.4 : 1.8} />
                  </span>
                  Admin
                </>
              )}
            </NavLink>
          )}
        </div>
      </nav>
    </div>
  );
}
