
import { forbiddenError, successResponse } from "@/lib/api-response";
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
