import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// 로그인 페이지
export default function Login() {
    const navigate = useNavigate();

    // 이미 로그인(로컬에 토큰 존재 여부 확인) 상태라면 대시보드로 이동
    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (token) {
            navigate("/dashboard", { replace: true });
        }
    }, [navigate]);

    // 카카오 로그인 함수
    const kakaoLogin = () => {
        // 서버 엔드포인트로 바로 이동 : 카카오로 전송
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