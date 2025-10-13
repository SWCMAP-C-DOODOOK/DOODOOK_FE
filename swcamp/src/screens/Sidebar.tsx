import { useEffect, useState } from "react";

/**
 * Sidebar: 선택된 메뉴를 현재 경로(path)에 따라 보라색으로 하이라이트합니다.
 * 라우팅은 App.tsx에서 처리하고, 이 컴포넌트는 링크 + active 처리만 담당합니다.
 */
export default function Sidebar() {
    // 현재 경로 추적
    const [path, setPath] = useState<string>(
        typeof window !== "undefined" ? window.location.pathname : "/"
    );

    useEffect(() => {
        const update = () => setPath(window.location.pathname);

        // 브라우저 앞으로/뒤로 가기
        window.addEventListener("popstate", update);

        // SPA 내비게이션 반영(history API)
        const origPush = history.pushState;
        const origReplace = history.replaceState;
        history.pushState = function (...args) {
            // @ts-ignore
            origPush.apply(this, args);
            update();
        };
        history.replaceState = function (...args) {
            // @ts-ignore
            origReplace.apply(this, args);
            update();
        };

        // 동일 출처 a태그 클릭도 반영
        const onClick = (e: MouseEvent) => {
            const a = (e.target as HTMLElement).closest("a");
            if (!a) return;
            const href = a.getAttribute("href");
            if (!href) return;
            try {
                const url = new URL(href, window.location.origin);
                if (url.origin === window.location.origin) {
                    setTimeout(update, 0);
                }
            } catch { /* ignore */ }
        };
        document.addEventListener("click", onClick, true);

        return () => {
            window.removeEventListener("popstate", update);
            document.removeEventListener("click", onClick, true);
            history.pushState = origPush;
            history.replaceState = origReplace;
        };
    }, []);

    const item = (href: string, label: string, svgPath?: string) => {
        const isActive = path === href || path.startsWith(href + "/");
        return (
            <a className={`nav-item ${isActive ? "active" : ""}`} href={href}>
                {svgPath && (
                    <span className="nav-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d={svgPath} />
            </svg>
          </span>
                )}
                <span className="nav-text">{label}</span>
            </a>
        );
    };

    // 로그아웃: 저장된 인증정보(있을 경우) 비우고 웰컴으로 이동
    const onLogout = () => {
        try {
            localStorage.removeItem("token");
            localStorage.removeItem("auth");
            sessionStorage.removeItem("token");
        } catch { /* ignore */ }
        window.location.href = "/";
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">DOODOOK</div>
            <nav className="nav">
                {item(
                    "/dashboard",
                    "대시보드",
                    "M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"
                )}
                {item(
                    "/transaction",
                    "입출금 내역",
                    "M19 3H5a2 2 0 00-2 2v14l4-4h12a2 2 0 002-2V5a2 2 0 00-2-2z"
                )}
                {item(
                    "/register",
                    "거래 등록",
                    "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 000-1.42l-2.34-2.34a1.003 1.003 0 00-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"
                )}
                {item(
                    "/settings",
                    "설정",
                    "M19.14 12.94a7.967 7.967 0 000-1.88l2.03-1.58a.5.5 0 00.12-.64l-1.92-3.32a.5.5 0 00-.6-.22l-2.39.96a7.963 7.963 0 00-1.63-.94l-.36-2.54A.5.5 0 0013.9 1h-3.8a.5.5 0 00-.5.42l-.36 2.54c-.58.23-1.13.54-1.63.94l-2.39-.96a.5.5 0 00-.6.22L1.7 7.02a.5.5 0 00.12.64l2.03 1.58c-.05.31-.08.62-.08.94s.03.63.08.94L1.82 12.7a.5.5 0 00-.12.64l1.92 3.32c.12.21.37.3.6.22l2.39-.96c.5.4 1.05.71 1.63.94l.36 2.54c.06.24.26.42.5.42h3.8c.24 0 .44-.18.5-.42l.36-2.54c.58-.23 1.13-.54 1.63-.94l2.39.96c.23.08.48-.01.6-.22l1.92-3.32a.5.5 0 00-.12-.64l-2.03-1.58z"
                )}
            </nav>
            <button className="logout-btn" onClick={onLogout}>Logout</button>
        </aside>
    );
}