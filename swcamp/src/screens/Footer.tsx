import React, { type CSSProperties } from "react";

export interface FooterProps {
  bugUrl?: string;
  aboutHref?: string;
  rightText?: string;
  className?: string;
  style?: CSSProperties;
}

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

function Footer({
  bugUrl = "https://github.com/SWCMAP-C-DOODOOK/DOODOOK_FE/issues",
  aboutHref = "https://www.notion.so/SW-C-26b02d9f7737812aae4fdc97056fef78",
  rightText = "© DOODOOK",
  className,
  style,
}: FooterProps) {
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
      </nav>
      <div className="copyright" style={{ color: "#9ca3af", fontWeight: 500 }}>
        {rightText}
      </div>
    </footer>
  );
}

export default React.memo(Footer);