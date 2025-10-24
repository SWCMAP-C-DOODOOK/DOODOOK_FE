const BASE = "/api";
const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
    if (IS_DEMO) {
        return demoApi<T>(path, init);
    }
    const token = localStorage.getItem("access_token");
    const headers = new Headers(init.headers || {});
    if (token) headers.set("Authorization", `Bearer ${token}`);

    const res = await fetch(`${BASE}${path}`, {
        credentials: "include", // 쿠키도 병행한다면 유지
        headers,
        ...init,
    });

    if (!res.ok) {
        if (res.status === 401) throw new Error("UNAUTHORIZED");
        const text = await res.text().catch(() => "");
        throw new Error(`API ${res.status} ${text}`);
    }

    const ct = res.headers.get("content-type") || "";
    return (ct.includes("application/json") ? res.json() : (res.text() as any)) as Promise<T>;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function demoApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  // Optional: small artificial delay so the UI can show loading states
  await delay(200);

  // Normalize path (ensure it starts with "/")
  const p = path.startsWith("/") ? path : `/${path}`;
  const method = (init.method || "GET").toUpperCase();

  // --- Dashboard widgets ---
  if (p === "/stats/category" && method === "GET") {
    const data = [
      { category: "회비", amount: 180000 },
      { category: "식비", amount: 75000 },
      { category: "교통", amount: 32000 },
      { category: "문화", amount: 21000 },
    ];
    return data as unknown as T;
  }

  if (p === "/stats/accumulated" && method === "GET") {
    const data = {
      month: new Date().toISOString().slice(0, 7),
      income: 520000,
      expense: 328000,
      balance: 192000,
    };
    return data as unknown as T;
  }

  // --- Transactions list ---
  if (p.startsWith("/transactions") && method === "GET") {
    const today = new Date().toISOString().slice(0, 10);
    const data = {
      count: 3,
      results: [
        { id: 1, date: today, type: "DEPOSIT", amount: 50000, memo: "회비 입금" },
        { id: 2, date: today, type: "WITHDRAW", amount: 12000, memo: "커피" },
        { id: 3, date: today, type: "WITHDRAW", amount: 8300, memo: "버스" },
      ],
    };
    return data as unknown as T;
  }

  // --- Create transaction / register form submit ---
  if (p === "/transactions" && method !== "GET") {
    return { ok: true } as unknown as T;
  }

  // --- Health check fallback (if ever used through this client) ---
  if (p === "/healthz" || p === "/healthz/") {
    return "ok" as unknown as T;
  }

  // Default: empty object
  return {} as T;
}