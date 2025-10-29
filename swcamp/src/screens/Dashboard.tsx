import "./Main.css";
import Sidebar from "../screens/Sidebar";
import Footer from "../screens/Footer";
import Header from "../screens/Header";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

// ---- Types ----
type Txn = {
  date: string; // YYYY-MM-DD
  description: string;
  deposit?: number;
  withdraw?: number;
  balance?: number;
  type?: "income" | "expense";
};

type AccountMeta = {
  bank: string;
  name: string; // 계좌명
  number: string; // 계좌번호(표시용)
};

function VBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="vbar">
      <div className="vbar-col">
        <div className="vbar-fill" style={{ height: `${value}%`, background: color }} />
      </div>
      <div className="vbar-label">{label}</div>
    </div>
  );
}

function BarPair({ label, income, expense, max }: { label: string; income: number; expense: number; max: number }) {
  const clamp = (n: number) => (n <= 0 || !isFinite(n) ? 0 : n);
  const incPct = max > 0 ? Math.min(100, (clamp(income) / max) * 100) : 0;
  const expPct = max > 0 ? Math.min(100, (clamp(expense) / max) * 100) : 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120 }}>
        <div title={`수입: ${income.toLocaleString("ko-KR")}원`} style={{ width: 12, height: `${incPct}%`, background: "#16a34a", borderRadius: 4 }} />
        <div title={`지출: ${expense.toLocaleString("ko-KR")}원`} style={{ width: 12, height: `${expPct}%`, background: "#ef4444", borderRadius: 4 }} />
      </div>
      <div className="vbar-label">{label}</div>
    </div>
  );
}

