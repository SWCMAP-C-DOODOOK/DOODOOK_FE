// 월컴 랜딩 페이지
export default function Welcome() {
    // goLogin 함수로 /login url로 이동
    const goLogin = () => (window.location.href = "/login");
    return (
        <div className="welcome-page">
            <div className="welcome-card">
                <p className="welcome-eyebrow">Welcome to the</p>
                <h1 className="welcome-brand">DOODOOK</h1>
                <p className="welcome-sub">지갑이 DOODOOK해지는</p>
                <p className="welcome-sub">동아리, 소모임 대상 간편 회계 장부 처리 시스템</p>
                <div className="welcome-divider" />
                <button className="welcome-start-btn" onClick={goLogin}>
                    Start
                </button>
            </div>
        </div>
    );
}