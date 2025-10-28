import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
    const navigate = useNavigate();

    // 이미 로그인(토큰 존재) 상태라면 대시보드로 이동
    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (token) {
            navigate("/dashboard", { replace: true });
        }
    }, [navigate]);

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