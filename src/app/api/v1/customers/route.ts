
import {
  forbiddenError,
  successResponse,
  validationError,
} from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const authUser = requireRole(request, ["SALES", "MANAGER", "ADMIN"]);
  if (!authUser) return forbiddenError();

  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q") ?? undefined;
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const perPage = Math.max(
    1,
    Number(searchParams.get("per_page") ?? "50") || 50,
  );

  const where = {
    isActive: true,
    ...(q
      ? {
          OR: [
            { companyName: { contains: q } },
            { contactPerson: { contains: q } },
          ],
        }
      : {}),
  };

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy: { companyName: "asc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        companyName: true,
        contactPerson: true,
        phone: true,
        address: true,
      },
    }),
  ]);

  return successResponse({
    customers: customers.map((c) => ({
      customer_id: c.id,
      company_name: c.companyName,
      contact_person: c.contactPerson,
      phone: c.phone,
      address: c.address,
    })),
    pagination: {
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    },
  });
}

export async function POST(request: NextRequest) {
  // 1. ロール検証: ADMIN のみ許可
  const authUser = requireRole(request, ["ADMIN"]);
  if (!authUser) return forbiddenError();

  // 2. リクエストボディのパース
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return validationError("リクエストボディが不正です");
  }

  const { company_name, contact_person, phone, address } = body;
  const details: { field: string; message: string }[] = [];

  // 3. バリデーション

  // company_name: 必須・200文字以内
  if (
    company_name === undefined ||
    company_name === null ||
    company_name === ""
  ) {
    details.push({ field: "company_name", message: "会社名は必須です" });
  } else if (typeof company_name !== "string") {
    details.push({
      field: "company_name",
      message: "会社名の形式が正しくありません",
    });
  } else if (company_name.length > 200) {
    details.push({
      field: "company_name",
      message: "会社名は200文字以内で入力してください",
    });
  }

  // contact_person: 任意・100文字以内
  if (typeof contact_person === "string" && contact_person.length > 100) {
    details.push({
      field: "contact_person",
      message: "担当者名は100文字以内で入力してください",
    });
  }

  // phone: 任意・電話番号形式（^[\d\-\+\(\)\s]+$）
  if (
    typeof phone === "string" &&
    phone.length > 0 &&
    !/^[\d\-\+\(\)\s]+$/.test(phone)
  ) {
    details.push({
      field: "phone",
      message: "電話番号の形式が正しくありません",
    });
  }

  // address: 任意・500文字以内
  if (typeof address === "string" && address.length > 500) {
    details.push({
      field: "address",
      message: "住所は500文字以内で入力してください",
    });
  }

  if (details.length > 0) {
    return validationError("入力値が不正です", details);
  }

  // 4. 顧客を作成（is_active = true はデフォルト）
  const customer = await prisma.customer.create({
    data: {
      companyName: company_name as string,
      contactPerson:
        typeof contact_person === "string" && contact_person.length > 0
          ? contact_person
          : null,
      phone:
        typeof phone === "string" && phone.length > 0 ? phone : null,
      address:
        typeof address === "string" && address.length > 0 ? address : null,
    },
  });

  return successResponse(
    {
      customer_id: customer.id,
      company_name: customer.companyName,
      contact_person: customer.contactPerson,
      phone: customer.phone,
      address: customer.address,
      is_active: customer.isActive,
      created_at: customer.createdAt.toISOString(),
      updated_at: customer.updatedAt.toISOString(),
    },
    201,
  );
}
