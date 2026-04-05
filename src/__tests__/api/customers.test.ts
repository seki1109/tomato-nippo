import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DELETE,
  PUT,
} from "@/app/api/v1/customers/[customerId]/route";
import { GET, POST } from "@/app/api/v1/customers/route";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

function makeRequest(
  url: string,
  method: string,
  role: string,
  userId: number,
  body?: unknown,
): NextRequest {
  const headers: Record<string, string> = {
    "x-user-id": String(userId),
    "x-user-role": role,
    "x-user-name": encodeURIComponent("テストユーザー"),
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

const CUSTOMER_ID = "5";
const CUSTOMER_PARAMS = {
  params: Promise.resolve({ customerId: CUSTOMER_ID }),
};

const activeCustomer = {
  id: 5,
  companyName: "株式会社〇〇",
  contactPerson: "佐藤一郎",
  phone: "03-0000-0000",
  address: "東京都千代田区",
  isActive: true,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-03-27T10:00:00Z"),
};

const customerList = [
  {
    id: 5,
    companyName: "株式会社〇〇",
    contactPerson: "佐藤一郎",
    phone: "03-0000-0000",
    address: "東京都千代田区",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// AT-CUSTOMER-001: GET /api/v1/customers
// ─────────────────────────────────────────────────────────────────────────────
describe("AT-CUSTOMER-001: GET /customers", () => {
  beforeEach(() => {
    vi.mocked(prisma.customer.count).mockReset();
    vi.mocked(prisma.customer.findMany).mockReset();
  });

  it("#1 全ロールでアクセス可能 (SALES / MANAGER / ADMIN) → 200", async () => {
    vi.mocked(prisma.customer.count).mockResolvedValue(1);
    vi.mocked(prisma.customer.findMany).mockResolvedValue(customerList as never);

    for (const role of ["SALES", "MANAGER", "ADMIN"] as const) {
      const req = makeRequest("/api/v1/customers", "GET", role, 1);
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json() as { data: { customers: unknown[] } };
      expect(Array.isArray(json.data.customers)).toBe(true);
    }
  });

  it("#2 キーワード検索 → 200（一致する顧客のみ）", async () => {
    vi.mocked(prisma.customer.count).mockResolvedValue(1);
    vi.mocked(prisma.customer.findMany).mockResolvedValue(customerList as never);

    const req = makeRequest("/api/v1/customers?q=株式会社", "GET", "ADMIN", 1);
    const res = await GET(req);

    expect(res.status).toBe(200);
    // isActive: true でかつ OR 検索（companyName/contactPerson）でフィルターされることを確認
    expect(vi.mocked(prisma.customer.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          OR: expect.arrayContaining([
            { companyName: { contains: "株式会社" } },
            { contactPerson: { contains: "株式会社" } },
          ]),
        }),
      }),
    );
  });

  it("#3 論理削除済みは結果に含まない → isActive: true でクエリされる", async () => {
    vi.mocked(prisma.customer.count).mockResolvedValue(0);
    vi.mocked(prisma.customer.findMany).mockResolvedValue([]);

    const req = makeRequest("/api/v1/customers", "GET", "ADMIN", 1);
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.customer.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true }),
      }),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AT-CUSTOMER-002: POST / PUT / DELETE /api/v1/customers
// ─────────────────────────────────────────────────────────────────────────────
describe("AT-CUSTOMER-002: POST / PUT / DELETE /customers", () => {
  beforeEach(() => {
    vi.mocked(prisma.customer.findUnique).mockReset();
    vi.mocked(prisma.customer.create).mockReset();
    vi.mocked(prisma.customer.update).mockReset();
  });

  it("#1 ADMIN が顧客登録 → 201", async () => {
    vi.mocked(prisma.customer.create).mockResolvedValue({
      ...activeCustomer,
      id: 30,
    } as never);

    const req = makeRequest("/api/v1/customers", "POST", "ADMIN", 1, {
      company_name: "株式会社新規",
      contact_person: "鈴木花子",
      phone: "03-1111-2222",
      address: "東京都港区",
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    const json = await res.json() as { data: { customer_id: number; is_active: boolean } };
    expect(json.data.customer_id).toBe(30);
    expect(json.data.is_active).toBe(true);
  });

  it("#2 SALES が顧客登録 → 403", async () => {
    const req = makeRequest("/api/v1/customers", "POST", "SALES", 1, {
      company_name: "株式会社新規",
    });
    const res = await POST(req);

    expect(res.status).toBe(403);
    const json = await res.json() as { error: { code: string } };
    expect(json.error.code).toBe("FORBIDDEN");
  });

  it("#3 ADMIN が顧客更新 → 200", async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(activeCustomer as never);
    vi.mocked(prisma.customer.update).mockResolvedValue({
      ...activeCustomer,
      companyName: "株式会社〇〇（更新）",
    } as never);

    const req = makeRequest(
      `/api/v1/customers/${CUSTOMER_ID}`,
      "PUT",
      "ADMIN",
      1,
      {
        company_name: "株式会社〇〇（更新）",
        contact_person: "佐藤次郎",
        phone: "03-0000-9999",
        address: "東京都新宿区",
      },
    );
    const res = await PUT(req, CUSTOMER_PARAMS);

    expect(res.status).toBe(200);
    const json = await res.json() as { data: { company_name: string } };
    expect(json.data.company_name).toBe("株式会社〇〇（更新）");
  });

  it("#4 ADMIN が顧客削除（論理削除）→ 204", async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(activeCustomer as never);
    vi.mocked(prisma.customer.update).mockResolvedValue({
      ...activeCustomer,
      isActive: false,
    } as never);

    const req = makeRequest(
      `/api/v1/customers/${CUSTOMER_ID}`,
      "DELETE",
      "ADMIN",
      1,
    );
    const res = await DELETE(req, CUSTOMER_PARAMS);

    expect(res.status).toBe(204);
    // 論理削除（isActive: false）で update が呼ばれることを確認
    expect(vi.mocked(prisma.customer.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { isActive: false },
      }),
    );
  });

  it("#5 削除済み顧客を再度削除 → 404", async () => {
    // isActive: false の顧客
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      ...activeCustomer,
      isActive: false,
    } as never);

    const req = makeRequest(
      `/api/v1/customers/${CUSTOMER_ID}`,
      "DELETE",
      "ADMIN",
      1,
    );
    const res = await DELETE(req, CUSTOMER_PARAMS);

    expect(res.status).toBe(404);
    const json = await res.json() as { error: { code: string } };
    expect(json.error.code).toBe("NOT_FOUND");
  });
});
