import "./Main.css";
import Sidebar from "../screens/Sidebar";
import Footer from "../screens/Footer";
import Header from "../screens/Header";
import { useState, useRef, useEffect, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

type View = "home" | "members" | "groups";
type MemberRow = { name: string; role: string; email: string; phone: string; paid: string };

type GroupMeta = { id: string; name: string; createdAt: string };

const LS_GROUPS = "doodook:groups";

function readGroups(): GroupMeta[] {
  try {
    const raw = localStorage.getItem(LS_GROUPS);
    let arr: any = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) arr = [];
    // ensure createdAt exists for display
    const withDates = arr.map((g: any) => ({
      id: String(g.id),
      name: g.name ?? String(g.id),
      createdAt: g.createdAt || new Date().toISOString(),
    }));
    // if still empty, seed g1/g2 locally (in case Header seeding hasn't run yet)
    if (withDates.length === 0) {
      const now = new Date().toISOString();
      const seeded = [
        { id: "g1", name: "그룹 1", createdAt: now },
        { id: "g2", name: "그룹 2", createdAt: now },
      ];
      try { localStorage.setItem(LS_GROUPS, JSON.stringify(seeded)); } catch {}
      return seeded;
    }
    return withDates;
  } catch {
    return [];
  }
}

function writeGroups(arr: GroupMeta[]) {
  try { localStorage.setItem(LS_GROUPS, JSON.stringify(arr)); } catch {}
}

