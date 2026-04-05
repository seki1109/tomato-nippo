import { expect, test } from "@playwright/test";

import { AUTH_STATE } from "./helpers/auth";

/**
 * ET-002: 日報作成〜提出フロー（SALES）
 */
test.describe("ET-002: 日報作成〜提出フロー（SALES）", () => {
  test.use({ storageState: AUTH_STATE.sales });

  let salesToken: string;

  // SUBMITTED 日報は削除不可のため、beforeAll で既存レポートと被らない日付を動的に割り当てる
  let testDateDraft = "2025-06-01";
  let testDateSubmit = "2025-06-02";
  // TEST_DATE_DUPLICATE は常に DRAFT で作成・削除するため固定でよい
  const TEST_DATE_DUPLICATE = "2025-06-03";

  /** takenDates に含まれない最初の空き日付を start から過去方向へ探して返す */
  function findAvailableDate(takenDates: Set<string>, start: string): string {
    let candidate = start;
    while (takenDates.has(candidate)) {
      const d = new Date(candidate);
      d.setDate(d.getDate() - 1);
      candidate = d.toISOString().split("T")[0]!;
    }
    return candidate;
  }

  test.beforeAll(async ({ request }) => {
    // テスト用トークン取得
    const res = await request.post("/api/v1/auth/login", {
      data: { email: "tanaka@example.com", password: "password123" },
    });
    const json = (await res.json()) as { data: { token: string } };
    salesToken = json.data.token;

    // 既存レポート一覧取得（クリーンアップ & 空き日付の算出に使用）
    const existing = await request.get("/api/v1/reports?per_page=1000", {
      headers: { Authorization: `Bearer ${salesToken}` },
    });
    const existingJson = (await existing.json()) as {
      data: { reports: { report_id: number; report_date: string; status: string }[] };
    };

    // デフォルトのテスト日付に対応する DRAFT 日報を削除（冪等）
    const defaultTestDates = new Set([testDateDraft, testDateSubmit, TEST_DATE_DUPLICATE]);
    for (const r of existingJson.data.reports) {
      if (defaultTestDates.has(r.report_date) && r.status === "DRAFT") {
        await request.delete(`/api/v1/reports/${r.report_id}`, {
          headers: { Authorization: `Bearer ${salesToken}` },
        });
      }
    }

    // SUBMITTED 日報の日付は再利用不可なので使用済みセットに追加
    const takenDates = new Set(
      existingJson.data.reports
        .filter((r) => r.status === "SUBMITTED")
        .map((r) => r.report_date),
    );
    // TEST_DATE_DUPLICATE も予約済みとして扱う
    takenDates.add(TEST_DATE_DUPLICATE);

    // DRAFT 用・SUBMIT 用それぞれの空き日付を割り当て（互いにも重複しないよう順番に確保）
    testDateDraft = findAvailableDate(takenDates, "2025-06-01");
    takenDates.add(testDateDraft);
    testDateSubmit = findAvailableDate(takenDates, "2025-06-02");

    // TEST_DATE_DUPLICATE 用の日報を事前作成
    const custRes = await request.get("/api/v1/customers", {
      headers: { Authorization: `Bearer ${salesToken}` },
    });
    const custJson = (await custRes.json()) as {
      data: { customers: { customer_id: number }[] };
    };
    const customerId = custJson.data.customers[0]?.customer_id ?? 1;

    await request.post("/api/v1/reports", {
      headers: {
        Authorization: `Bearer ${salesToken}`,
        "Content-Type": "application/json",
      },
      data: {
        report_date: TEST_DATE_DUPLICATE,
        status: "DRAFT",
        visit_records: [
          {
            customer_id: customerId,
            visit_content: "重複テスト用訪問記録",
            visit_order: 1,
          },
        ],
      },
    });
  });

  test.afterAll(async ({ request }) => {
    // テストで作成した DRAFT 日報を削除
    const res = await request.get("/api/v1/reports?per_page=1000", {
      headers: { Authorization: `Bearer ${salesToken}` },
    });
    const json = (await res.json()) as {
      data: { reports: { report_id: number; report_date: string; status: string }[] };
    };
    const cleanupDates = new Set([testDateDraft, testDateSubmit, TEST_DATE_DUPLICATE]);
    for (const r of json.data.reports) {
      if (cleanupDates.has(r.report_date) && r.status === "DRAFT") {
        await request.delete(`/api/v1/reports/${r.report_id}`, {
          headers: { Authorization: `Bearer ${salesToken}` },
        });
      }
    }
  });

  test("#1 日報を下書き保存する → 詳細画面に DRAFT で表示", async ({ page }) => {
    // 顧客一覧を先に取得して顧客名を確認
    const res = await page.request.get("/api/v1/customers", {
      headers: { Authorization: `Bearer ${salesToken}` },
    });
    const json = (await res.json()) as { data: { customers: { company_name: string }[] } };
    const firstCustomerName = json.data.customers[0]?.company_name ?? "";

    await page.goto("/reports/new");

    // 日付入力
    await page.fill("#report-date", testDateDraft);

    // 顧客選択（最初の行）
    await page.locator("tbody tr").first().getByRole("combobox").click();
    await page.getByRole("option", { name: firstCustomerName }).first().click();

    // 訪問内容入力
    await page
      .locator("tbody tr")
      .first()
      .getByPlaceholder("訪問内容を入力")
      .fill("新製品の説明を実施。担当者に好評だった。");

    // 下書き保存
    await page.getByRole("button", { name: "下書き保存" }).click();

    // 詳細画面へ遷移
    await page.waitForURL(/\/reports\/\d+/);
    await expect(page.getByText("下書き")).toBeVisible();
  });

  test("#2 訪問先を3行追加できる", async ({ page }) => {
    await page.goto("/reports/new");

    // デフォルトで1行ある → さらに2回追加で計3行
    await page.getByRole("button", { name: "+ 訪問先を追加" }).click();
    await page.getByRole("button", { name: "+ 訪問先を追加" }).click();

    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(3);
  });

  test("#3 2行目を削除できる", async ({ page }) => {
    await page.goto("/reports/new");

    // 2行追加（計3行）
    await page.getByRole("button", { name: "+ 訪問先を追加" }).click();
    await page.getByRole("button", { name: "+ 訪問先を追加" }).click();

    await expect(page.locator("tbody tr")).toHaveCount(3);

    // 2行目の削除ボタンをクリック
    await page.locator("tbody tr").nth(1).getByRole("button", { name: "削除" }).click();

    await expect(page.locator("tbody tr")).toHaveCount(2);
  });

  test("#4 提出するボタンで SUBMITTED になる", async ({ page }) => {
    const res = await page.request.get("/api/v1/customers", {
      headers: { Authorization: `Bearer ${salesToken}` },
    });
    const json = (await res.json()) as { data: { customers: { company_name: string }[] } };
    const firstCustomerName = json.data.customers[0]?.company_name ?? "";

    await page.goto("/reports/new");

    await page.fill("#report-date", testDateSubmit);

    await page.locator("tbody tr").first().getByRole("combobox").click();
    await page.getByRole("option", { name: firstCustomerName }).first().click();

    await page
      .locator("tbody tr")
      .first()
      .getByPlaceholder("訪問内容を入力")
      .fill("提出テスト用の訪問内容");

    await page.getByRole("button", { name: "提出する" }).click();

    await page.waitForURL(/\/reports\/\d+/);
    await expect(page.getByText("提出済み")).toBeVisible();
  });

  test("#5 提出済み日報の編集・削除ボタンが非表示", async ({ page }) => {
    // SUBMITTED な日報を取得（テスト#4で作成したもの、またはシードデータ）
    const res = await page.request.get("/api/v1/reports", {
      headers: { Authorization: `Bearer ${salesToken}` },
    });
    const json = (await res.json()) as {
      data: { reports: { report_id: number; status: string }[] };
    };
    const submitted = json.data.reports.find((r) => r.status === "SUBMITTED");
    if (!submitted) {
      test.skip(true, "SUBMITTED な日報が存在しません");
      return;
    }

    await page.goto(`/reports/${submitted.report_id}`);
    await expect(page.getByRole("heading", { name: /日報詳細/ })).toBeVisible();

    // 編集・削除ボタンが表示されないことを確認
    await expect(page.getByRole("button", { name: "編集" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "削除" })).not.toBeVisible();
  });

  test("#6 同日の日報が存在する場合エラーメッセージが表示される", async ({ page }) => {
    const res = await page.request.get("/api/v1/customers", {
      headers: { Authorization: `Bearer ${salesToken}` },
    });
    const json = (await res.json()) as { data: { customers: { company_name: string }[] } };
    const firstCustomerName = json.data.customers[0]?.company_name ?? "";

    await page.goto("/reports/new");

    // TEST_DATE_DUPLICATE は beforeAll で既に作成済み
    await page.fill("#report-date", TEST_DATE_DUPLICATE);

    await page.locator("tbody tr").first().getByRole("combobox").click();
    await page.getByRole("option", { name: firstCustomerName }).first().click();

    await page
      .locator("tbody tr")
      .first()
      .getByPlaceholder("訪問内容を入力")
      .fill("重複テスト用内容");

    await page.getByRole("button", { name: "下書き保存" }).click();

    await expect(
      page.getByText(/の日報は既に存在します/),
    ).toBeVisible();
  });
});
