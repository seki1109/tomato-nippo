import * as path from "path";

export const AUTH_STATE = {
  sales: path.join(__dirname, "../.auth/sales.json"),
  manager: path.join(__dirname, "../.auth/manager.json"),
  admin: path.join(__dirname, "../.auth/admin.json"),
} as const;

export const CREDENTIALS = {
  sales: { email: "tanaka@example.com", password: "password123" },
  manager: { email: "manager@example.com", password: "password123" },
  admin: { email: "admin@example.com", password: "password123" },
} as const;

/** ログイン済みトークンをAPIリクエスト用に取得する */
export async function fetchToken(
  role: "sales" | "manager" | "admin",
  requestFn: (url: string, opts: RequestInit) => Promise<Response>,
): Promise<string> {
  const cred = CREDENTIALS[role];
  const res = await requestFn("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: cred.email, password: cred.password }),
  });
  const json = (await res.json()) as { data: { token: string } };
  return json.data.token;
}
