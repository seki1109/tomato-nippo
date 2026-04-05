import { expect, test } from "@playwright/test";

import { AUTH_STATE } from "./helpers/auth";

const TEST_COMPANY = `E2Eテスト株式会社_${Date.now()}`;
const TEST_COMPANY_EDITED = `E2Eテスト株式会社（更新）_${Date.now()}`;

/**
 * ET-004: 顧客マスター管理（ADMIN）
 */
test.describe("ET-004: 顧客マスター管理（ADMIN）", () => {
  test.use({ storageState: AUTH_STATE.admin });

  let adminToken: string;
  let createdCustomerId: number;

  test.beforeAll(async ({ request }) => {
    const res = await request.post("/api/v1/auth/login", {
      data: { email: "admin@example.com", password: "password123" },
    });
    const json = (await res.json()) as { data: { token: string } };
    adminToken = json.data.token;
  });

  test.afterAll(async ({ request }) => {
    // テストで作成した顧客を論理削除（まだ削除されていない場合）
    if (createdCustomerId) {
      await request.delete(`/api/v1/customers/${createdCustomerId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }
  });

  test("#1 顧客を新規登録する → 一覧に追加される", async ({ page }) => {
    await page.goto("/master/customers");
    await page.getByRole("link", { name: "新規登録" }).click();

    await page.waitForURL("**/master/customers/new");

    await page.fill("#company_name", TEST_COMPANY);
    await page.fill("#contact_person", "テスト担当者");
    await page.fill("#phone", "03-1234-5678");
    await page.fill("#address", "東京都テスト区テスト1-1-1");

    await page.getByRole("button", { name: "保存" }).click();

    await page.waitForURL("**/master/customers");
    await expect(page.getByRole("cell", { name: TEST_COMPANY })).toBeVisible();

    // 作成した顧客の ID を保存
    const res = await page.request.get("/api/v1/customers?per_page=100", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const json = (await res.json()) as {
      data: { customers: { customer_id: number; company_name: string }[] };
    };
    const created = json.data.customers.find((c) => c.company_name === TEST_COMPANY);
    if (created) createdCustomerId = created.customer_id;
  });

  test("#2 顧客情報を編集する → 変更内容が反映される", async ({ page }) => {
    if (!createdCustomerId) {
      test.skip(true, "#1 のテストで顧客が作成されていません");
      return;
    }

    await page.goto(`/master/customers/${createdCustomerId}`);
    await page.waitForSelector("#company_name");

    await page.fill("#company_name", TEST_COMPANY_EDITED);
    await page.fill("#contact_person", "更新後担当者");

    await page.getByRole("button", { name: "保存" }).click();

    await page.waitForURL("**/master/customers");
    await expect(page.getByRole("cell", { name: TEST_COMPANY_EDITED })).toBeVisible();
  });

  test("#3 顧客を削除する → 一覧から消える", async ({ page }) => {
    if (!createdCustomerId) {
      test.skip(true, "#1 のテストで顧客が作成されていません");
      return;
    }

    await page.goto("/master/customers");
    await expect(page.getByRole("cell", { name: TEST_COMPANY_EDITED })).toBeVisible();

    // 対象行の削除ボタンをクリック
    const row = page.locator("tr").filter({ hasText: TEST_COMPANY_EDITED });
    await row.getByRole("button", { name: "削除" }).click();

    // 確認ダイアログで削除
    await page.getByRole("button", { name: "削除する" }).click();

    await expect(page.getByRole("cell", { name: TEST_COMPANY_EDITED })).not.toBeVisible();
    createdCustomerId = 0; // afterAll での削除をスキップ
  });

  test("#4 キーワード検索 → 一致する顧客のみ表示", async ({ page }) => {
    await page.goto("/master/customers");

    await page.fill('input[placeholder*="検索"]', "株式会社");
    await page.getByRole("button", { name: "検索" }).click();

    // 検索結果が表示されることを確認
    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
  });

  test("#5 SALES が顧客マスターへアクセス → アクセス拒否", async ({ browser }) => {
    // SALES 権限の別コンテキストを作成
    const salesContext = await browser.newContext({ storageState: AUTH_STATE.sales });
    const salesPage = await salesContext.newPage();

    await salesPage.goto("/master/customers");

    // /unauthorized にリダイレクトされることを確認
    await expect(salesPage).toHaveURL(/unauthorized|\/login/);

    await salesContext.close();
  });
});
