import { useEffect, useRef, useState } from "react";
import { Users, Activity, TrendingUp, BarChart3, Star, X, ChevronRight, ShieldAlert, UserCheck, Clock, KeyRound, ListOrdered, LayoutDashboard, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { adminApi, type AdminUser, type AdminTrade, type PlatformStats, type UserSummary } from "@/services/adminApi";
import { currency } from "@/lib/utils";

function StatCard({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-5 pb-5">
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-2xl font-black">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

type DrawerTab = "overview" | "trades" | "password";

function UserDrawer({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [tab, setTab] = useState<DrawerTab>("overview");
  const [summary, setSummary] = useState<UserSummary | null>(null);
  const [trades, setTrades] = useState<AdminTrade[] | null>(null);
  const [tradesError, setTradesError] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingTrades, setLoadingTrades] = useState(false);

  // password tab state
  const [newPassword, setNewPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwResult, setPwResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const pwRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    adminApi.getUserSummary(userId).then(setSummary).finally(() => setLoadingSummary(false));
  }, [userId]);

  useEffect(() => {
    if (tab === "trades" && trades === null && !tradesError) {
      setLoadingTrades(true);
      setTradesError(null);
      adminApi.getUserTrades(userId)
        .then(setTrades)
        .catch(() => setTradesError("Failed to load trades. Please try again."))
        .finally(() => setLoadingTrades(false));
    }
  }, [tab, trades, tradesError, userId]);

  async function handleChangePassword() {
    if (!newPassword.trim()) return;
    setPwSaving(true);
    setPwResult(null);
    try {
      await adminApi.changePassword(userId, newPassword);
      setPwResult({ ok: true, msg: "Password updated successfully." });
      setNewPassword("");
    } catch {
      setPwResult({ ok: false, msg: "Failed to update password. Check password requirements." });
    } finally {
      setPwSaving(false);
    }
  }

  const tabs = [
    { id: "overview" as DrawerTab, label: "Overview", icon: LayoutDashboard },
    { id: "trades" as DrawerTab, label: "Trades", icon: ListOrdered },
    { id: "password" as DrawerTab, label: "Password", icon: KeyRound },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-xl flex-col border-l border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <div>
            {loadingSummary ? (
              <p className="text-lg font-black">Loading…</p>
            ) : (
              <>
                <p className="text-lg font-black">{summary?.fullName}</p>
                <p className="text-xs text-muted-foreground">{summary?.email}</p>
              </>
            )}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted transition">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 border-b border-border">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-3 text-xs font-semibold transition border-b-2 ${
                tab === t.id
                  ? "border-violet-600 text-violet-700 dark:text-violet-400"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Overview ── */}
          {tab === "overview" && (
            <div className="space-y-5 p-5">
              {loadingSummary && <p className="text-center text-sm text-muted-foreground">Loading…</p>}
              {summary && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Total Trades", value: summary.totalTrades },
                      { label: "Win Rate", value: `${summary.winRate}%` },
                      { label: "Total Sessions", value: summary.totalSessions },
                      { label: "Most Traded", value: summary.mostTradedSymbol ?? "—" },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-xl border border-border bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-xl font-black">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">P&amp;L Summary</p>
                    {[
                      { label: "Total P&L", value: currency.format(summary.totalPnl), pos: summary.totalPnl >= 0 },
                      { label: "Best Day", value: currency.format(summary.bestDay), pos: true },
                      { label: "Worst Day", value: currency.format(summary.worstDay), pos: false },
                    ].map(({ label, value, pos }) => (
                      <div key={label} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{label}</span>
                        <span className={`font-bold ${pos ? "text-emerald-600" : "text-rose-500"}`}>{value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Trades ── */}
          {tab === "trades" && (
            <div>
              {loadingTrades && (
                <p className="p-5 text-center text-sm text-muted-foreground">Loading trades…</p>
              )}
              {tradesError && !loadingTrades && (
                <div className="p-5 text-center space-y-2">
                  <p className="text-sm text-rose-500">{tradesError}</p>
                  <button
                    onClick={() => { setTradesError(null); }}
                    className="text-xs font-semibold text-violet-600 hover:underline"
                  >
                    Retry
                  </button>
                </div>
              )}
              {!tradesError && trades && trades.length === 0 && (
                <p className="p-5 text-center text-sm text-muted-foreground">No trades yet.</p>
              )}
              {!tradesError && trades && trades.length > 0 && (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      {["Symbol", "Strategy", "Entry", "Exit", "Size", "P&L", "R", "Outcome"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((t) => (
                      <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="px-3 py-2 font-bold">{t.symbol}</td>
                        <td className="px-3 py-2 text-muted-foreground">{t.strategy}</td>
                        <td className="px-3 py-2 text-muted-foreground">{new Date(t.entryDate).toLocaleDateString()}</td>
                        <td className="px-3 py-2 text-muted-foreground">{t.exitDate ? new Date(t.exitDate).toLocaleDateString() : "—"}</td>
                        <td className="px-3 py-2 font-mono">{t.size}</td>
                        <td className={`px-3 py-2 font-bold ${t.pnl >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                          {currency.format(t.pnl)}
                        </td>
                        <td className={`px-3 py-2 font-mono ${t.rMultiple >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                          {t.rMultiple.toFixed(2)}R
                        </td>
                        <td className="px-3 py-2">
                          <Badge tone={t.outcome === "Win" ? "green" : t.outcome === "Loss" ? "red" : "slate"}>
                            {t.outcome}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Password ── */}
          {tab === "password" && (
            <div className="space-y-5 p-5">
              <p className="text-sm text-muted-foreground">
                Set a new password for this user. They will need to use it on their next login.
              </p>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">New Password</label>
                <div className="relative">
                  <input
                    ref={pwRef}
                    type={showPw ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
                    placeholder="Min. 8 characters"
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <Button
                className="w-full bg-violet-600 text-white hover:bg-violet-700"
                disabled={pwSaving || !newPassword.trim()}
                onClick={handleChangePassword}
              >
                {pwSaving ? "Saving…" : "Update Password"}
              </Button>
              {pwResult && (
                <p className={`text-sm font-medium ${pwResult.ok ? "text-emerald-600" : "text-rose-500"}`}>
                  {pwResult.msg}
                </p>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function fmt(dateStr: string | null) {
  if (!dateStr) return "Never";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pendingUsers, setPendingUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);

  useEffect(() => {
    adminApi.getUsers().then(setUsers);
    adminApi.getPendingUsers().then(setPendingUsers);
    adminApi.getPlatformStats().then(setStats);
  }, []);

  async function handleToggle(userId: string) {
    setToggling(userId);
    try {
      const updated = await adminApi.toggleUserStatus(userId);
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
    } finally {
      setToggling(null);
    }
  }

  async function handleApprove(userId: string) {
    setApproving(userId);
    try {
      const approved = await adminApi.approveUser(userId);
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
      setUsers((prev) => [...prev, approved]);
    } finally {
      setApproving(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-600 text-white">
          <ShieldAlert size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-black">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">Manage users and monitor platform health</p>
        </div>
      </div>

      {/* Platform stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard icon={Users} label="Total Users" value={stats.totalUsers} color="bg-violet-600" />
          <StatCard icon={Activity} label="Active Today" value={stats.activeToday} color="bg-emerald-600" />
          <StatCard icon={Activity} label="Active This Week" value={stats.activeThisWeek} color="bg-blue-600" />
          <StatCard icon={BarChart3} label="Total Trades" value={stats.totalTrades} color="bg-amber-500" />
          <StatCard
            icon={TrendingUp}
            label="Platform P&L"
            value={currency.format(stats.totalPnl)}
            color={stats.totalPnl >= 0 ? "bg-emerald-600" : "bg-rose-500"}
          />
        </div>
      )}

      {/* Top symbols */}
      {stats && stats.topSymbols.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <Star size={14} /> Most Traded Symbols
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {stats.topSymbols.map((sym, i) => (
              <span
                key={sym}
                className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-sm font-bold text-amber-800 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-800"
              >
                <span className="text-xs text-amber-500">#{i + 1}</span> {sym}
              </span>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Pending approvals */}
      {pendingUsers.length > 0 && (
        <Card className="border-amber-300 dark:border-amber-700">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Clock size={16} />
              Pending Approvals
              <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                {pendingUsers.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-amber-50/60 dark:bg-amber-950/20">
                    {["Name", "Email", "Registered", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.map((u) => (
                    <tr key={u.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-semibold">{u.fullName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3 text-muted-foreground">{fmt(u.joinedAt)}</td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          className="h-7 gap-1.5 bg-emerald-600 px-3 text-xs text-white hover:bg-emerald-700"
                          disabled={approving === u.id}
                          onClick={() => handleApprove(u.id)}
                        >
                          <UserCheck size={13} />
                          {approving === u.id ? "Approving…" : "Approve"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User table */}
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {["Name", "Email", "Joined", "Last Active", "Trades", "Sessions", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold">{u.fullName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{fmt(u.joinedAt)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{timeAgo(u.lastActiveAt)}</td>
                    <td className="px-4 py-3 font-mono font-bold">{u.totalTrades}</td>
                    <td className="px-4 py-3 font-mono font-bold">{u.totalSessions}</td>
                    <td className="px-4 py-3">
                      <Badge tone={u.isActive ? "green" : "slate"}>
                        {u.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => setSelectedUserId(u.id)}
                        >
                          View <ChevronRight size={13} className="ml-0.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className={`h-7 px-2 text-xs ${u.isActive ? "text-rose-500 hover:text-rose-600" : "text-emerald-600 hover:text-emerald-700"}`}
                          disabled={toggling === u.id}
                          onClick={() => handleToggle(u.id)}
                        >
                          {toggling === u.id ? "…" : u.isActive ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {selectedUserId && (
        <UserDrawer userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
      )}
    </div>
  );
}
