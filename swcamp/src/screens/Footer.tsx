import React, { useEffect, useState, type CSSProperties } from "react";

// 페이지 하단 바
export interface FooterProps {
  bugUrl?: string;
  aboutHref?: string;
  rightText?: string;
  className?: string;
  style?: CSSProperties;
  policyEndpoint?: string;
}

// CSS 스타일 설정
const footerStyle: CSSProperties = {
  marginTop: "24px",
  padding: "16px 24px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  color: "#6b7280",
  fontSize: "14px",
  borderTop: "1px solid #e5e7eb",
  gap: "12px",
  flexWrap: "wrap",
  background: "transparent",
};
const linksStyle: CSSProperties = {
  display: "inline-flex",
  gap: "14px",
  alignItems: "center",
  flexWrap: "wrap",
};
const linkStyle: CSSProperties = {
  color: "inherit",
  textDecoration: "none",
};
const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 60,
};
const modalStyle: CSSProperties = {
  width: "min(920px, 92vw)",
  maxHeight: "80vh",
  background: "#fff",
  borderRadius: 12,
  boxShadow: "0 10px 30px rgba(0,0,0,.18)",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
};
const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  justifyContent: "space-between",
  padding: "14px 18px",
  borderBottom: "1px solid #e5e7eb",
  background: "#fafafa",
};
const selectStyle: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: "8px 10px",
  background: "#fff",
};
const modalBodyStyle: CSSProperties = {
  padding: 18,
  overflow: "auto",
  lineHeight: 1.6,
  color: "#111827",
};

// 이용약관 및 정책
type PolicyType = "privacy" | "terms" | "youth";

function PolicyModal({ open, onClose, endpoint }: { open: boolean; onClose: () => void; endpoint: string; }) {
  const [type, setType] = useState<PolicyType>("terms");
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    fetch(`${endpoint}?type=${type}`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((txt) => setHtml(txt))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [open, type, endpoint]);

  if (!open) return null;
  return (
    <div style={overlayStyle} onClick={onClose} role="dialog" aria-modal="true" aria-label="이용약관 및 정책">
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <strong style={{ fontSize: 16 }}>이용약관 및 정책</strong>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select style={selectStyle} value={type} onChange={(e) => setType(e.target.value as PolicyType)} aria-label="문서 선택">
              <option value="terms">서비스 이용약관</option>
              <option value="privacy">개인정보 처리방침</option>
              <option value="youth">청소년 보호정책</option>
            </select>
            <button onClick={onClose} aria-label="닫기" style={{ border: "1px solid #e5e7eb", background: "white", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>닫기</button>
          </div>
        </div>
        <div style={modalBodyStyle}>
          {loading && <p>불러오는 중…</p>}
          {error && <p style={{ color: "#dc2626" }}>불러오기 오류: {error}</p>}
          {!loading && !error && (
            <div dangerouslySetInnerHTML={{ __html: html }} />
          )}
        </div>
      </div>
    </div>
  );
}

function Footer({
  // Bug Report & About Us
  bugUrl = "https://github.com/SWCMAP-C-DOODOOK/DOODOOK_FE/issues",
  aboutHref = "https://www.notion.so/SW-C-26b02d9f7737812aae4fdc97056fef78",
  rightText = "© DOODOOK",
  className,
  style,
  policyEndpoint = "/api/policy",
}: FooterProps & { policyEndpoint?: string }) {
  const [openPolicy, setOpenPolicy] = useState(false);
  return (
    <footer
      role="contentinfo"
      aria-label="사이트 푸터"
      className={["footer", "site-footer", className].filter(Boolean).join(" ")}
      style={{ ...footerStyle, ...style }}
    >
      <nav className="footer-links" aria-label="푸터 링크" style={linksStyle}>
        <a href={bugUrl} target="_blank" rel="noreferrer" style={linkStyle}>
          Bug Report
        </a>
        <span aria-hidden="true" style={{ margin: "0 12px", color: "#9ca3af" }}>
          ·
        </span>
        <a href={aboutHref} target="_blank" rel="noreferrer" style={linkStyle}>
          About us
        </a>
        <span aria-hidden="true" style={{ margin: "0 12px", color: "#9ca3af" }}>·</span>
        <button
          type="button"
          onClick={() => setOpenPolicy(true)}
          style={{ ...linkStyle, background: "none", border: 0, padding: 0, cursor: "pointer" }}
        >
          이용약관 및 정책
        </button>
      </nav>
      <div className="copyright" style={{ color: "#9ca3af", fontWeight: 500 }}>
        {rightText}
      </div>
      <PolicyModal open={openPolicy} onClose={() => setOpenPolicy(false)} endpoint={policyEndpoint} />
    </footer>
  );
}

export default React.memo(Footer);