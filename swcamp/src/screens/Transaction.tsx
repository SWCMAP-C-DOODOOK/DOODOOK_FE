import "./Main.css";
import Sidebar from "../screens/Sidebar";
import Footer from "../screens/Footer";
import Header from "../screens/Header";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

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

  const location = useLocation();
  const currentGroup = useMemo(() => {
    const g = new URLSearchParams(location.search).get("group")
      ?? localStorage.getItem("doodook:selectedGroupId")
      ?? "";
    return g.trim();
  }, [location.search]);

  /** 거래목록 조회 (로컬 더미 JSON만 사용) */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErr(null);
      try {
        const tryFetch = async (path: string) => {
          const r = await fetch(path);
          if (!r.ok) throw new Error(String(r.status));
          return (await r.json()) as Txn[];
        };
        let data: Txn[] | null = null;
        const gid = (currentGroup || "").toLowerCase();

        // 1) 그룹별 표준 경로: /public/mock/groups/<groupId>/transactions.json
        if (gid) {
          const p1 = `/mock/groups/${encodeURIComponent(gid)}/transactions.json`;
          try { data = await tryFetch(p1); } catch {}
        }

        // 2) 데모 파일 매핑: g1/g2 → demo_g1/demo_g2 (루트 또는 /mock)
        if (!data && gid) {
          const isG1 = gid === 'g1' || gid.endsWith('1');
          const isG2 = gid === 'g2' || gid.endsWith('2');
          const candidate = isG1 ? '/demo_g1_transactions.json'
                           : isG2 ? '/demo_g2_transactions.json'
                           : '';
          if (candidate) { try { data = await tryFetch(candidate); } catch {} }
          if (!data && candidate) {
            const candidate2 = candidate.replace('/demo_', '/mock/demo_');
            try { data = await tryFetch(candidate2); } catch {}
          }
        }

        // 3) 공용 더미 파일
        if (!data) {
          try { data = await tryFetch('/mock/transactions.json'); } catch {}
        }

        setRows(data ?? []); // 새 그룹(데이터 없음)은 빈 표
      } catch (e: any) {
        setErr(e?.message ?? '로컬 데이터 로드 실패');
        setRows([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [q, start, end, tab, currentGroup]);

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
        <Header />

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
          ) : filtered.length === 0 ? (
            <div style={{ padding: 16, color: '#666' }}>표시할 데이터가 없습니다.</div>
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
        <Footer />
      </section>
    </div>
  );
}