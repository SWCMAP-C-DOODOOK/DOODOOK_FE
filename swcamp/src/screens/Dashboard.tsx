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
  const [account, setAccount] = useState<AccountMeta>({
    bank: "카카오뱅크",
    name: "SWC모임통장",
    number: "*** ***** 2598",
  });

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
        if (gid === "g1" || gid.endsWith("1")) {
          data = (await tryFetch<Txn[]>("/demo_g1_transactions.json"))
            ?? (await tryFetch<Txn[]>("/mock/demo_g1_transactions.json"));
        } else if (gid === "g2" || gid.endsWith("2")) {
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
        if (!meta && (gid === "g1" || gid.endsWith("1"))) {
          meta = (await tryFetch<AccountMeta>("/mock/demo_g1_account.json"))
              ?? (await tryFetch<AccountMeta>("/demo_g1_account.json"));
        }
        if (!meta && (gid === "g2" || gid.endsWith("2"))) {
          meta = (await tryFetch<AccountMeta>("/mock/demo_g2_account.json"))
              ?? (await tryFetch<AccountMeta>("/demo_g2_account.json"));
        }
      }

      // 3) final fallback (if nothing was found)
      if (!meta) {
        meta = { bank: "카카오뱅크", name: "모임통장", number: "" };
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
            <div className="balance-card">
              <div>
                <div className="bank">{account.bank}</div>
                <div className="acc">{account.name}</div>
                <div className="acc-sub">{account.number}</div>
              </div>
              <div className="chip" />
            </div>
          </div>

          {/* Chart card */}
          <div className="card chart">
            <div className="section-title">
              <span className="muted">Monthly</span>
            </div>
            <div className="chart-bars">
              <VBar label="25.03" value={55} color="#a78bfa" />
              <VBar label="25.04" value={30} color="#f472b6" />
              <VBar label="25.05" value={95} color="#f472b6" />
              <VBar label="25.06" value={35} color="#f472b6" />
              <VBar label="25.07" value={18} color="#a78bfa" />
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