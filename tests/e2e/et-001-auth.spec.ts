import { expect, test } from "@playwright/test";

/**
 * ET-001: ログイン・ログアウト
 */
test.describe("ET-001: ログイン・ログアウト", () => {
  test.beforeEach(async ({ page }) => {
    // 各テスト前にストレージをクリアして未認証状態にする
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
    });
  });

  test("#1 正常ログイン → /reports に遷移", async ({ page }) => {
    await page.goto("/login");

    await page.fill("#email", "tanaka@example.com");
    await page.fill("#password", "password123");
    await page.click('button[type="submit"]');

    await page.waitForURL("**/reports");
    await expect(page).toHaveURL("/reports");
    await expect(page.getByRole("heading", { name: "日報一覧" })).toBeVisible();
  });

  test("#2 誤ったパスワード → エラーメッセージが表示される", async ({ page }) => {
    await page.goto("/login");

    await page.fill("#email", "tanaka@example.com");
    await page.fill("#password", "wrongpassword");
    await page.click('button[type="submit"]');

    await expect(
      page.getByText("メールアドレスまたはパスワードが正しくありません"),
    ).toBeVisible();
    await expect(page).toHaveURL("/login");
  });

  test("#3 ログアウト → /login に遷移", async ({ page }) => {
    // まずログイン
    await page.goto("/login");
    await page.fill("#email", "tanaka@example.com");
    await page.fill("#password", "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/reports");

    // ユーザー名ボタンからドロップダウンを開いてログアウト
    await page.getByRole("button", { name: "田中太郎" }).click();
    await page.getByRole("menuitem", { name: "ログアウト" }).click();

    await page.waitForURL("**/login");
    await expect(page).toHaveURL("/login");
  });

  test("#4 未認証で /reports にアクセス → /login にリダイレクト", async ({ page }) => {
    await page.goto("/reports");

    await expect(page).toHaveURL(/\/login/);
  });
});
