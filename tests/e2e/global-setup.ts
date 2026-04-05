import * as fs from "fs";
import * as path from "path";

import { chromium } from "@playwright/test";

const BASE_URL = "http://localhost:3000";
const AUTH_DIR = path.join(__dirname, ".auth");

const USERS = {
  // /reports にアクセスできるロール
  sales: { email: "tanaka@example.com", password: "password123", file: "sales.json" },
  manager: { email: "manager@example.com", password: "password123", file: "manager.json" },
  // ADMIN は /reports にアクセスできないため /master/customers へ誘導
  admin: { email: "admin@example.com", password: "password123", file: "admin.json" },
} as const;

async function globalSetup() {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  const browser = await chromium.launch();

  for (const [role, cred] of Object.entries(USERS)) {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/login`);
    await page.fill("#email", cred.email);
    await page.fill("#password", cred.password);
    await page.click('button[type="submit"]');

    // ログイン後、/login 以外のURLに遷移するまで待機
    // ADMIN は /reports にアクセスできず /unauthorized にリダイレクトされるため
    // URL が /login でなくなることだけを確認する
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
      timeout: 30_000,
    });

    // ADMIN の場合は /master/customers へ遷移してアクティブなセッションを確認
    if (role === "admin") {
      await page.goto(`${BASE_URL}/master/customers`);
      await page.waitForURL("**/master/customers");
    }

    await context.storageState({ path: path.join(AUTH_DIR, cred.file) });
    await context.close();
  }

  await browser.close();
}

export default globalSetup;
