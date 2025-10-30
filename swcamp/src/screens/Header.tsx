import { useEffect, useMemo, useRef, useState, CSSProperties } from "react";
import { useNavigate, useLocation } from "react-router-dom";

// 페이지 상단 바
// 그룹 아이디, 그룹 이름으로 구분
export type Group = {
  id: string | number;
  name: string;
  iconUrl?: string;
  createdAt?: string; // ISO string stored together in doodook:groups
};

// 그룹 선택 드롭다운
type HeaderProps = {
  // 그룹 목록
  groups?: Group[];
  // 선택된 그룹
  selectedGroupId?: Group["id"];
  //그룹별 화면 전환
  onChangeGroup?: (id: Group["id"]) => void;
  // 그룹 생성
  onCreateGroup?: (name: string) => Promise<Group | { id: Group["id"], name: string } | void>;
  // 초대 링크 생성
  onInviteMember?: (groupId: Group["id"]) => Promise<string> | string | void;
};

// 헤더 함수
export default function Header({
  groups = [],
  selectedGroupId,
  onChangeGroup,
  onCreateGroup,
  onInviteMember,
}: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  // 그룹 변경 시 즉시 화면 전환
  const [localSelectedId, setLocalSelectedId] = useState<Group["id"] | undefined>(selectedGroupId);
  useEffect(() => { setLocalSelectedId(selectedGroupId); }, [selectedGroupId]);
  const LS_GROUPS = "doodook:groups";
  const LS_SELECTED = "doodook:selectedGroupId";

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const createInputRef = useRef<HTMLInputElement | null>(null);

  // 새로 생성된 그룹을 일시적으로 보관
  const [optimisticGroups, setOptimisticGroups] = useState<Group[]>([]);

  // props의 groups와 로컬에 추가한 optimisticGroups를 아이디 기준으로 병합
  const allGroups = useMemo(() => {
    const map = new Map<string, Group>();
    (groups ?? []).forEach((g) => map.set(String(g.id), g));
    optimisticGroups.forEach((g) => map.set(String(g.id), g));
    return Array.from(map.values());
  }, [groups, optimisticGroups]);

  const selected = useMemo(() => {
    if (!allGroups || allGroups.length === 0) return undefined;
    const effId = localSelectedId ?? selectedGroupId;
    return (
      allGroups.find((g) => String(g.id) === String(effId)) ?? allGroups[0]
    );
  }, [allGroups, selectedGroupId, localSelectedId]);

  useEffect(() => { if (createOpen) createInputRef.current?.focus(); }, [createOpen]);

  // 초기 로드: 기본 그룹 시드(그룹1 = g1, 그룹2 = g2) + 병합 + URL ?group 우선 적용
  useEffect(() => {
    try {
      // 0) 저장된 그룹 불러오기
      let saved: Group[] = [];
      const raw = localStorage.getItem(LS_GROUPS);
      if (raw) {
        try { saved = JSON.parse(raw) as Group[]; } catch { saved = []; }
      }

      // 0.5) 마이그레이션: createdAt 없는 항목에 현재 시각 채워넣기
      if (saved && saved.length > 0) {
        let mutated = false;
        saved = saved.map((g) => {
          if (!('createdAt' in g) || !g.createdAt) {
            mutated = true;
            return { ...g, createdAt: new Date().toISOString() };
          }
          return g;
        });
        if (mutated) {
          try { localStorage.setItem(LS_GROUPS, JSON.stringify(saved)); } catch {}
        }
      }

      // 1) 저장된 그룹이 없으면 기본 두 개 시드
      if (!saved || saved.length === 0) {
        const nowIso = new Date().toISOString();
        saved = [
          { id: 'g1', name: '그룹 1', createdAt: nowIso },
          { id: 'g2', name: '그룹 2', createdAt: nowIso },
        ];
        try { localStorage.setItem(LS_GROUPS, JSON.stringify(saved)); } catch {}
      }

      // 2) 상태 병합 반영 (props.groups와 optimistic 병합 로직에 합류)
      setOptimisticGroups((prev) => {
        const map = new Map<string, Group>();
        [...prev, ...saved].forEach((g) => map.set(String(g.id), g));
        return Array.from(map.values());
      });

      // 3) URL의 ?group= 이 있으면 최우선 적용
      const fromQuery = new URLSearchParams(location.search).get('group');
      if (fromQuery) {
        try { localStorage.setItem(LS_SELECTED, String(fromQuery)); } catch {}
        if (!selectedGroupId || String(selectedGroupId) !== String(fromQuery)) {
          onChangeGroup?.(fromQuery as any);
        }
        return;
      }

      // 4) URL이 비어 있으면 localStorage 선택 또는 g1을 기본값으로 저장/적용
      const sel = localStorage.getItem(LS_SELECTED) || 'g1';
      try { localStorage.setItem(LS_SELECTED, sel); } catch {}
      if (!selectedGroupId || String(selectedGroupId) !== String(sel)) {
        onChangeGroup?.(sel as any);
      }
      // 실제 URL에 붙이는 것은 아래 별도 effect에서 수행
    } catch {}
  }, []);

  // 라우트에 항상 ?group 포함 (그룹이 하나라도 있을 때)
  useEffect(() => {
    const hasGroups = (allGroups?.length ?? 0) > 0;
    if (!hasGroups) return;

    const qs = new URLSearchParams(location.search);
    const exists = qs.get("group");

    const pickId =
      (localSelectedId ?? selectedGroupId) ??
      localStorage.getItem(LS_SELECTED) ??
      (allGroups[0] ? String(allGroups[0].id) : "");

    if (!exists && pickId) {
      try { localStorage.setItem(LS_SELECTED, String(pickId)); } catch {}
      if (!selectedGroupId || String(selectedGroupId) !== String(pickId)) {
        onChangeGroup?.(pickId as any);
      }
      const path = location.pathname || "/dashboard";
      navigate({ pathname: path, search: `?group=${encodeURIComponent(String(pickId))}` }, { replace: true });
    }
  }, [location.pathname, location.search, allGroups, localSelectedId, selectedGroupId]);

  const handleSelect = (id: Group["id"]) => {
    if (id == null || id === "") return;
    if (String(id) !== String(selected?.id)) {
      onChangeGroup?.(id);
    }
    // 라벨 즉시 반영
    setLocalSelectedId(id);

    // 선택값 저장
    try { localStorage.setItem(LS_SELECTED, String(id)); } catch {}

    // 현재 경로 기준으로 목적지 계산 (대시보드/입출금/거래등록/설정 유지)
    try {
      const p = location.pathname || "";
      const isDashboard = /(?:^|\/)dashboard\/?$/.test(p) || p === "/";
      const isTx        = /(?:^|\/)(transaction|transactions|history|ledger)\/?$/.test(p);
      const isRegister  = /(?:^|\/)register\/?$/.test(p);
      const isSettings  = /(?:^|\/)settings\/?$/.test(p);

      let target = "/dashboard";
      if (isTx)          target = "/transaction";
      else if (isRegister) target = "/register";
      else if (isSettings) target = "/settings";

      navigate({ pathname: target, search: `?group=${encodeURIComponent(String(id))}` }, { replace: true });
    } catch {}
  };

  const handleCreateConfirm = async () => {
    const name = createName.trim();
    if (!name) return;
    try {
      const ret: any = await onCreateGroup?.(name);
      const newGroup: Group = {
        id: ret?.id ?? String(Date.now()),
        name: ret?.name ?? name,
        createdAt: new Date().toISOString(),
      };
      // 병합(이미 존재하면 추가 안 함)
      setOptimisticGroups((prev) => {
        const exists = [...(groups ?? []), ...prev].some(
          (g) => String(g.id) === String(newGroup.id)
        );
        const next = exists ? prev : [...prev, newGroup];
        try { localStorage.setItem(LS_GROUPS, JSON.stringify(next)); } catch {}
        return next;
      });
      localStorage.setItem(LS_SELECTED, String(newGroup.id));
      try { navigate({ pathname: "/dashboard", search: `?group=${encodeURIComponent(String(newGroup.id))}` }); } catch {}
      onChangeGroup?.(newGroup.id);
    } finally {
      setCreateName("");
      setCreateOpen(false);
    }
  };

  // 그룹 아이디 붙여서 초대 링크 생성
  const handleInvite = async () => {
    const id = selected?.id;
    if (id == null) { alert("선택된 그룹이 없습니다."); return; }
    let url: any;
    try {
      url = await onInviteMember?.(id);
    } catch {}
    if (!url) {
      url = `${window.location.origin}/invite?group=${encodeURIComponent(String(id))}`;
    }
    setInviteLink(String(url));
    setInviteOpen(true);
  };

  // 초대 링크 복사 버튼
  const copyInvite = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      alert("초대 링크가 복사되었습니다.");
    } catch {
      const ta = document.createElement('textarea');
      ta.value = inviteLink; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      alert("초대 링크가 복사되었습니다.");
    }
  };

  const label = selected?.name ?? "그룹 없음";

  return (
      <>
    <header className="topbar">
      <div className="team-switcher" style={switcherRowStyle}>
        <label htmlFor="groupSelect" className="sr-only">그룹 선택</label>
        <select
          id="groupSelect"
          aria-label="그룹 선택"
          className="team-select"
          value={selected ? String(selected.id) : ""}
          onChange={(e) => handleSelect(e.target.value)}
          style={selectStyle}
        >
          {allGroups && allGroups.length > 0 ? (
            allGroups.map((g) => (
              <option key={g.id} value={String(g.id)}>
                {g.name}
              </option>
            ))
          ) : (
            <option value="">(그룹 없음)</option>
          )}
        </select>

        <div className="actions" style={actionsBarStyle}>
          <button
            type="button"
            className="btn action create"
            onClick={() => { setCreateOpen(true); setInviteLink(null); }}
            title="그룹 생성"
          >
            ➕ 그룹 생성
          </button>
          <button
            type="button"
            className="btn action invite"
            onClick={() => { setCreateOpen(false); handleInvite(); }}
            title="멤버 초대"
          >
            👥 초대 링크 생성
          </button>
        </div>
      </div>
    </header>


        {createOpen && (
            <div
                role="dialog"
                aria-modal="true"
                aria-label="그룹 생성"
                style={overlayStyle}
                onMouseDown={(e) => {
                  // close if clicked on overlay (but not if clicking inside dialog)
                  if (e.target === e.currentTarget) setCreateOpen(false);
                }}
            >
              <div style={dialogStyle} onMouseDown={(e) => e.stopPropagation()}>
                <div style={dialogHeaderStyle}>새 그룹 생성</div>
                <div style={dialogBodyStyle}>
                  <input
                      ref={createInputRef}
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCreateConfirm();
                        if (e.key === "Escape") setCreateOpen(false);
                      }}
                      placeholder="그룹 이름을 입력하세요"
                      aria-label="새 그룹 이름"
                      style={inputStyle}
                  />
                </div>
                <div style={dialogFooterStyle}>
                  <button type="button" onClick={() => setCreateOpen(false)} style={btnSecondary}>
                    취소
                  </button>
                  <button type="button" onClick={handleCreateConfirm} style={btnPrimary}>
                    생성
                  </button>
                </div>
              </div>
            </div>
        )}

        {inviteOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="멤버 초대"
            style={overlayStyle}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setInviteOpen(false);
            }}
          >
            <div style={dialogStyle} onMouseDown={(e) => e.stopPropagation()}>
              <div style={dialogHeaderStyle}>멤버 초대</div>
              <div style={{ ...dialogBodyStyle, display: 'flex', gap: 8 }}>
                <input
                  readOnly
                  value={inviteLink ?? ''}
                  onFocus={(e) => e.currentTarget.select()}
                  aria-label="초대 링크"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button type="button" onClick={copyInvite} style={btnPrimary}>복사</button>
              </div>
              <div style={dialogFooterStyle}>
                <button type="button" onClick={() => setInviteOpen(false)} style={btnSecondary}>
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}
      </>
  );
}


