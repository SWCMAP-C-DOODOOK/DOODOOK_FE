  /**
   * 그룹별 시작 잔액을 찾는다.
   * 우선순위: localStorage → /mock/demo_balance.json → 기본값(g1/g2)
   */
  async function resolveOpening(gid: string): Promise<number | undefined> {
    if (!gid) return undefined;
    // 1) localStorage override
    try {
      const v = localStorage.getItem(`doodook:opening:${gid}`);
      if (v != null && v !== "" && !Number.isNaN(Number(v))) return Number(v);
    } catch {}

    // 2) demo_balance.json (다양한 스키마 허용)
    try {
      const r = await fetch("/mock/demo_balance.json");
      if (r.ok) {
        const obj: any = await r.json();
        let entry: any = obj?.groups?.[gid] ?? obj?.[gid] ?? obj; // groups 우선, 그다음 루트, 마지막 단일 객체
        if (typeof entry === "number") return entry;
        const val = entry?.opening ?? entry?.balance ?? entry?.start;
        if (typeof val === "number") return val;
      }
    } catch {}

    // 3) safe defaults for demo groups
    const DEFAULTS: Record<string, number> = { g1: 400000, g2: 520000 };
    return DEFAULTS[gid];
  }
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

function mapLocalTxArray(arr: any[]): Txn[] {
  return (Array.isArray(arr) ? arr : []).map((x: any) => {
    const amt = typeof x.amount === "number" ? x.amount : Number(x.amount);
    const descRaw = x.description
      || (x.merchant ? `${x.merchant}${x.method ? ` (${x.method})` : ""}` : "등록 내역");
    // '(신용카드)' 꼬리표는 UI에서 숨김
    const desc = String(descRaw).replace(/\s*\(신용카드\)\s*$/u, "").trim();
    const isIncome = x.type === "income" || (x.deposit && x.deposit > 0);
    const t: Txn = {
      date: x.date || "",
      description: desc,
      deposit: isIncome ? (amt || x.deposit) : undefined,
      withdraw: !isIncome ? (amt || x.withdraw) : undefined,
      balance: x.balance,
      memo: x.memo,
      type: isIncome ? "income" : "expense",
    };
    return t;
  });
}

const krw = (n?: number) => (n == null ? "" : n.toLocaleString("ko-KR") + "원");

/**
 * 최신→과거(내림차순) 정렬된 배열에 대해 잔액을 재계산한다.
 * `forcedOpening`이 주어지면 가장 과거 시점의 시작 잔액을 그 값으로 고정한다
 * (예: 시작금액 400,000원). 그 후 과거→현재 방향으로 누적(입금-출금)하여
 * 모든 행의 balance를 채운다. `forcedOpening`이 없으면 기존 앵커 방식으로
 * (첫 번째 balance가 명시된 행을 기준으로) 계산한다.
 */
function recomputeBalances(sortedDesc: Txn[], forcedOpening?: number): Txn[] {
  if (!Array.isArray(sortedDesc) || sortedDesc.length === 0) return sortedDesc;

  // 과거→현재(오름차순)으로 복사
  const ascend = sortedDesc
    .slice()
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));

  if (typeof forcedOpening === "number" && !Number.isNaN(forcedOpening)) {
    // 시작 잔액을 고정(예: 400,000)
    let running = forcedOpening;
    for (const t of ascend) {
      const delta = (t.deposit ?? 0) - (t.withdraw ?? 0);
      running += delta;
      t.balance = running;
    }
    return sortedDesc; // 같은 객체를 갱신했으므로 원본 참조 유지
  }

  // 기존 앵커 방식(후방 호환): 최신부터 내려오며 balance가 있는 첫 행을 기준으로 함
  const anchor = sortedDesc.find(
    (t) => typeof t.balance === "number" && !Number.isNaN(t.balance as number)
  );
  if (!anchor) return sortedDesc; // 기준이 없으면 그대로 사용

  const anchorDate = anchor.date ?? "";

  // anchor 시점까지의 누적 변화량(입금-출금)
  const sumDeltaToAnchor = ascend.reduce((acc, t) => {
    if ((t.date ?? "") <= anchorDate) {
      const delta = (t.deposit ?? 0) - (t.withdraw ?? 0);
      return acc + delta;
    }
    return acc;
  }, 0);

  // 시작 잔액 = anchor 잔액 - (anchor까지의 누적 변화량)
  const opening = (anchor.balance ?? 0) - sumDeltaToAnchor;

  let running = opening;
  for (const t of ascend) {
    const delta = (t.deposit ?? 0) - (t.withdraw ?? 0);
    running += delta;
    t.balance = running;
  }

  return sortedDesc;
}

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

        const openingFromFile = await resolveOpening(gid);

        // 1) 그룹별 표준 경로 시도
        if (gid) {
          const p1 = `/mock/groups/${encodeURIComponent(gid)}/transactions.json`;
          try { data = await tryFetch(p1); } catch {}
        }

        // 2) 데모 그룹(g1/g2)만 예외적으로 데모 파일로 폴백
        if (!data && gid && (gid === "g1" || gid === "g2")) {
          const candidates = [
            `/demo_${gid}_transactions.json`,
            `/mock/demo_${gid}_transactions.json`,
          ];
          for (const c of candidates) {
            try { data = await tryFetch(c); break; } catch {}
          }
        }

        // 3) 로컬 등록 내역 병합 (해당 그룹)
        if (gid) {
          try {
            const raw = localStorage.getItem(`doodook:tx:${gid}`);
            if (raw) {
              const parsed = JSON.parse(raw);
              const mapped = mapLocalTxArray(parsed);
              if (mapped.length) {
                data = [...mapped, ...(data ?? [])];
              }
            }
          } catch { /* ignore */ }
        }

        // 4) 최종 폴백: 그룹이 지정되지 않은 경우에만 공용 더미 사용
        if (!data) {
          if (!gid) {
            try { data = await tryFetch('/mock/transactions.json'); } catch {}
          } else {
            data = []; // 새 그룹(데이터 없음) → 빈 결과
          }
        }

        const sorted = (data ?? []).slice().sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
        const recalculated = recomputeBalances(sorted, openingFromFile);
        setRows(recalculated);
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
                  <th style={{ width: 70 }}>일자</th>
                  <th style={{ width: 70 }}>내역</th>
                  <th style={{ width: 70 }}>입금</th>
                  <th style={{ width: 70 }}>출금</th>
                  <th style={{ width: 70 }}>잔액</th>
                  <th style={{ width: 70 }}>비고</th>
                    </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => (
                  <tr key={i}>
                    <td>{t.date}</td>
                    <td>{t.description}</td>
                    <td style={{ textAlign: "left" }}>{t.deposit ? krw(t.deposit) : ""}</td>
                    <td style={{ textAlign: "left" }}>{t.withdraw ? krw(t.withdraw) : ""}</td>
                    <td style={{ textAlign: "left" }}>{t.balance != null ? krw(t.balance) : ""}</td>
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