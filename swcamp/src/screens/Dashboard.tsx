import "./Main.css";
import Sidebar from "../screens/Sidebar";
import Footer from "../screens/Footer";
import Header from "../screens/Header";

function VBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="vbar">
      <div className="vbar-col">
        <div className="vbar-fill" style={{ height: `${value}%`, background: color }} />
      </div>
      <div className="vbar-label">{label}</div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <div className="layout">
      <Sidebar />

      <section className="content">
        <Header team="SW Camp_teamC" />

        <div className="grid">
          {/* Labels outside cards */}
          <div className="section-label">회비 현황</div>
          <div className="section-label right">최근 거래 내역</div>

          {/* Balance card */}
          <div className="card balance">
            <div className="balance-amount">200,000 원</div>
            <div className="balance-card">
              <div>
                <div className="bank">카카오뱅크</div>
                <div className="acc">SWC모임통장</div>
                <div className="acc-sub">*** ***** 2598</div>
              </div>
              <div className="chip" />
            </div>
          </div>

          {/* Chart card */}
          <div className="card chart">
            <div className="section-title">
              <span className="muted">Monthly</span>
            </div>
            <div className="chart-bars">
              <VBar label="25.03" value={55} color="#a78bfa" />
              <VBar label="25.04" value={30} color="#f472b6" />
              <VBar label="25.05" value={95} color="#f472b6" />
              <VBar label="25.06" value={35} color="#f472b6" />
              <VBar label="25.07" value={18} color="#a78bfa" />
            </div>
          </div>

          {/* Recent transactions (title outside) */}
          <div className="card recent">
            <ul className="txn-list">
              {[
                { title: "하반기 회비", type: "수입", amount: "+ 100,000원", date: "2025-07-05" },
                { title: "정기회식", type: "지출", amount: "- 330,000원", date: "2025-06-18" },
                { title: "정기 엠티 운영 비용", type: "지출", amount: "- 195,000원", date: "2025-05-14" },
                { title: "연습실 대관료", type: "지출", amount: "- 24,000원", date: "2025-05-07" },
                { title: "기차표 예매", type: "지출", amount: "- 706,500원", date: "2025-05-02" },
                { title: "학교 운영지원금", type: "수입", amount: "+ 500,000원", date: "2025-03-13" },
              ].map((t, i) => (
                <li key={i} className="txn">
                  <div className="icon" />
                  <div className="txn-main">
                    <div className="txn-title">{t.title}</div>
                    <div className="txn-sub">{t.type}</div>
                  </div>
                  <div className={`txn-amount ${t.amount.startsWith("+") ? "inc" : "dec"}`}>{t.amount}</div>
                  <div className="txn-date">{t.date}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <Footer />
      </section>
    </div>
  );
}