export default function Settings() {
  const [view, setView] = useState<View>("home");

  // 공통 더미 데이터
  const groups = ["SW Camp_teamC", "Group A", "Group B"];
  const months = ["2025년 3월", "2025년 2월", "2025년 1월"];
  const [membersRows, setMembersRows] = useState<MemberRow[]>([]);
  const location = useLocation();
  // 현재 그룹과 역할: g2 -> '회원', 그 외 -> '관리자'
  const paramsForRole = new URLSearchParams(location.search);
  const currentGroupId =
    paramsForRole.get("group") ||
    (typeof window !== "undefined"
      ? (localStorage.getItem("doodook:selectedGroupId") ||
         localStorage.getItem("selectedGroupId"))
      : null) ||
    "g1";
  const role = currentGroupId === "g2" ? "회원" : "관리자";
  const [groupMeta, setGroupMeta] = useState<GroupMeta[]>(readGroups());
  const [memberStats, setMemberStats] = useState<Record<string, { count: number; rep: string }>>({});

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const groupId = params.get("group") || "g1"; // default to g1

    const url = `/mock/demo_${groupId}_member.json`;

    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((rows: MemberRow[]) =>
        setMembersRows(
          rows.map((r) => ({ ...r, paid: (r.paid && r.paid.trim() === "완납") ? "완납" : "미납" }))
        )
      )
      .catch(() => {
        // 파일이 없거나 에러면 빈 데이터로 설정 → 화면에 "표시할 데이터가 없습니다" 렌더링
        setMembersRows([]);
      });
  }, [location.search]);

  useEffect(() => {
    let alive = true;
    async function computeStats() {
      const entries = await Promise.all(
        groupMeta.map(async (g) => {
          try {
            const r = await fetch(`/mock/demo_${g.id}_member.json`);
            if (!r.ok) throw new Error(String(r.status));
            const rows: MemberRow[] = await r.json();
            const admin = rows.find((x) => (x.role || "").trim() === "관리자");
            return [g.id, { count: rows.length, rep: admin ? admin.name : "" }] as const;
          } catch {
            return [g.id, { count: 0, rep: "" }] as const;
          }
        })
      );
      if (!alive) return;
      const next: Record<string, { count: number; rep: string }> = {};
      for (const [id, val] of entries) next[id] = val;
      setMemberStats(next);
    }
    computeStats();
    return () => { alive = false; };
  }, [groupMeta]);

  useEffect(() => {
    const t = setInterval(() => {
      const latest = readGroups();
      const a = groupMeta.map(g => `${g.id}|${g.name}|${g.createdAt ?? ""}`).join("||");
      const b = latest.map(g => `${g.id}|${g.name}|${g.createdAt ?? ""}`).join("||");
      if (a !== b) setGroupMeta(latest);
    }, 1000);
    return () => clearInterval(t);
  }, [groupMeta]);

  function deleteGroupById(id: string) {
    setGroupMeta((prev) => {
      const next = prev.filter((g) => g.id !== id);
      writeGroups(next);
        // remove any app keys tied to this group id
        try {
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const k = localStorage.key(i) || "";
                if (
                    k === `members_overrides:${id}` ||
                    k.endsWith(`:${id}`) ||
                    k.includes(`:${id}:`) ||
                    k.startsWith(`${id}:`)
                ) {
                    localStorage.removeItem(k);
                }
            }
        } catch {}
      // URL의 ?group=이 삭제된 그룹을 가리키면 보정
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("group") === id) {
        const fallback = next[0]?.id || "";
        if (fallback) {
          sp.set("group", fallback);
          try { localStorage.setItem("selectedGroupId", fallback); } catch {}
        } else {
          sp.delete("group");
          try { localStorage.removeItem("selectedGroupId"); } catch {}
        }
        window.history.replaceState(null, "", `${window.location.pathname}?${sp.toString()}`);
      }
      return next;
    });
  }

  return (
    <div className="layout">
      <Sidebar />

      <section className="content">
        <Header />

        {view === "home" && (
          <HomePanel onOpen={setView} role={role} />
        )}

        {view === "members" && role === "관리자" && (
          <DetailShell title="회원 관리" onBack={() => setView("home")}
            rightBadge={<RightBadge name="이○○" role={role} />}
            filters={<FilterBar groups={groups} months={months} />}
          >
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 70 }}>회원명</th>
                  <th style={{ width: 70 }}>구분</th>
                  <th style={{ width: 130 }}>이메일</th>
                  <th style={{ width: 150 }}>연락처</th>
                  <th style={{ width: 70 }}>납부 현황</th>
                  <th style={{ width: 70 }}>납부 알림</th>
                  <th style={{ width: 70 }}>회원 삭제</th>
                </tr>
              </thead>
              <tbody>
                {membersRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: 24, color: "#6b7280", fontWeight: 700 }}>
                      표시할 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  membersRows.map((r, i) => (
                    <tr key={i}>
                      <td>{r.name}</td>
                      <td>{r.role}</td>
                      <td>{r.email}</td>
                      <td>{r.phone}</td>
                      <td><PaidBadge value={r.paid} onToggle={() => setMembersRows(prev => prev.map((row, j) => j === i ? { ...row, paid: ((row.paid || "").trim() === "완납" ? "미납" : "완납") } : row))} /></td>
                      <td>🔔</td>
                      <td>🗑</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </DetailShell>
        )}

        {view === "groups" && (
          <DetailShell title="그룹 관리" onBack={() => setView("home")}
            rightBadge={<button className="btn">그룹 생성</button>}
          >
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>그룹명</th>
                  <th style={{ width: 80 }}>회원 수</th>
                  <th style={{ width: 100 }}>생성 일자</th>
                  <th style={{ width: 80 }}>대표자</th>
                  <th style={{ width: 70 }}>그룹 삭제</th>
                </tr>
              </thead>
              <tbody>
                {groupMeta.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: 24, color: "#6b7280", fontWeight: 700 }}>
                      표시할 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  groupMeta.map((g) => {
                    const stat = memberStats[g.id] || { count: 0, rep: "-" };
                    const d = new Date(g.createdAt);
                    const createdText = isNaN(d.getTime())
                      ? g.createdAt
                      : d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
                    return (
                      <tr key={g.id}>
                        <td>{g.name}</td>
                        <td>{stat.count.toLocaleString()}명</td>
                        <td>{createdText}</td>
                        <td>{stat.rep}</td>
                        <td>
                          <button
                            type="button"
                            title={`${g.name} 삭제`}
                            aria-label={`${g.name} 삭제`}
                            onClick={() => {
                              if (confirm(`정말 '${g.name}' 그룹을 삭제하시겠어요?`)) deleteGroupById(g.id);
                            }}
                            style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 16 }}
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </DetailShell>
        )}
        <Footer />
      </section>
    </div>
  );
}

function HomePanel({ onOpen, role }: { onOpen: (v: View) => void; role: string }) {
  const [name, setName] = useState("이○○");
  const [phone, setPhone] = useState("010-0000-0000");
  const [isEditing, setIsEditing] = useState(false);

  const nameRef = useRef<HTMLSpanElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);

  const placeCaretToEnd = (el: HTMLElement | null) => {
    if (!el) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    el.focus();
  };

  const toggleEdit = () => {
    if (!isEditing) {
      setIsEditing(true);
      // 편집 모드 진입: 이름/번호 모두 편집 가능 + 커서는 이름 끝
      requestAnimationFrame(() => placeCaretToEnd(nameRef.current));
    } else {
      // 저장
      const newName = nameRef.current?.textContent?.trim() || name;
      const newPhone = phoneRef.current?.textContent?.trim() || phone;
      setName(newName);
      setPhone(newPhone);
      setIsEditing(false);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 24 }}>
      <div>
        {role === "관리자" && <Tile label="회원 관리" onClick={() => onOpen("members" as View)} />}
        <Tile label="그룹 관리" onClick={() => onOpen("groups")} />
      </div>

      <div>
        <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 24 }}>
          <div
  style={{
    width: 160,
    height: 160,
    borderRadius: "50%",
    background: "#a78bfa",
    boxShadow: "0 8px 30px rgba(167,139,250,.35)",
    marginBottom: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }}
