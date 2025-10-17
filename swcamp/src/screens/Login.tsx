export default function Login() {
    const kakaoLogin = () => {
        // 파라미터 없이 서버 엔드포인트로 바로 이동
        window.location.href = '/api/auth/kakao/login';
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <h1 className="login-title">DOODOOK</h1>
                <button className="kakao-btn" onClick={kakaoLogin}>
                    <span>Login with Kakao</span>
                </button>
                <label className="login-auto">
                    <input type="checkbox" defaultChecked /> 자동 로그인
                </label>
            </div>
        </div>
    );
}