const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const dialogStyle: CSSProperties = {
  width: 420,
  maxWidth: "90vw",
  background: "#fff",
  borderRadius: 12,
  boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
  overflow: "hidden",
  fontFamily: "inherit",
};

const dialogHeaderStyle: CSSProperties = {
  padding: "14px 18px",
  fontWeight: 700,
  borderBottom: "1px solid #eee",
};

const dialogBodyStyle: CSSProperties = {
  padding: 18,
};

const dialogFooterStyle: CSSProperties = {
  padding: 12,
  display: "flex",
  gap: 8,
  justifyContent: "flex-end",
  borderTop: "1px solid #eee",
};

const inputStyle: CSSProperties = {
  width: "100%",
  fontSize: 16,
  padding: "10px 12px",
  border: "1px solid #ddd",
  borderRadius: 8,
  outline: "none",
};

const btnBase: CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid transparent",
  cursor: "pointer",
  fontSize: 14,
};

const btnPrimary: CSSProperties = {
  ...btnBase,
  background: "#7c3aed",
  borderColor: "#7c3aed",
  color: "#fff",
};

const btnSecondary: CSSProperties = {
  ...btnBase,
  background: "#f3f4f6",
  borderColor: "#e5e7eb",
  color: "#111827",
};

const switcherRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  position: 'relative',
};

const selectStyle: CSSProperties = {
  minWidth: 160,
  height: 36,
  padding: '6px 10px',
  borderRadius: 8,
  border: '1px solid #e5e7eb',
  background: '#fff',
  fontSize: 14,
};

const actionsBarStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  marginLeft: 8,
};