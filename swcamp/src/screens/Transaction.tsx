import "./Main.css";
import Sidebar from "../screens/Sidebar";
import { useEffect, useMemo, useState } from "react";

/** 단일 거래 레코드 타입 */
type Txn = {
  date: string;          // ISO "YYYY-MM-DD"
  description: string;   // 내역
  deposit?: number;      // 입금 (양수)
  withdraw?: number;     // 출금 (양수)
  balance?: number;      // 잔액
  memo?: string;         // 비고
  type?: "income" | "expense";
};

/** 서버 준비 전 화면 확인용 목데이터 */
const MOCK: Txn[] = [
  { date: "2025-07-07", description: "연습실 대관료", withdraw: 24000, balance: 200000 },
  { date: "2025-07-05", description: "결제 내역", withdraw: 330000, balance: 224000 },
  { date: "2025-05-14", description: "정기 엠티 운영 비용", withdraw: 195000, balance: 554000 },
  { date: "2025-03-15", description: "상반기 회비_신OO", deposit: 100000, balance: 195000 },
  { date: "2025-03-15", description: "상반기 회비_이OO", deposit: 100000, balance: 295000 },
];

const krw = (n?: number) => (n == null ? "" : n.toLocaleString("ko-KR") + "원");

export default function Transaction() {
  const [q, setQ] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [tab, setTab] = useState<"all" | "income" | "expense">("all");

  const [rows, setRows] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  /** 오픈뱅킹 거래목록 조회 */
  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    if (tab !== "all") params.set("type", tab);

    const url = `/api/v1/banking/transactions${params.toString() ? "?" + params.toString() : ""}`;

    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: Txn[] = await res.json();
        setRows(data);
      } catch (_e) {
        // 서버가 아직 안 붙었으면 목데이터로 표시
        setRows(MOCK);
      } finally {
        setLoading(false);
      }
    })();
  }, [q, start, end, tab]);

  /** 클라이언트 사이드 추가 필터링 */
  const filtered = useMemo(() => {
    return rows.filter((t) => {
      if (tab === "income" && !(t.deposit && t.deposit > 0)) return false;
      if (tab === "expense" && !(t.withdraw && t.withdraw > 0)) return false;
      if (q && !t.description?.toLowerCase().includes(q.toLowerCase())) return false;
      if (start && t.date < start) return false;
      if (end && t.date > end) return false;
      return true;
    });
  }, [rows, q, start, end, tab]);

  return (
    <div className="layout">
      <Sidebar />

      <section className="content">
        <header className="topbar">
          <div className="team">SW Camp_teamC ▾</div>
          <div className="bell" aria-label="notifications">🔔</div>
        </header>

        <div className="section-label">입출금 내역</div>

        {/* 검색 / 날짜 필터 */}
        <div className="filters">
          <input
            className="search-input"
            placeholder="검색어를 입력하세요."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="date-input">
            <label>
              시작일&nbsp;
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </label>
            &nbsp;&nbsp;
            <label>
              종료일&nbsp;
              <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </label>
          </div>
        </div>

        {/* 탭 */}
        <div className="tabs">
          <button className={`tab ${tab === "all" ? "active" : ""}`} onClick={() => setTab("all")}>전체</button>
          <button className={`tab ${tab === "income" ? "active" : ""}`} onClick={() => setTab("income")}>수입</button>
          <button className={`tab ${tab === "expense" ? "active" : ""}`} onClick={() => setTab("expense")}>지출</button>
        </div>

        {/* 테이블 */}
        <div className="card">
          {loading ? (
            <div style={{ padding: 16 }}>불러오는 중…</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>일자</th>
                  <th>내역</th>
                  <th>입금</th>
                  <th>출금</th>
                  <th>잔액</th>
                  <th>비고</th>
                    </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => (
                  <tr key={i}>
                    <td>{t.date}</td>
                    <td>{t.description}</td>
                    <td className="num">{t.deposit ? krw(t.deposit) : ""}</td>
                    <td className="num">{t.withdraw ? krw(t.withdraw) : ""}</td>
                    <td className="num">{t.balance != null ? krw(t.balance) : ""}</td>
                    <td>{t.memo ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {err && <div style={{ color: "crimson", padding: 12 }}>불러오기 오류: {err}</div>}
        </div>
      </section>
    </div>
  );
}