import { useEffect, useRef, useState } from "react";
import { Users, Activity, TrendingUp, BarChart3, Star, X, ChevronRight, ShieldAlert, UserCheck, Clock, KeyRound, ListOrdered, LayoutDashboard, Eye, EyeOff, Pencil, Check, ChevronDown, ChevronUp, Tag, AlertCircle } from "lucide-react";
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

function TradeRow({ t }: { t: AdminTrade }) {
  const [expanded, setExpanded] = useState(false);
  const isWin = t.outcome === "Win";
  const isLoss = t.outcome === "Loss";
  const isLong = t.positionType === "Long";

  return (
    <>
      <tr
        className="border-b border-border hover:bg-muted/20 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="font-bold">{t.symbol}</span>
            <span className={`rounded px-1 py-0.5 text-[10px] font-bold ${isLong ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400"}`}>
              {t.positionType}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">{t.sector || "—"}</p>
        </td>
        <td className="px-3 py-2.5 text-xs text-muted-foreground">
          <div>{new Date(t.entryDate).toLocaleDateString()}</div>
          <div>{t.exitDate ? new Date(t.exitDate).toLocaleDateString() : <span className="italic">Open</span>}</div>
        </td>
        <td className="px-3 py-2.5">
          <span className={`font-bold text-sm ${t.pnl >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
            {currency.format(t.pnl)}
          </span>
        </td>
        <td className="px-3 py-2.5">
          <span className={`font-mono text-xs font-bold ${t.rMultiple >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
            {t.rMultiple.toFixed(2)}R
          </span>
        </td>
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-1">
            {"★★★★★".split("").map((_, i) => (
              <span key={i} className={`text-[10px] ${i < t.confidenceScore ? "text-amber-400" : "text-muted-foreground/30"}`}>★</span>
            ))}
          </div>
        </td>
        <td className="px-3 py-2.5">
          <Badge tone={isWin ? "green" : isLoss ? "red" : "slate"}>{t.outcome}</Badge>
        </td>
        <td className="px-3 py-2.5 text-muted-foreground">
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-border bg-muted/10">
          <td colSpan={7} className="px-4 py-3">
            <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-xs">
              <Detail label="Strategy" value={t.strategy || "—"} />
              <Detail label="Broker" value={t.broker || "—"} />
              <Detail label="Entry Price" value={`$${t.entryPrice.toFixed(2)}`} />
              <Detail label="Exit Price" value={t.exitPrice != null ? `$${t.exitPrice.toFixed(2)}` : "—"} />
              <Detail label="Stop Loss" value={`$${t.stopLoss.toFixed(2)}`} />
              <Detail label="Size" value={t.size.toString()} />
              <Detail label="Risk $" value={currency.format(t.riskAmount)} />
              <Detail label="Reward $" value={currency.format(t.rewardAmount)} />
              <Detail label="Fees" value={t.fees > 0 ? currency.format(t.fees) : "—"} />
              {t.slippage > 0 && <Detail label="Slippage" value={currency.format(t.slippage)} />}
            </div>
            {t.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Tag size={11} className="text-muted-foreground" />
                {t.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">{tag}</span>
                ))}
              </div>
            )}
            {t.mistakes.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <AlertCircle size={11} className="text-rose-500" />
                {t.mistakes.map((m) => (
                  <span key={m} className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">{m}</span>
                ))}
              </div>
            )}
            {t.notes && (
              <p className="mt-2 text-xs text-muted-foreground italic border-l-2 border-border pl-2">{t.notes}</p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function UserDrawer({ userId, onClose, onUserUpdated }: { userId: string; onClose: () => void; onUserUpdated: (u: AdminUser) => void }) {
  const [tab, setTab] = useState<DrawerTab>("overview");
  const [summary, setSummary] = useState<UserSummary | null>(null);
  const [trades, setTrades] = useState<AdminTrade[] | null>(null);
  const [tradesError, setTradesError] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingTrades, setLoadingTrades] = useState(false);

  // name edit state
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [nameSaving, setNameSaving] = useState(false);

  // password tab state
  const [newPassword, setNewPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwResult, setPwResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const pwRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    adminApi.getUserSummary(userId).then((s) => {
      setSummary(s);
      setNameValue(s.fullName);
    }).finally(() => setLoadingSummary(false));
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

  async function handleSaveName() {
    if (!nameValue.trim() || nameValue.trim() === summary?.fullName) { setEditingName(false); return; }
    setNameSaving(true);
    try {
      const updated = await adminApi.updateUserName(userId, nameValue.trim());
      setSummary((s) => s ? { ...s, fullName: nameValue.trim() } : s);
      onUserUpdated(updated);
      setEditingName(false);
    } finally {
      setNameSaving(false);
    }
  }

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
    { id: "trades" as DrawerTab, label: `Trades${trades ? ` (${trades.length})` : ""}`, icon: ListOrdered },
    { id: "password" as DrawerTab, label: "Password", icon: KeyRound },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-2xl flex-col border-l border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <div className="flex-1 min-w-0">
            {loadingSummary ? (
              <p className="text-lg font-black">Loading…</p>
            ) : editingName ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setEditingName(false); }}
                  className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-ring w-64"
                />
                <button
                  onClick={handleSaveName}
                  disabled={nameSaving}
                  className="rounded-lg p-1.5 hover:bg-emerald-100 text-emerald-600 transition"
                >
                  <Check size={16} />
                </button>
                <button onClick={() => setEditingName(false)} className="rounded-lg p-1.5 hover:bg-muted transition text-muted-foreground">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-lg font-black truncate">{summary?.fullName}</p>
                <button
                  onClick={() => setEditingName(true)}
                  className="rounded-lg p-1 hover:bg-muted transition text-muted-foreground"
                  title="Edit name"
                >
                  <Pencil size={13} />
                </button>
              </div>
            )}
            {!editingName && <p className="text-xs text-muted-foreground">{summary?.email}</p>}
          </div>
          <button onClick={onClose} className="ml-3 rounded-lg p-1.5 hover:bg-muted transition">
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
                    <tr className="border-b border-border bg-muted/40 sticky top-0">
                      {["Symbol / Sector", "Entry / Exit", "P&L", "R", "Confidence", "Outcome", ""].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((t) => <TradeRow key={t.id} t={t} />)}
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
        <UserDrawer
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onUserUpdated={(updated) => setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))}
        />
      )}
    </div>
  );
}
