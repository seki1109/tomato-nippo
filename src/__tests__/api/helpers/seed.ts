/**
 * APIテスト用DBシードヘルパー
 *
 * 各テストスイートの beforeAll で呼び出し、テストデータを投入する。
 * teardown では全テーブルをクリアして干渉を防ぐ。
 */
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcryptjs";

import { PrismaClient } from "@/generated/prisma/client";

// テスト用 Prisma インスタンス（.env.test の DATABASE_URL を使用）
function createTestPrisma(): PrismaClient {
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
  return new PrismaClient({ adapter });
}

export const testPrisma = createTestPrisma();

export const TEST_PASSWORD = "password123";

export interface SeedData {
  salesUser: { id: number; email: string; name: string; role: "SALES" };
  sales2User: { id: number; email: string; name: string; role: "SALES" };
  managerUser: { id: number; email: string; name: string; role: "MANAGER" };
  adminUser: { id: number; email: string; name: string; role: "ADMIN" };
  inactiveUser: { id: number; email: string; name: string; role: "SALES" };
  customers: { id: number; companyName: string }[];
  draftReport: { id: number; userId: number; reportDate: string };
  submittedReport: { id: number; userId: number; reportDate: string };
  otherDraftReport: { id: number; userId: number; reportDate: string };
}

/** テスト用データを投入する */
export async function seedTestData(): Promise<SeedData> {
  await clearTestData();

  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

  const salesUser = await testPrisma.user.create({
    data: {
      name: "田中太郎",
      email: "tanaka-test@example.com",
      passwordHash,
      role: "SALES",
      department: "東京営業部",
    },
  });

  const sales2User = await testPrisma.user.create({
    data: {
      name: "鈴木花子",
      email: "suzuki-test@example.com",
      passwordHash,
      role: "SALES",
      department: "大阪営業部",
    },
  });

  const managerUser = await testPrisma.user.create({
    data: {
      name: "山田部長",
      email: "manager-test@example.com",
      passwordHash,
      role: "MANAGER",
      department: "東京営業部",
    },
  });

  const adminUser = await testPrisma.user.create({
    data: {
      name: "管理者",
      email: "admin-test@example.com",
      passwordHash,
      role: "ADMIN",
      department: "システム管理部",
    },
  });

  const inactiveUser = await testPrisma.user.create({
    data: {
      name: "無効ユーザー",
      email: "inactive-test@example.com",
      passwordHash,
      role: "SALES",
      isActive: false,
    },
  });

  // 顧客マスター 3件
  const customerAlpha = await testPrisma.customer.create({
    data: {
      companyName: "株式会社アルファ",
      contactPerson: "佐藤一郎",
      phone: "03-0001-0001",
    },
  });
  const customerBeta = await testPrisma.customer.create({
    data: {
      companyName: "株式会社ベータ",
      contactPerson: "伊藤二郎",
      phone: "03-0001-0002",
    },
  });
  const customerGamma = await testPrisma.customer.create({
    data: {
      companyName: "株式会社ガンマ",
      contactPerson: "渡辺三郎",
      phone: "03-0001-0003",
    },
  });

  // salesUser の DRAFT 日報（本日から3日前）
  const draftReport = await testPrisma.dailyReport.create({
    data: {
      userId: salesUser.id,
      reportDate: new Date("2026-03-01"),
      problem: "課題テスト",
      plan: "計画テスト",
      status: "DRAFT",
      visitRecords: {
        create: [
          {
            customerId: customerAlpha.id,
            visitContent: "訪問内容テスト1",
            visitOrder: 1,
          },
        ],
      },
    },
  });

  // salesUser の SUBMITTED 日報（本日から5日前）
  const submittedReport = await testPrisma.dailyReport.create({
    data: {
      userId: salesUser.id,
      reportDate: new Date("2026-02-28"),
      problem: "課題テスト2",
      plan: "計画テスト2",
      status: "SUBMITTED",
      visitRecords: {
        create: [
          {
            customerId: customerBeta.id,
            visitContent: "訪問内容テスト2",
            visitOrder: 1,
          },
        ],
      },
    },
  });

  // sales2User の DRAFT 日報
  const otherDraftReport = await testPrisma.dailyReport.create({
    data: {
      userId: sales2User.id,
      reportDate: new Date("2026-03-01"),
      problem: null,
      plan: null,
      status: "DRAFT",
      visitRecords: {
        create: [
          {
            customerId: customerGamma.id,
            visitContent: "別ユーザーの訪問内容",
            visitOrder: 1,
          },
        ],
      },
    },
  });

  return {
    salesUser: {
      id: salesUser.id,
      email: salesUser.email,
      name: salesUser.name,
      role: "SALES",
    },
    sales2User: {
      id: sales2User.id,
      email: sales2User.email,
      name: sales2User.name,
      role: "SALES",
    },
    managerUser: {
      id: managerUser.id,
      email: managerUser.email,
      name: managerUser.name,
      role: "MANAGER",
    },
    adminUser: {
      id: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      role: "ADMIN",
    },
    inactiveUser: {
      id: inactiveUser.id,
      email: inactiveUser.email,
      name: inactiveUser.name,
      role: "SALES",
    },
    customers: [
      { id: customerAlpha.id, companyName: customerAlpha.companyName },
      { id: customerBeta.id, companyName: customerBeta.companyName },
      { id: customerGamma.id, companyName: customerGamma.companyName },
    ],
    draftReport: {
      id: draftReport.id,
      userId: salesUser.id,
      reportDate: "2026-03-01",
    },
    submittedReport: {
      id: submittedReport.id,
      userId: salesUser.id,
      reportDate: "2026-02-28",
    },
    otherDraftReport: {
      id: otherDraftReport.id,
      userId: sales2User.id,
      reportDate: "2026-03-01",
    },
  };
}

/** 全テーブルのデータを削除する（外部キー制約の順番に注意） */
export async function clearTestData(): Promise<void> {
  await testPrisma.comment.deleteMany();
  await testPrisma.visitRecord.deleteMany();
  await testPrisma.dailyReport.deleteMany();
  await testPrisma.customer.deleteMany();
  await testPrisma.user.deleteMany();
}