export default function Dashboard() {
  const location = useLocation();

  // Selected group id resolved from URL (?group=) or localStorage (set by Header)
  const [groupId, setGroupId] = useState<string>("");

  const readGroup = () => {
    const q = new URLSearchParams(location.search).get("group");
    // source of truth = URL (?group=). If missing, default to g1.
    const v = (q ?? "g1").toLowerCase().trim();
    return v;
  };

  // On first mount and whenever URL changes, resolve group
  useEffect(() => {
    setGroupId(readGroup());
  }, [location.search]);


  const [rows, setRows] = useState<Txn[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [account, setAccount] = useState<AccountMeta | null>(null);

  // Utility: fetch JSON with graceful failure
  const tryFetch = async <T,>(path: string): Promise<T | null> => {
    try {
      const r = await fetch(path, { cache: "no-store" });
      if (!r.ok) return null;
      return (await r.json()) as T;
    } catch {
      return null;
    }
  };

  // Load transactions from local JSON only (group-aware)
  useEffect(() => {
    let alive = true;
    const load = async () => {
      // 1) group-specific standard path
      const gid = groupId;
      let data: Txn[] | null = null;
      if (gid) {
        data = await tryFetch<Txn[]>(`/mock/groups/${encodeURIComponent(gid)}/transactions.json`);
      }
      // 2) demo mapping (g1/g2)
      if (!data && gid) {
        if (gid === "g1") {
          data = (await tryFetch<Txn[]>("/demo_g1_transactions.json"))
            ?? (await tryFetch<Txn[]>("/mock/demo_g1_transactions.json"));
        } else if (gid === "g2") {
          data = (await tryFetch<Txn[]>("/demo_g2_transactions.json"))
            ?? (await tryFetch<Txn[]>("/mock/demo_g2_transactions.json"));
        }
      }
      // 3) if nothing found for this group, show empty (don't fall back to a global file)
      if (!data) {
        data = [];
      }
      // 4) final
      const finalRows = data ?? [];

      if (!alive) return;
      setRows(finalRows);

      // Compute balance: prefer last by date balance; else reduce from 0
      if (finalRows.length > 0) {
        const asc = [...finalRows].sort((a, b) => a.date.localeCompare(b.date));
        const last = asc[asc.length - 1];
        if (typeof last.balance === "number") {
          setBalance(last.balance);
        } else {
          const bal = asc.reduce((acc, t) => acc + (t.deposit ?? 0) - (t.withdraw ?? 0), 0);
          setBalance(bal);
        }
      } else {
        setBalance(0);
      }
    };
    load();
    return () => { alive = false; };
  }, [groupId]);

  // Load account meta from local JSON (optional per group)
  useEffect(() => {
    let alive = true;
    const loadMeta = async () => {
      const gid = groupId;
      let meta: AccountMeta | null = null;

      // 1) group-specific path (if you later add per-group files)
      if (gid) {
        meta = await tryFetch<AccountMeta>(`/mock/groups/${encodeURIComponent(gid)}/account.json`);

        // 2) demo mappings for g1 / g2 (and ids that end with 1 or 2)
        if (!meta && gid === "g1") {
          meta = (await tryFetch<AccountMeta>("/mock/demo_g1_account.json"))
              ?? (await tryFetch<AccountMeta>("/demo_g1_account.json"));
        }
        if (!meta && gid === "g2") {
          meta = (await tryFetch<AccountMeta>("/mock/demo_g2_account.json"))
              ?? (await tryFetch<AccountMeta>("/demo_g2_account.json"));
        }
      }

      // 3) if nothing was found, mark as missing (show placeholder UI)
      if (!meta) {
        if (!alive) return;
        setAccount(null);
        return;
      }

      if (!alive) return;
      setAccount(meta);
    };
    loadMeta();
    return () => { alive = false; };
  }, [groupId]);

  const recent7 = useMemo(() => {
    if (!rows || rows.length === 0) return [] as Txn[];
    const desc = [...rows].sort((a, b) => b.date.localeCompare(a.date));
    return desc.slice(0, 7);
  }, [rows]);

  const monthlyStats = useMemo(() => {
    // Build YYYY-MM -> totals
    const map = new Map<string, { y: number; m: number; label: string; income: number; expense: number }>();
    for (const t of rows) {
      if (!t?.date) continue;
      const y = Number(t.date.slice(0, 4));
      const m = Number(t.date.slice(5, 7));
      const key = `${y}-${String(m).padStart(2, "0")}`;
      const label = `${String(y).slice(2)}.${String(m).padStart(2, "0")}`; // e.g., 25.03
      if (!map.has(key)) map.set(key, { y, m, label, income: 0, expense: 0 });
      const rec = map.get(key)!;
      if (typeof t.deposit === "number" && t.deposit > 0) rec.income += t.deposit;
      if (typeof t.withdraw === "number" && t.withdraw > 0) rec.expense += t.withdraw;
    }
    // Sort by year, month
    return Array.from(map.values()).sort((a, b) => (a.y !== b.y ? a.y - b.y : a.m - b.m));
  }, [rows]);

  const monthsToShow = useMemo(() => {
    // 최근 5개월만 표시
    return monthlyStats.slice(-5);
  }, [monthlyStats]);

  const monthlyMax = useMemo(() => {
    if (monthsToShow.length === 0) return 0;
    return monthsToShow.reduce((mx, r) => Math.max(mx, r.income, r.expense), 0);
  }, [monthsToShow]);

  const fmtAmount = (t: Txn) => {
    const inc = typeof t.deposit === "number" && t.deposit! > 0;
    const dec = typeof t.withdraw === "number" && t.withdraw! > 0;
    const val = inc ? t.deposit! : dec ? -t.withdraw! : 0;
    const sign = val >= 0 ? "+" : "-";
    return `${sign} ${Math.abs(val).toLocaleString("ko-KR")}원`;
  };

  const kind = (t: Txn) => {
    if (t.type) return t.type === "income" ? "수입" : "지출";
    if (typeof t.deposit === "number" && t.deposit! > 0) return "수입";
    if (typeof t.withdraw === "number" && t.withdraw! > 0) return "지출";
    return "";
  };

  return (
    <div className="layout">
      <Sidebar />

      <section className="content">
        <Header team="SW Camp_teamC" />

        <div className="grid">
          {/* Labels outside cards */}
          <div className="section-label">회비 현황</div>
          <div className="section-label right">최근 거래 내역</div>

          {/* Balance card */}
          <div className="card balance">
            <div className="balance-amount">{balance.toLocaleString("ko-KR")} 원</div>
            {account ? (
              <div className="balance-card">
                <div>
                  <div className="bank">{account.bank}</div>
                  <div className="acc">{account.name}</div>
                  <div className="acc-sub">{account.number}</div>
                </div>
                <div className="chip" />
              </div>
            ) : (
              <div
                className="account-placeholder"
                style={{
                  background: "#e5e7eb",
                  width: "100%",
                  minHeight: 90,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  borderRadius: 12,
                }}
              >
                <button
                  type="button"
                  aria-label="add account"
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 9999,
                    border: "none",
                    background: "white",
                    fontSize: 28,
                    lineHeight: 1,
                    cursor: "pointer",
                  }}
                >
                  +
                </button>
                <div style={{ color: "#374151", fontWeight: 600 }}>계좌를 등록하세요</div>
              </div>
            )}
          </div>

          {/* Chart card */}
          <div className="card chart">
            <div className="section-title" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="muted">Monthly</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 10, height: 10, background: "#16a34a", borderRadius: 2 }} /> 수입
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 10, height: 10, background: "#ef4444", borderRadius: 2 }} /> 지출
                </span>
              </div>
            </div>
            <div
              className="chart-bars"
              style={{ display: "flex", alignItems: "flex-end", gap: 12, minHeight: 160, width: "100%" }}
            >
              {monthsToShow.length === 0 ? (
                <div style={{ color: "#666", padding: 12 }}>표시할 데이터가 없습니다.</div>
              ) : (
                monthsToShow.map((m) => (
                  <div key={m.label} style={{ flex: "1 1 0", display: "flex", justifyContent: "center" }}>
                    <BarPair label={m.label} income={m.income} expense={m.expense} max={monthlyMax} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent transactions (title outside) */}
          <div className="card recent">
            {recent7.length === 0 ? (
              <div style={{ padding: 16, color: "#666" }}>표시할 데이터가 없습니다.</div>
            ) : (
              <ul className="txn-list">
                {recent7.map((t, i) => (
                  <li key={`${t.date}-${i}`} className="txn">
                    <div className="icon" />
                    <div className="txn-main">
                      <div className="txn-title">{t.description}</div>
                      <div className="txn-sub">{kind(t)}</div>
                    </div>
                    <div className={`txn-amount ${fmtAmount(t).startsWith("+") ? "inc" : "dec"}`}>
                      {fmtAmount(t)}
                    </div>
                    <div className="txn-date">{t.date}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <Footer />
      </section>
    </div>
  );
}