>
  <div
    style={{
      fontWeight: 1000,
      letterSpacing: "0.35em",
      color: "#fff",
      fontSize: 16,
      textAlign: "center",
      userSelect: "none",
    }}
  >
    DOODOOK
  </div>
</div>

          <div
            style={{
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: ".02em",
              marginBottom: 6,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {/* 이름 (편집 가능) */}
            <span
              ref={nameRef}
              contentEditable={isEditing}
              suppressContentEditableWarning
              aria-label="이름 편집"
              tabIndex={0}
              onFocus={() => placeCaretToEnd(nameRef.current)}
              style={{
                outline: isEditing ? "2px dashed #a78bfa" : "none",
                borderRadius: 6,
                padding: isEditing ? "0 4px" : 0,
              }}
            >
              {name}
            </span>

            <span style={{ fontSize: 16, fontWeight: 700, color: "#6b7280", marginLeft: 6 }}>{role}</span>

            <button
              onClick={toggleEdit}
              className="btn"
              style={{ padding: "6px 4px", marginLeft: 4, whiteSpace: "nowrap" }}
              aria-label={isEditing ? "이름/번호 저장" : "이름/번호 수정"}
            >
              {isEditing ? "저장" : "수정"}
            </button>
          </div>

          {/* 전화번호 (편집 가능) */}
          <div
            ref={phoneRef}
            contentEditable={isEditing}
            suppressContentEditableWarning
            aria-label="전화번호 편집"
            tabIndex={0}
            onFocus={() => placeCaretToEnd(phoneRef.current)}
            style={{
              color: "#374151",
              fontWeight: 600,
              marginTop: 4,
              outline: isEditing ? "2px dashed #a78bfa" : "none",
              borderRadius: 6,
              padding: isEditing ? "0 4px" : 0,
            }}
          >
            {phone}
          </div>

          <div style={{ color: "#374151", fontWeight: 600, marginTop: 2 }}>user1@example.com</div>
        </div>
      </div>
    </div>
  );
}

function DetailShell({ title, onBack, rightBadge, filters, children }: { title: string; onBack: () => void; rightBadge?: ReactNode; filters?: ReactNode; children: ReactNode }){
  return (
    <>
      <div className="card" style={{ padding: 16, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={onBack} aria-label="back" className="btn" style={{ minWidth: 44 }}>←</button>
        <div style={{ fontSize: 22, fontWeight: 900, marginRight: "auto" }}>{title}</div>
      </div>
      {children}
    </>
  );
}

function FilterBar({ groups, months }: { groups: string[]; months: string[] }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 10 }}>
      <div style={{ display: "flex", gap: 12 }}>
        <select className="input">
          {groups.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
        <select className="input">
          {months.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function RightBadge({ name, role }: { name: string; role: string }) {
  return (
    <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: 10 }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#a78bfa" }} />
      <div style={{ fontWeight: 900 }}>{name} <span style={{ color: "#6b7280", fontWeight: 700 }}>{role}</span></div>
    </div>
  );
}

function PaidBadge({ value, onToggle }: { value?: string; onToggle?: () => void }) {
  const isPaid = (value || "").trim() === "미납";
  const label = isPaid ? "완납" : "미납";
  const fg = isPaid ? "#065F46" : "#991B1B"; // emerald vs red
  const bg = isPaid ? "#D1FAE5" : "#FEE2E2";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isPaid}
      aria-label={`납부 현황: ${label} (클릭하여 상태 전환)`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontWeight: 800,
        fontSize: 12,
        padding: "4px 10px",
        borderRadius: 999,
        color: fg,
        background: bg,
        border: `1px solid rgba(0,0,0,.05)`,
        letterSpacing: ".02em",
        cursor: onToggle ? "pointer" : "default",
      }}
    >
      {label}
    </button>
  );
}

function Tile({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button
      className="card"
      onClick={onClick}
      style={{ width: "100%", textAlign: "left", padding: 16, fontWeight: 800, marginBottom: 16, border: "1px solid #eef1f6", background: "#ffffff", cursor: "pointer" }}
    >
      {label}
    </button>
  );
}
