import "./Main.css";
import Sidebar from "../screens/Sidebar";
import { useState, useRef, type ReactNode } from "react";

type View = "home" | "duesStatus" | "groups";

export default function Settings() {
  const [view, setView] = useState<View>("home");

  // 공통 더미 데이터
  const groups = ["SW Camp_teamC", "Group A", "Group B"];
  const months = ["2025년 3월", "2025년 2월", "2025년 1월"];

  // 회비 납부 현황용 더미
 const duesRows = [
   { label: "2025년 3월", due: "2025-03-15", paid: "미납", paidDate: "-" },
   { label: "2025년 2월", due: "2025-02-15", paid: "완납", paidDate: "2025-02-13" },
   { label: "2025년 1월", due: "2025-01-15", paid: "완납", paidDate: "2025-01-13" },
   { label: "2024년 12월", due: "2024-12-15", paid: "완납", paidDate: "2024-12-15" },
   { label: "2024년 11월", due: "2024-11-15", paid: "완납", paidDate: "2024-11-10" },
 ];


  // 그룹 관리용 더미
  const groupRows = [
    { name: "그룹 A", count: 10, created: "2024-12-03", owner: "userA" },
    { name: "그룹 B", count: 5,  created: "2024-12-29", owner: "userB" },
    { name: "SW Camp_teamC", count: 7, created: "2024-09-28", owner: "이○○" },
    { name: "그룹 D", count: 4,  created: "2025-08-28", owner: "userD" },
    { name: "그룹 E", count: 7,  created: "2025-03-14", owner: "userE" },
  ];

  return (
    <div className="layout">
      <Sidebar />

      <section className="content">
        <header className="topbar">
          <div className="team">SW Camp_teamC ▾</div>
          <div className="bell" aria-label="notifications">🔔</div>
        </header>

        {view === "home" && <HomePanel onOpen={setView} />}

        {view === "duesStatus" && (
          <DetailShell
            title="회비 납부 현황"
            onBack={() => setView("home")}
            rightBadge={<RightBadge name="이○○" role="회원" />}
            filters={<FilterBar groups={groups} months={months} />}
          >
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 160 }}>납부명</th>
                  <th style={{ width: 160 }}>납부 기한</th>
                  <th style={{ width: 120 }}>납부 여부</th>
                  <th style={{ width: 160 }}>납부일</th>
                  <th style={{ width: 72 }}>⟳</th>
                  <th style={{ width: 72 }}>🗑</th>
                </tr>
              </thead>
              <tbody>
                {duesRows.map((r, i) => (
                  <tr key={i}>
                    <td>{r.label}</td>
                    <td>{r.due}</td>
                    <td>{r.paid}</td>
                    <td>{r.paidDate}</td>
                    <td>⟳</td>
                    <td>🗑</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DetailShell>
        )}

        {view === "groups" && (
          <DetailShell
            title="그룹 관리"
            onBack={() => setView("home")}
            rightBadge={<button className="btn">그룹 생성</button>}
          >
            <table className="table">
              <thead>
                <tr>
                  <th>그룹명</th>
                  <th style={{ width: 120 }}>회원 수</th>
                  <th style={{ width: 160 }}>생성일자</th>
                  <th style={{ width: 160 }}>대표자</th>
                  <th style={{ width: 72 }}>↩</th>
                  <th style={{ width: 72 }}>🗑</th>
                </tr>
              </thead>
              <tbody>
                {groupRows.map((r, i) => (
                  <tr key={i}>
                    <td>{r.name}</td>
                    <td>{r.count}명</td>
                    <td>{r.created}</td>
                    <td>{r.owner}</td>
                    <td>↩</td>
                    <td>🗑</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DetailShell>
        )}
      </section>
    </div>
  );
}

function HomePanel({ onOpen }: { onOpen: (v: View) => void }) {
  const [name, setName] = useState("이○○");
  const [phone, setPhone] = useState("010-0000-0000");
  const [isEditing, setIsEditing] = useState(false);

  const nameRef = useRef<HTMLSpanElement>(null);
  const phoneRef = useRef<HTMLSpanElement>(null);

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
      // 편집 모드 진입: 이름과 번호 모두 편집 가능 + 커서는 이름 끝
      requestAnimationFrame(() => {
        placeCaretToEnd(nameRef.current); // ← 번호로 포커스 주려면 phoneRef로 바꾸세요.
      });
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
        <Tile label="회비 납부 현황" onClick={() => onOpen("duesStatus")} />
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
              boxShadow: "0 12px 40px rgba(167,139,250,.35)",
              marginBottom: 24,
            }}
          />
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: ".02em", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
            {/* 이름 (contentEditable) */}
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
            <span style={{ fontSize: 16, fontWeight: 700, color: "#6b7280", marginLeft: 6 }}>회원</span>
            <button
              onClick={toggleEdit}
              className="btn"
              style={{ padding: "6px 4px", marginLeft: 4, whiteSpace: "nowrap" }}
              aria-label={isEditing ? "이름/번호 저장" : "이름/번호 수정"}
            >
              {isEditing ? "저장" : "수정"}
            </button>
          </div>

          {/* 전화번호 (contentEditable) */}
          <div
            ref={phoneRef as any}
            contentEditable={isEditing}
            suppressContentEditableWarning
            aria-label="전화번호 편집"
            tabIndex={0}
            onFocus={() => placeCaretToEnd(phoneRef.current!)}
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

          <div className="section-label" style={{ width: "100%", marginTop: 24 }}>
            소속 그룹
          </div>
          <div className="card" style={{ width: "100%", padding: 14, textAlign: "left", fontWeight: 800 }}>
            SW Camp_teamC
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailShell({
  title,
  onBack,
  rightBadge,
  filters,
  children,
}: {
  title: string;
  onBack: () => void;
  rightBadge?: ReactNode;
  filters?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <div className="card" style={{ padding: 16, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={onBack} aria-label="back" className="btn" style={{ minWidth: 44 }}>
          ←
        </button>
        <div style={{ fontSize: 22, fontWeight: 900, marginRight: "auto" }}>{title}</div>
        {rightBadge}
      </div>
      {filters}
      {children}
    </>
  );
}

function FilterBar({ groups, months }: { groups: string[]; months: string[] }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        marginBottom: 10,
      }}
    >
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
      <RightBadge name="이○○" role="회원" />
    </div>
  );
}

function RightBadge({ name, role }: { name: string; role: string }) {
  return (
    <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: 10 }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#a78bfa" }} />
      <div style={{ fontWeight: 900 }}>
        {name} <span style={{ color: "#6b7280", fontWeight: 700 }}>{role}</span>
      </div>
    </div>
  );
}

function Tile({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button
      className="card"
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        padding: 16,
        fontWeight: 800,
        marginBottom: 16,
        border: "1px solid #eef1f6",
        background: "#ffffff",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}