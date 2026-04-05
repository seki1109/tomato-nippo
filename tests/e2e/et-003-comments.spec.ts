import { expect, test } from "@playwright/test";

import { AUTH_STATE } from "./helpers/auth";

/**
 * ET-003: コメント投稿フロー（MANAGER）
 */
test.describe("ET-003: コメント投稿フロー（MANAGER）", () => {
  test.use({ storageState: AUTH_STATE.manager });

  let submittedReportId: number;
  let managerToken: string;

  test.beforeAll(async ({ request }) => {
    // MANAGERトークン取得
    const loginRes = await request.post("/api/v1/auth/login", {
      data: { email: "manager@example.com", password: "password123" },
    });
    const loginJson = (await loginRes.json()) as { data: { token: string } };
    managerToken = loginJson.data.token;

    // SUBMITTED な日報を取得
    const reportsRes = await request.get("/api/v1/reports", {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    const reportsJson = (await reportsRes.json()) as {
      data: { reports: { report_id: number; status: string }[] };
    };
    const submitted = reportsJson.data.reports.find((r) => r.status === "SUBMITTED");
    if (!submitted) {
      throw new Error(
        "テスト実行にはSUBMITTEDな日報が必要です。npm run db:seed を実行してください。",
      );
    }
    submittedReportId = submitted.report_id;
  });

  test("#1 日報一覧に全員分が表示される", async ({ page }) => {
    await page.goto("/reports");

    // 担当者列が存在することを確認（MANAGERは全員分見れる）
    await expect(page.getByRole("columnheader", { name: "担当者" })).toBeVisible();

    // 日報が表示されていることを確認
    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
  });

  test("#2 コメントを投稿できる", async ({ page }) => {
    await page.goto(`/reports/${submittedReportId}`);
    await expect(page.getByRole("heading", { name: /日報詳細/ })).toBeVisible();

    const commentText = `E2Eテスト コメント投稿 ${Date.now()}`;
    await page.getByPlaceholder("コメントを入力してください").fill(commentText);
    await page.getByRole("button", { name: "コメントを投稿" }).click();

    await expect(page.getByText(commentText)).toBeVisible();
  });

  test("#3 コメントをインライン編集できる", async ({ page }) => {
    // まずコメントを投稿
    await page.goto(`/reports/${submittedReportId}`);
    const originalText = `編集テスト用コメント ${Date.now()}`;
    await page.getByPlaceholder("コメントを入力してください").fill(originalText);
    await page.getByRole("button", { name: "コメントを投稿" }).click();
    await expect(page.getByText(originalText)).toBeVisible();

    // コメント編集
    const commentBlock = page
      .locator(".rounded-md.border.p-4")
      .filter({ hasText: originalText });
    await commentBlock.getByRole("button", { name: "編集" }).click();

    const updatedText = `編集後コメント ${Date.now()}`;
    const editTextarea = commentBlock.getByRole("textbox");
    await editTextarea.clear();
    await editTextarea.fill(updatedText);
    await commentBlock.getByRole("button", { name: "保存" }).click();

    await expect(page.getByText(updatedText)).toBeVisible();
    await expect(page.getByText(originalText)).not.toBeVisible();
  });

  test("#4 コメントを削除できる", async ({ page }) => {
    // まずコメントを投稿
    await page.goto(`/reports/${submittedReportId}`);
    const commentText = `削除テスト用コメント ${Date.now()}`;
    await page.getByPlaceholder("コメントを入力してください").fill(commentText);
    await page.getByRole("button", { name: "コメントを投稿" }).click();
    await expect(page.getByText(commentText)).toBeVisible();

    // コメント削除
    const commentBlock = page
      .locator(".rounded-md.border.p-4")
      .filter({ hasText: commentText });
    await commentBlock.getByRole("button", { name: "削除" }).click();

    // 確認ダイアログで削除実行
    await page.getByRole("button", { name: "削除する" }).click();

    await expect(page.getByText(commentText)).not.toBeVisible();
  });

  test("#5 SALES にコメント投稿フォームが非表示", async ({ browser }) => {
    // SALES 権限の別コンテキストを作成
    const salesContext = await browser.newContext({ storageState: AUTH_STATE.sales });
    const salesPage = await salesContext.newPage();

    await salesPage.goto(`/reports/${submittedReportId}`);
    await expect(salesPage.getByRole("heading", { name: /日報詳細/ })).toBeVisible();

    // コメント投稿フォームが非表示
    await expect(salesPage.getByPlaceholder("コメントを入力してください")).not.toBeVisible();
    await expect(salesPage.getByRole("button", { name: "コメントを投稿" })).not.toBeVisible();

    await salesContext.close();
  });
});
