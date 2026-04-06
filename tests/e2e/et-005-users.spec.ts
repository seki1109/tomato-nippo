import { expect, test } from "@playwright/test";

import { AUTH_STATE } from "./helpers/auth";

const TEST_EMAIL = `e2e_test_${Date.now()}@example.com`;
const TEST_NAME = `E2Eテストユーザー_${Date.now()}`;

/**
 * ET-005: ユーザーマスター管理（ADMIN）
 */
test.describe("ET-005: ユーザーマスター管理（ADMIN）", () => {
  test.use({ storageState: AUTH_STATE.admin });

  let adminToken: string;
  let createdUserId: number;

  test.beforeAll(async ({ request }) => {
    const res = await request.post("/api/v1/auth/login", {
      data: { email: "admin@example.com", password: "password123" },
    });
    const json = (await res.json()) as { data: { token: string } };
    adminToken = json.data.token;
  });

  test.afterAll(async ({ request }) => {
    // テストで作成したユーザーを無効化
    if (createdUserId) {
      await request.put(`/api/v1/users/${createdUserId}`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        data: {
          name: TEST_NAME,
          email: TEST_EMAIL,
          role: "SALES",
          is_active: false,
        },
      });
    }
  });

  test("#1 ユーザーを新規登録する → 一覧に追加される", async ({ page }) => {
    await page.goto("/master/users");

    // Button(onClick) なので getByRole("button") で取得する
    await page.getByRole("button", { name: "+ 新規登録" }).click();

    await page.waitForURL("**/master/users/new");

    await page.fill("#name", TEST_NAME);
    await page.fill("#email", TEST_EMAIL);
    await page.fill("#password", "Password123");
    await page.fill("#department", "テスト部署");

    // ロール選択
    await page.locator("#role").click();
    await page.getByRole("option", { name: "SALES" }).click();

    await page.getByRole("button", { name: "保存" }).click();

    await page.waitForURL("**/master/users");
    await expect(page.getByRole("cell", { name: TEST_NAME })).toBeVisible();

    // 作成したユーザーの ID を保存
    const res = await page.request.get("/api/v1/users", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const json = (await res.json()) as {
      data: { users: { user_id: number; email: string }[] };
    };
    const created = json.data.users.find((u) => u.email === TEST_EMAIL);
    if (created) createdUserId = created.user_id;
  });

  test("#2 ロールを変更する → 一覧でロールが更新される", async ({ page }) => {
    if (!createdUserId) {
      test.skip(true, "#1 のテストでユーザーが作成されていません");
      return;
    }

    await page.goto(`/master/users/${createdUserId}`);
    await page.waitForSelector("#name");

    // ロールを MANAGER に変更
    await page.locator("#role").click();
    await page.getByRole("option", { name: "MANAGER" }).click();

    await page.getByRole("button", { name: "保存" }).click();

    await page.waitForURL("**/master/users");

    const row = page.locator("tr").filter({ hasText: TEST_NAME });
    await expect(row.getByText("MANAGER")).toBeVisible();
  });

  test("#3 ユーザーを無効化する → 一覧でステータスが「無効」になる", async ({ page }) => {
    if (!createdUserId) {
      test.skip(true, "#1 のテストでユーザーが作成されていません");
      return;
    }

    await page.goto(`/master/users/${createdUserId}`);
    await page.waitForSelector("#name");

    // 有効フラグを OFF
    const toggle = page.locator("#is-active");
    await expect(toggle).toBeChecked(); // ユーザーが有効状態であることを確認
    await toggle.click();
    await expect(toggle).not.toBeChecked(); // React の状態更新が DOM に反映されるまで待機

    await page.getByRole("button", { name: "保存" }).click();

    await page.waitForURL("**/master/users");

    const row = page.locator("tr").filter({ hasText: TEST_NAME });
    await expect(row.getByText("無効")).toBeVisible();
  });

  test("#4 無効化ユーザーがログインできない", async ({ page }) => {
    // テスト#3でユーザーを無効化済み
    // /login に遷移してから localStorage をクリア（about:blank では SecurityError になる）
    await page.goto("/login");
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
    });
    await page.reload();

    await page.fill("#email", TEST_EMAIL);
    await page.fill("#password", "Password123");
    await page.click('button[type="submit"]');

    await expect(
      page.getByText("メールアドレスまたはパスワードが正しくありません"),
    ).toBeVisible();
    await expect(page).toHaveURL("/login");
  });
});
