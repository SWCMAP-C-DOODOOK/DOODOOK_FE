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

export default function Register() {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [amountText, setAmountText] = useState("");
  const amount = useMemo(() => formatKrwInput(amountText).num, [amountText]);

  const [method, setMethod] = useState("카드");
  const [merchant, setMerchant] = useState("");
  const [memo, setMemo] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrMsg, setOcrMsg] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dropRef = useRef<HTMLDivElement>(null);

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
    recognizeReceipt(f);
  }

  async function uploadReceipt(): Promise<string | null> {
    if (!file) return null;
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(
        "/api/v1/uploads/receipt",
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
      fd.append("file", f);
      // 백엔드 OCR 엔드포인트 (Django: /api/ocr/receipt)
      const res = await fetch(
        "/api/ocr/receipt",
        withAuth({ method: "POST", body: fd, credentials: "include" })
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
      setOcrMsg(`OCR 인식 실패: ${e?.message ?? "알 수 없는 오류"}`);
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
      const receiptUrl = await uploadReceipt();

      const payload = {
        date,
        time,
        amount,
        method,
        merchant,
        memo,
        receiptUrl,
      };

      const res = await fetch(
        "/api/v1/transactions",
        withAuth({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        })
      );
      if (!res.ok) throw new Error("저장에 실패했습니다.");

      // 성공 → 임시저장 제거 후 목록으로
      localStorage.removeItem("draft:register");
      alert("등록되었습니다.");
      window.location.href = "/transaction";
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
                  disabled={!file || ocrLoading}
                  onClick={() => {
                    if (file) recognizeReceipt(file);
                  }}
                >
                  {ocrLoading ? "자동 인식 중…" : "자동 인식"}
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

          <div className="actions span-2">
            <button className="btn" onClick={onCancel}>취소</button>
            <div className="grow" />
            <button className="btn" onClick={onSaveDraft}>임시 저장</button>
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