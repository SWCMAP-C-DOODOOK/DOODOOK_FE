const BASE = "/api";
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE}${path}`, { credentials: "include", ...init });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json() as Promise<T>;
}