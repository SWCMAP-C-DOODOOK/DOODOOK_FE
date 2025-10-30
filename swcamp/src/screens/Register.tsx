import "./Main.css";
import Sidebar from "../screens/Sidebar";
import Footer from "../screens/Footer";
import Header from "../screens/Header";
import { useEffect, useMemo, useRef, useState } from "react";

function getAccessToken(): string | null {
  try {
    return (
      localStorage.getItem("access_token") ||
      sessionStorage.getItem("access_token") ||
      null
    );
  } catch {
    return null;
  }
}

function withAuth(init: RequestInit = {}): RequestInit {
  const token = getAccessToken();
  const headers = new Headers(init.headers || undefined);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return { ...init, headers };
}

function getCurrentGroupId(): string | null {
  try {
    const sp = new URLSearchParams(window.location.search);
    const byUrl = sp.get("group");
    if (byUrl) return byUrl;
    const mem =
      localStorage.getItem("selectedGroupId") ||
      sessionStorage.getItem("selectedGroupId");
    return mem || null;
  } catch {
    return null;
  }
}

// Optional API base, e.g. set VITE_API_BASE_URL=http://<backend-host>
const API_BASE = (typeof import.meta !== "undefined" && (import.meta as any).env && (import.meta as any).env.VITE_API_BASE_URL)
  ? String((import.meta as any).env.VITE_API_BASE_URL).replace(/\/$/, "")
  : "";
const apiPath = (p: string) => (API_BASE ? `${API_BASE}${p}` : p);

// --- OCR compatibility helpers ---
const OCR_GROUP_PARAM = (typeof import.meta !== "undefined" && (import.meta as any).env && (import.meta as any).env.VITE_OCR_GROUP_PARAM)
  ? String((import.meta as any).env.VITE_OCR_GROUP_PARAM)
  : ""; // optional override, defaults to sending both 'group' and 'group_id'
const OCR_OVERWRITE = (typeof import.meta !== "undefined" && (import.meta as any).env && (import.meta as any).env.VITE_OCR_OVERWRITE)
  ? String((import.meta as any).env.VITE_OCR_OVERWRITE) === "true"
  : false;
// If true, include group id in OCR requests; default false so OCR is stateless
const OCR_SEND_GROUP = (typeof import.meta !== "undefined" && (import.meta as any).env && (import.meta as any).env.VITE_OCR_SEND_GROUP)
  ? String((import.meta as any).env.VITE_OCR_SEND_GROUP) === "true"
  : false;

// ⬇️ OCR에서만 사용할 그룹아이디 변환 옵션 (env: VITE_OCR_GROUP_MAP)
// strip_g:  'g1' -> '1'
// last_segment: 'org:g1' or 'a/b/g1' -> 'g1'
// prefix_g: '1' -> 'g1'
// numeric:  모든 비숫자 제거 -> '1'
// passthrough: 변환 없음(기본값)
const OCR_GROUP_MAP =
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env &&
    (import.meta as any).env.VITE_OCR_GROUP_MAP)
    ? String((import.meta as any).env.VITE_OCR_GROUP_MAP)
    : "passthrough";

function mapGroupIdForOCR(gid: string | null): string | null {
  if (!gid) return gid;
  switch (OCR_GROUP_MAP) {
    case "strip_g":
      return gid.replace(/^g/i, "");
    case "last_segment":
      return gid.split(/[:/]/).pop() || gid;
    case "prefix_g":
      return gid.startsWith("g") ? gid : `g${gid}`;
    case "numeric": {
      const n = gid.replace(/\D/g, "");
      return n || gid;
    }
    default:
      return gid; // passthrough
  }
}

function appendFileAliases(fd: FormData, f: File) {
  // Some backends accept different field names
  fd.append("file", f);
  fd.append("image", f);
  fd.append("receipt", f);
  fd.append("receipt_image", f);
}

function appendGroupParams(fd: FormData, gid: string | null) {
  if (!gid) return;
  // Send both common variants; backend will pick one; optional and gated by OCR_SEND_GROUP flag
  fd.append("group_id", gid);
  fd.append("group", gid);
  if (OCR_GROUP_PARAM) fd.append(OCR_GROUP_PARAM, gid);
}

type ReceiptUploadResponse = { url: string };
type OcrReceiptResponse = {
  date?: string;
  time?: string;
  amount?: number | string;
  method?: string;
  merchant?: string;
  memo?: string;
  // 오류 응답용(백엔드에서 내려줄 수 있는 키들 대응)
  error?: string;
  detail?: string;
  message?: string;
  code?: string | number;
};


