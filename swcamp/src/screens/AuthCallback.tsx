import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AuthCallback() {
  const nav = useNavigate();

  useEffect(() => {
    // 콜백으로 돌아온 URL에서 쿼리/해시를 모두 읽어 토큰/오류를 파싱
    const rawSearch = window.location.search;
    const rawHash = window.location.hash.replace(/^#/, '');

    const search = new URLSearchParams(rawSearch);
    const hash = new URLSearchParams(rawHash);

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

    // URL에서 인증 관련 파라미터(access/refresh/error)를 제거하되,
    // group 같은 나머지 파라미터는 보존한다.
    const stripAuthParams = (sp: URLSearchParams) => {
      const p = new URLSearchParams(sp);
      ['access', 'access_token', 'refresh', 'refresh_token', 'error'].forEach((k) => p.delete(k));
      return p;
    };

    const cleaned = stripAuthParams(search);

    // group 파라미터가 없으면 해시의 group 또는 저장된 그룹, 최종적으로 g1을 사용
    if (!cleaned.get('group')) {
      const groupFromHash = hash.get('group') || '';
      const saved = (localStorage.getItem('doodook:selectedGroupId') || 'g1').toLowerCase();
      const finalGroup = (groupFromHash || saved || 'g1').toLowerCase();
      cleaned.set('group', finalGroup);
    }

    const cleanedSearch = cleaned.toString();
    const finalSearch = cleanedSearch ? `?${cleanedSearch}` : '';

    if (error) {
      console.error('Login error:', error);
      alert('로그인에 실패했어요. 다시 시도해 주세요.');
      // 토큰 노출이 히스토리에 남지 않도록 현재 항목을 정리
      window.history.replaceState({}, '', '/auth/callback' + finalSearch);
      // 로그인 페이지로, group 등 맥락은 유지
      nav('/login' + finalSearch, { replace: true });
      return;
    }

    if (access) {
      // 토큰 저장
      try {
        localStorage.setItem('access_token', access);
        if (refresh) localStorage.setItem('refresh_token', refresh);
      } catch {}

      // 히스토리에서 토큰 파라미터 제거 (뒤로가기도 안전)
      window.history.replaceState({}, '', '/auth/callback' + finalSearch);

      // 대시보드로 이동 (선택한 group 유지/부여)
      nav('/dashboard' + finalSearch, { replace: true });
    } else {
      // 토큰이 안 왔으면 로그인 페이지로, 컨텍스트 파라미터는 유지
      window.history.replaceState({}, '', '/auth/callback' + finalSearch);
      nav('/login' + finalSearch, { replace: true });
    }
  }, [nav]);

  return <div style={{ padding: 24 }}>로그인 처리 중…</div>;
}