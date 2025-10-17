import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AuthCallback() {
    const nav = useNavigate();

    useEffect(() => {
        // 1) 쿼리/해시 모두 체크 (백에서 어떤 형식으로 주는지 모르면 둘 다 처리)
        const search = new URLSearchParams(window.location.search);
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));

        const access =
            search.get('access') ||
            search.get('access_token') ||
            hash.get('access') ||
            hash.get('access_token');

        const refresh =
            search.get('refresh') ||
            search.get('refresh_token') ||
            hash.get('refresh') ||
            hash.get('refresh_token');

        const error = search.get('error') || hash.get('error');

        if (error) {
            console.error('Login error:', error);
            alert('로그인에 실패했어요. 다시 시도해 주세요.');
            nav('/login', { replace: true });
            return;
        }

        if (access) {
            // 2) 저장
            localStorage.setItem('access_token', access);
            if (refresh) localStorage.setItem('refresh_token', refresh);

            // 3) URL 정리(토큰 노출 제거)
            window.history.replaceState({}, '', '/');

            // 4) 대시보드로
            nav('/dashboard', { replace: true });
        } else {
            // 토큰이 안 오면 로그인 페이지로
            nav('/login', { replace: true });
        }
    }, [nav]);

    return <div style={{ padding: 24 }}>로그인 처리 중…</div>;
}