function formatKrwInput(v: string): { raw: string; num: number } {
  // 숫자만 남기고 천단위 콤마 포맷팅
  const digits = v.replace(/[^\d]/g, "");
  const num = digits ? parseInt(digits, 10) : 0;
  const raw = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return { raw, num };
}

function prefillSample(
  setters?: {
    setDate?: (v: string) => void;
    setTime?: (v: string) => void;
    setAmountText?: (v: string) => void;
    setMethod?: (v: string) => void;
    setMerchant?: (v: string) => void;
  }
) {
  const s = setters || ({} as any);
  (s.setDate || setDateGlobal)("2025-09-29");
  (s.setTime || setTimeGlobal)("18:11");
  (s.setAmountText || setAmountTextGlobal)(formatKrwInput("90300").raw); // 90,300
  (s.setMethod || setMethodGlobal)("신용카드");
  (s.setMerchant || setMerchantGlobal)("교반(백석대점)");
}

// Global setter placeholders will be assigned within the component
let setDateGlobal: (v: string) => void;
let setTimeGlobal: (v: string) => void;
let setAmountTextGlobal: (v: string) => void;
let setMethodGlobal: (v: string) => void;
let setMerchantGlobal: (v: string) => void;

// --- Local transactions (demo) ---
const USE_LOCAL_TX = true; // demo: save to localStorage instead of server

function pushLocalTx(groupId: string, tx: any) {
  const key = `doodook:tx:${groupId}`;
  let arr: any[] = [];
  try {
    const raw = localStorage.getItem(key);
    if (raw) arr = JSON.parse(raw);
    if (!Array.isArray(arr)) arr = [];
  } catch {
    arr = [];
  }
  arr.unshift(tx); // 최신이 위로 오게
  localStorage.setItem(key, JSON.stringify(arr));
}

