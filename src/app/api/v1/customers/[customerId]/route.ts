import { NextResponse } from "next/server";

import {
  forbiddenError,
  notFoundError,
  successResponse,
  validationError,
} from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

import type { NextRequest } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> },
) {
  // 1. ロール検証: ADMIN のみ許可
  const authUser = requireRole(request, ["ADMIN"]);
  if (!authUser) return forbiddenError();

  const { customerId } = await params;
  const customerIdNum = Number(customerId);

  if (!Number.isInteger(customerIdNum) || customerIdNum <= 0) {
    return notFoundError("顧客が見つかりません");
  }

  // 2. 顧客の取得（論理削除済みも含めて検索し、どちらも 404 を返す）
  const existing = await prisma.customer.findUnique({
    where: { id: customerIdNum },
  });

  if (!existing || !existing.isActive) {
    return notFoundError("顧客が見つかりません");
  }

  // 3. リクエストボディのパース
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return validationError("リクエストボディが不正です");
  }

  const { company_name, contact_person, phone, address } = body;
  const details: { field: string; message: string }[] = [];

  // 4. バリデーション（POST と同じルール）

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

  // 5. 顧客を更新
  const updated = await prisma.customer.update({
    where: { id: customerIdNum },
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

  // 6. 200: 更新後の顧客情報
  return successResponse({
    customer_id: updated.id,
    company_name: updated.companyName,
    contact_person: updated.contactPerson,
    phone: updated.phone,
    address: updated.address,
    is_active: updated.isActive,
    created_at: updated.createdAt.toISOString(),
    updated_at: updated.updatedAt.toISOString(),
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> },
) {
  // 1. ロール検証: ADMIN のみ許可
  const authUser = requireRole(request, ["ADMIN"]);
  if (!authUser) return forbiddenError();

  const { customerId } = await params;
  const customerIdNum = Number(customerId);

  if (!Number.isInteger(customerIdNum) || customerIdNum <= 0) {
    return notFoundError("顧客が見つかりません");
  }

  // 2. 顧客の取得（is_active=true のもののみ対象）
  const existing = await prisma.customer.findUnique({
    where: { id: customerIdNum },
  });

  if (!existing || !existing.isActive) {
    return notFoundError("顧客が見つかりません");
  }

  // 3. 論理削除（is_active = false）
  await prisma.customer.update({
    where: { id: customerIdNum },
    data: { isActive: false },
  });

  // 4. 204 No Content
  return new NextResponse(null, { status: 204 });
}
