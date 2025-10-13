export default function Login() {
    const kakaoLogin = () => {
        // TODO: 카카오 OAuth 연동. 지금은 성공 가정 → 대시보드로 이동
        window.location.href = "/dashboard";
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <h1 className="login-title">DOODOOK</h1>

                <button className="kakao-btn" onClick={kakaoLogin}>
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                            d="M12 3C6.477 3 2 6.335 2 10.445c0 2.726 1.948 5.1 4.86 6.422l-.6 3.77a.5.5 0 0 0 .78.49l4.167-2.736c.262.02.528.03.794.03 5.523 0 10-3.335 10-7.445C22 6.335 17.523 3 12 3z"
                            fill="black"
                        />
                    </svg>
                    <span>Login with Kakao</span>
                </button>

                <label className="login-auto">
                    <input type="checkbox" defaultChecked /> 자동 로그인
                </label>
            </div>
        </div>
    );
}