/**
 * テスト用DBにPrismaマイグレーションを実行するスクリプト。
 * .env.test の DATABASE_URL を使用して prisma migrate deploy を実行する。
 *
 * 実行前提: tomato_nippo_test データベースが作成済みであること。
 *   mysql -u root -p < scripts/setup-test-db.sql
 *
 * 実行方法:
 *   npm run db:test-migrate
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const envContent = readFileSync(".env.test", "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx === -1) continue;
  const key = trimmed.slice(0, idx).trim();
  const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
  process.env[key] = val;
}

console.warn(`Running migrations on: ${process.env.DATABASE_URL}`);

execSync("npx prisma migrate deploy", {
  stdio: "inherit",
  env: { ...process.env },
});

console.warn("Test DB migration complete.");
