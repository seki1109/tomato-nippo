import * as fs from "fs";
import * as path from "path";

import { chromium } from "@playwright/test";

const BASE_URL = "http://localhost:3000";
const AUTH_DIR = path.join(__dirname, ".auth");

const USERS = {
  sales: { email: "tanaka@example.com", password: "password123", file: "sales.json" },
  manager: { email: "manager@example.com", password: "password123", file: "manager.json" },
  admin: { email: "admin@example.com", password: "password123", file: "admin.json" },
} as const;

async function globalSetup() {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  const browser = await chromium.launch();

  for (const [, cred] of Object.entries(USERS)) {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/login`);
    await page.fill("#email", cred.email);
    await page.fill("#password", cred.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/reports");

    await context.storageState({ path: path.join(AUTH_DIR, cred.file) });
    await context.close();
  }

  await browser.close();
}

export default globalSetup;