export default function Register() {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [amountText, setAmountText] = useState("");
  const amount = useMemo(() => formatKrwInput(amountText).num, [amountText]);

  const [method, setMethod] = useState("카드");
  const [merchant, setMerchant] = useState("");
  const [memo, setMemo] = useState("");

  // expose setters for prefill helper
  setDateGlobal = setDate;
  setTimeGlobal = setTime;
  setAmountTextGlobal = setAmountText;
  setMethodGlobal = setMethod;
  setMerchantGlobal = setMerchant;

  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrMsg, setOcrMsg] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dropRef = useRef<HTMLDivElement>(null);

  // Simulate "OCR processing" delay then prefill
  function simulateOcrThenFill(delayMs = 1000) {
    setOcrLoading(true);
    window.setTimeout(() => {
      try {
        prefillSample();
      } finally {
        setOcrLoading(false);
        setOcrMsg(null);
      }
    }, delayMs);
  }

  // 임시저장 불러오기
  useEffect(() => {
    try {
      const saved = localStorage.getItem("draft:register");
      if (saved) {
        const d = JSON.parse(saved);
        setDate(d.date ?? "");
        setTime(d.time ?? "");
        setAmountText(d.amountText ?? "");
        setMethod(d.method ?? "카드");
        setMerchant(d.merchant ?? "");
        setMemo(d.memo ?? "");
        if (d.filePreview) setFilePreview(d.filePreview);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // 드래그 앤 드롭
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;

    const prevent = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const onDrop = (e: DragEvent) => {
      prevent(e);
      const f = e.dataTransfer?.files?.[0];
      if (f) onSelectFile(f);
    };
    ["dragenter", "dragover", "dragleave", "drop"].forEach((name) =>
      el.addEventListener(name, prevent as any)
    );
    el.addEventListener("drop", onDrop as any);
    return () => {
      ["dragenter", "dragover", "dragleave", "drop"].forEach((name) =>
        el.removeEventListener(name, prevent as any)
      );
      el.removeEventListener("drop", onDrop as any);
    };
  }, []);

  function onSelectFile(f: File) {
    if (!f.type.startsWith("image/") && !/\.(png|jpg|jpeg|webp|heic)$/i.test(f.name)) {
      alert("이미지 파일만 업로드할 수 있어요.");
      return;
    }
    setFile(f);
    setOcrMsg(null);
    setError(null);
    const url = URL.createObjectURL(f);
    setFilePreview(url);
    simulateOcrThenFill(1000);
  }

  async function uploadReceipt(): Promise<string | null> {
    if (!file) return null;
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append("file", file);
      const gid = getCurrentGroupId();
      if (gid) fd.append("group_id", gid);
      const res = await fetch(
        apiPath("/api/v1/uploads/receipt"),
        withAuth({ method: "POST", body: fd, credentials: "include" })
      );
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as ReceiptUploadResponse;
      return data.url;
    } catch {
      // 서버 미연동 시 프리뷰 URL로 대체
      return filePreview;
    } finally {
      setUploading(false);
    }
  }

  async function recognizeReceipt(f: File) {
    try {
      setOcrLoading(true);
      setOcrMsg(null);
      const fd = new FormData();
      appendFileAliases(fd, f);
      if (OCR_SEND_GROUP) {
        const rawGid = getCurrentGroupId();
        const mappedGid = mapGroupIdForOCR(rawGid);
        appendGroupParams(fd, mappedGid);
      }
      if (OCR_OVERWRITE) fd.append("overwrite", "true");
      // 백엔드 OCR 엔드포인트 (Django: /api/ocr/receipt)
      const res = await fetch(
        apiPath("/api/ocr/receipt"),
        withAuth({ method: "POST", body: fd, credentials: "include", headers: { Accept: "application/json" } })
      );

      let payload: any = null;
      let text = "";
      try {
        payload = await res.clone().json();
      } catch {
        try { text = await res.text(); } catch { /* ignore */ }
      }

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setOcrMsg("OCR 인식 실패: 로그인(인증 토큰)이 필요합니다. 다시 로그인 후 시도해주세요.");
          return;
        }
        const reason =
          (payload && (payload.detail || payload.error || payload.message)) ||
          text || `${res.status} ${res.statusText || "Error"}`;
        console.error("OCR 4xx/5xx 응답", { status: res.status, reason, payload, text });
        setOcrMsg(`OCR 인식 실패: ${reason}`);
        return;
      }

      const data = (payload ?? {}) as OcrReceiptResponse;

      // 인식 값으로 폼 자동 채우기 (수정 가능)
      if (data.date) setDate(data.date);
      if (data.time) setTime(data.time);
      if (data.amount !== undefined && data.amount !== null) {
        setAmountText(formatKrwInput(String(data.amount)).raw);
      }
      if (data.method) setMethod(data.method);
      if (data.merchant) setMerchant(data.merchant);
      if (data.memo) setMemo(data.memo);

      // 백엔드가 오류 키를 내려줬다면 메시지로 표시
      if (data.error || data.detail || data.message) {
        setOcrMsg(`OCR 인식 메시지: ${data.detail || data.error || data.message}`);
      }
    } catch (e: any) {
      console.warn("OCR 인식 실패", e);
      const msg = (e && e.message) || String(e);
      if (typeof msg === "string" && msg.includes("Failed to fetch")) {
        setOcrMsg(
          "OCR 인식 실패: 네트워크/프록시/CORS 문제 가능성. 개발자도구 Network 탭에서 /api/ocr/receipt 요청(특히 OPTIONS/POST)과 vite proxy 설정 또는 VITE_API_BASE_URL을 확인하세요."
        );
      } else {
        setOcrMsg(`OCR 인식 실패: ${msg ?? "알 수 없는 오류"}`);
      }
    } finally {
      setOcrLoading(false);
    }
  }

  function validate(): string | null {
    if (!date) return "결제 일자를 입력해주세요.";
    if (!amount || amount <= 0) return "결제 금액을 입력해주세요.";
    if (!method) return "결제 수단을 선택해주세요.";
    if (!merchant.trim()) return "가맹점명을 입력해주세요.";
    return null;
  }

  async function onSubmit() {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      // 1) (옵션) 이미지 업로드 시도하되, 실패해도 계속 진행
      let receiptUrl: string | null = null;
      try {
        receiptUrl = await uploadReceipt();
      } catch {
        /* ignore */
      }

      // 2) g1 로컬 입출금 내역에 추가 (데모 모드)
      if (USE_LOCAL_TX) {
        const tx = {
          id: Date.now(),
          date,
          time,
          amount,
          method,
          merchant,
          memo,
          receiptUrl,
        };
        pushLocalTx("g1", tx);

        // 임시저장 제거 후 g1의 입출금 내역으로 이동
        localStorage.removeItem("draft:register");
        alert("등록되었습니다.");
        window.location.href = "/transaction?group=g1";
        return;
      }

      // 3) (비데모) 서버 저장 경로를 유지하고 싶다면 아래 코드를 사용하세요
      // const payload = { date, time, amount, method, merchant, memo, receiptUrl, group_id: getCurrentGroupId() };
      // const res = await fetch(
      //   apiPath("/api/v1/transactions"),
      //   withAuth({ method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payload) })
      // );
      // if (!res.ok) throw new Error("저장에 실패했습니다.");
      // localStorage.removeItem("draft:register");
      // alert("등록되었습니다.");
      // window.location.href = "/transaction";
    } catch (e: any) {
      setError(e?.message ?? "저장 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  function onSaveDraft() {
    const draft = {
      date,
      time,
      amountText,
      method,
      merchant,
      memo,
      filePreview,
    };
    localStorage.setItem("draft:register", JSON.stringify(draft));
    alert("임시 저장되었습니다.");
  }

  function onCancel() {
    if (confirm("작성을 취소하고 대시보드로 이동할까요?")) {
      window.location.href = "/dashboard";
    }
  }

  return (
    <div className="layout">
      <Sidebar />

      <section className="content">
        <Header />

        {/* 업로드 영역 */}
        <div ref={dropRef} className="card uploader">
          {!filePreview ? (
            <div className="uploader-empty">
              <div className="uploader-icon">↑</div>
              <div className="uploader-text">클릭하거나 이곳에 이미지를 드래그 앤 드롭하세요.</div>
              <label className="btn btn-light mt8">
                이미지 선택
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onSelectFile(f);
                  }}
                />
              </label>
            </div>
          ) : (
            <div className="uploader-preview">
              <img src={filePreview} alt="영수증 미리보기" />
              <div className="uploader-actions">
                <button className="btn" onClick={() => { setFile(null); setFilePreview(null); }}>
                  제거
                </button>
                <button
                  className="btn btn-primary"
                  style={{ marginLeft: 8 }}
                  disabled={!file}
                  onClick={() => simulateOcrThenFill(1000)}
                >
                  자동 채우기
                </button>
                <span className="muted" style={{ marginLeft: 8 }}>
                  {ocrLoading ? "영수증 인식 중…" : uploading ? "업로드 중…" : "업로드는 등록 시 처리됩니다."}
                </span>
                {ocrMsg && (
                  <div className="error" style={{ marginTop: 8 }}>
                    {ocrMsg}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 폼 */}
        <div className="section-label" style={{ marginTop: 8 }}>영수증 등록</div>
        <div className="form-grid card">
          <div className="field">
            <label className="label">결제 일자 *</label>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="field">
            <label className="label">결제 금액 *</label>
            <input
              className="input"
              inputMode="numeric"
              placeholder="예) 120,000"
              value={amountText}
              onChange={(e) => setAmountText(formatKrwInput(e.target.value).raw)}
            />
          </div>

          <div className="field">
            <label className="label">결제 일시 *</label>
            <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>

          <div className="field">
            <label className="label">결제 수단 *</label>
            <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="신용카드">신용카드</option>
              <option value="카드">카드</option>
              <option value="현금">현금</option>
              <option value="계좌이체">계좌이체</option>
              <option value="기타">기타</option>
            </select>
          </div>

          <div className="field span-2">
            <label className="label">가맹점명 *</label>
            <input
              className="input"
              placeholder="예) OO 연습실/식당"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
            />
          </div>

          <div className="field span-2">
            <label className="label">메모</label>
            <textarea
              className="textarea"
              rows={3}
              placeholder="메모를 입력하세요."
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </div>

          {error && <div className="error span-2">{error}</div>}

          <div
            className="actions span-2"
            style={{
              display: "flex",
              alignItems: "center",
              width: "100%",
              gridColumn: "1 / -1",
              gap: 8,
            }}
          >
            <button className="btn" onClick={onCancel}>취소</button>
            {/* 오른쪽 정렬 시작 지점 */}
            <button className="btn" onClick={onSaveDraft} style={{ marginLeft: "auto" }}>
              임시 저장
            </button>
            <button className="btn btn-primary" disabled={submitting} onClick={onSubmit}>
              {submitting ? "등록 중…" : "등록"}
            </button>
          </div>
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>*은 필수 입력항목임.</div>
        <Footer />
      </section>
    </div>
  );
}