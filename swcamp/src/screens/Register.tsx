import "./Main.css";
import Sidebar from "../screens/Sidebar";
import Footer from "../screens/Footer";
import Header from "../screens/Header";
import { useEffect, useMemo, useRef, useState } from "react";

type ReceiptUploadResponse = { url: string };

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
    const url = URL.createObjectURL(f);
    setFilePreview(url);
  }

  async function uploadReceipt(): Promise<string | null> {
    if (!file) return null;
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/v1/uploads/receipt", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
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

      const res = await fetch("/api/v1/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
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
        <Header team="SW Camp_teamC" />

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
                <span className="muted">{uploading ? "업로드 중…" : "업로드는 등록 시 처리됩니다."}</span>
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
              placeholder="비고를 입력하세요."
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
        <Footer />
      </section>
    </div>
  );
}