import "dotenv/config";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcryptjs";

import { PrismaClient, Role, ReportStatus } from "../src/generated/prisma/client";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.warn("Seeding database...");

  // ── ユーザー ──────────────────────────────────────────
  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "管理者",
      email: "admin@example.com",
      passwordHash,
      role: Role.ADMIN,
      department: "システム管理部",
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@example.com" },
    update: {},
    create: {
      name: "山田部長",
      email: "manager@example.com",
      passwordHash,
      role: Role.MANAGER,
      department: "東京営業部",
    },
  });

  const sales1 = await prisma.user.upsert({
    where: { email: "tanaka@example.com" },
    update: {},
    create: {
      name: "田中太郎",
      email: "tanaka@example.com",
      passwordHash,
      role: Role.SALES,
      department: "東京営業部",
    },
  });

  const sales2 = await prisma.user.upsert({
    where: { email: "suzuki@example.com" },
    update: {},
    create: {
      name: "鈴木花子",
      email: "suzuki@example.com",
      passwordHash,
      role: Role.SALES,
      department: "大阪営業部",
    },
  });

  console.warn(
    `Created users: ${admin.name}, ${manager.name}, ${sales1.name}, ${sales2.name}`
  );

  // ── 顧客マスター ──────────────────────────────────────
  const customerData = [
    {
      companyName: "株式会社アルファ",
      contactPerson: "佐藤一郎",
      phone: "03-1000-0001",
      address: "東京都千代田区丸の内1-1-1",
    },
    {
      companyName: "株式会社ベータ",
      contactPerson: "伊藤二郎",
      phone: "03-1000-0002",
      address: "東京都港区赤坂2-2-2",
    },
    {
      companyName: "株式会社ガンマ",
      contactPerson: "渡辺三郎",
      phone: "06-2000-0003",
      address: "大阪府大阪市北区梅田3-3-3",
    },
    {
      companyName: "デルタ工業株式会社",
      contactPerson: "高橋四郎",
      phone: "052-3000-0004",
      address: "愛知県名古屋市中村区4-4-4",
    },
    {
      companyName: "株式会社イプシロン",
      contactPerson: "小林五郎",
      phone: "03-1000-0005",
      address: "東京都渋谷区5-5-5",
    },
    {
      companyName: "ゼータ商事株式会社",
      contactPerson: "加藤六子",
      phone: "03-1000-0006",
      address: "東京都新宿区6-6-6",
    },
    {
      companyName: "株式会社イータ",
      contactPerson: "吉田七郎",
      phone: "06-2000-0007",
      address: "大阪府堺市7-7-7",
    },
    {
      companyName: "シータ製造株式会社",
      contactPerson: "山本八郎",
      phone: "092-4000-0008",
      address: "福岡県福岡市博多区8-8-8",
    },
    {
      companyName: "株式会社イオタ",
      contactPerson: "中村九子",
      phone: "011-5000-0009",
      address: "北海道札幌市中央区9-9-9",
    },
    {
      companyName: "カッパ物産株式会社",
      contactPerson: "林十郎",
      phone: "03-1000-0010",
      address: "東京都品川区10-10-10",
    },
  ];

  const customers = await Promise.all(
    customerData.map((data) =>
      prisma.customer.upsert({
        where: { id: 0 },
        update: {},
        create: data,
      })
    )
  );
  console.warn(`Created ${customers.length} customers`);

  // ── 日報（田中: 5件、鈴木: 5件）─────────────────────

  const today = new Date("2026-03-28");
  const makeDate = (daysAgo: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return d;
  };

  // 田中の日報
  const reports = await Promise.all([
    prisma.dailyReport.upsert({
      where: { userId_reportDate: { userId: sales1.id, reportDate: makeDate(0) } },
      update: {},
      create: {
        userId: sales1.id,
        reportDate: makeDate(0),
        problem: "株式会社アルファの担当者が変わり、関係構築が必要。",
        plan: "株式会社ベータへ提案資料を送付する。",
        status: ReportStatus.DRAFT,
        visitRecords: {
          create: [
            {
              customerId: customers[0].id,
              visitContent: "新製品の提案を実施。前向きな反応。",
              visitOrder: 1,
            },
            {
              customerId: customers[1].id,
              visitContent: "契約更新の打ち合わせ。来週返答予定。",
              visitOrder: 2,
            },
          ],
        },
      },
    }),
    prisma.dailyReport.upsert({
      where: { userId_reportDate: { userId: sales1.id, reportDate: makeDate(1) } },
      update: {},
      create: {
        userId: sales1.id,
        reportDate: makeDate(1),
        problem: "価格交渉が難航している。",
        plan: "上長に相談してディスカウント案を検討する。",
        status: ReportStatus.SUBMITTED,
        visitRecords: {
          create: [
            {
              customerId: customers[2].id,
              visitContent: "見積書を提出。価格について再検討依頼を受けた。",
              visitOrder: 1,
            },
          ],
        },
      },
    }),
    prisma.dailyReport.upsert({
      where: { userId_reportDate: { userId: sales1.id, reportDate: makeDate(2) } },
      update: {},
      create: {
        userId: sales1.id,
        reportDate: makeDate(2),
        problem: null,
        plan: "デルタ工業のフォローアップ電話を入れる。",
        status: ReportStatus.SUBMITTED,
        visitRecords: {
          create: [
            {
              customerId: customers[3].id,
              visitContent: "新規開拓の挨拶訪問。名刺交換と製品カタログを配布。",
              visitOrder: 1,
            },
            {
              customerId: customers[4].id,
              visitContent: "定期フォロー訪問。追加発注の可能性あり。",
              visitOrder: 2,
            },
          ],
        },
      },
    }),
    prisma.dailyReport.upsert({
      where: { userId_reportDate: { userId: sales1.id, reportDate: makeDate(7) } },
      update: {},
      create: {
        userId: sales1.id,
        reportDate: makeDate(7),
        problem: "競合他社の新製品が出て、顧客が比較検討中。",
        plan: "自社製品の優位性をまとめた資料を作成する。",
        status: ReportStatus.SUBMITTED,
        visitRecords: {
          create: [
            {
              customerId: customers[5].id,
              visitContent: "競合比較の相談を受けた。技術資料を持参する約束をした。",
              visitOrder: 1,
            },
          ],
        },
      },
    }),
    prisma.dailyReport.upsert({
      where: { userId_reportDate: { userId: sales1.id, reportDate: makeDate(8) } },
      update: {},
      create: {
        userId: sales1.id,
        reportDate: makeDate(8),
        problem: null,
        plan: "イータへのフォローアップメールを送付する。",
        status: ReportStatus.SUBMITTED,
        visitRecords: {
          create: [
            {
              customerId: customers[6].id,
              visitContent: "サービス説明のデモを実施。好感触。来週詳細打合せ予定。",
              visitOrder: 1,
            },
          ],
        },
      },
    }),
    // 鈴木の日報
    prisma.dailyReport.upsert({
      where: { userId_reportDate: { userId: sales2.id, reportDate: makeDate(0) } },
      update: {},
      create: {
        userId: sales2.id,
        reportDate: makeDate(0),
        problem: "大口顧客のシータ製造が予算削減を検討中。",
        plan: "コスト削減プランを提案する資料を準備する。",
        status: ReportStatus.DRAFT,
        visitRecords: {
          create: [
            {
              customerId: customers[7].id,
              visitContent: "年間契約の更新交渉。予算削減の懸念を確認した。",
              visitOrder: 1,
            },
          ],
        },
      },
    }),
    prisma.dailyReport.upsert({
      where: { userId_reportDate: { userId: sales2.id, reportDate: makeDate(1) } },
      update: {},
      create: {
        userId: sales2.id,
        reportDate: makeDate(1),
        problem: null,
        plan: "カッパ物産の担当者に電話フォローアップを行う。",
        status: ReportStatus.SUBMITTED,
        visitRecords: {
          create: [
            {
              customerId: customers[8].id,
              visitContent: "新規開拓訪問。担当者不在のため、資料を置いてきた。",
              visitOrder: 1,
            },
            {
              customerId: customers[9].id,
              visitContent: "既存サービスの利用状況確認。概ね満足との回答。",
              visitOrder: 2,
            },
          ],
        },
      },
    }),
    prisma.dailyReport.upsert({
      where: { userId_reportDate: { userId: sales2.id, reportDate: makeDate(2) } },
      update: {},
      create: {
        userId: sales2.id,
        reportDate: makeDate(2),
        problem: "アルファ社の決裁者へのアプローチ方法を考える必要がある。",
        plan: "マネージャーと戦略を相談する。",
        status: ReportStatus.SUBMITTED,
        visitRecords: {
          create: [
            {
              customerId: customers[0].id,
              visitContent: "担当者との定期面談。上位役職者へのアプローチを打診。",
              visitOrder: 1,
            },
          ],
        },
      },
    }),
    prisma.dailyReport.upsert({
      where: { userId_reportDate: { userId: sales2.id, reportDate: makeDate(7) } },
      update: {},
      create: {
        userId: sales2.id,
        reportDate: makeDate(7),
        problem: null,
        plan: "ガンマ社の提案書を来週までに仕上げる。",
        status: ReportStatus.SUBMITTED,
        visitRecords: {
          create: [
            {
              customerId: customers[2].id,
              visitContent: "製品デモを実施。技術部門の担当者も同席し、好評だった。",
              visitOrder: 1,
            },
          ],
        },
      },
    }),
    prisma.dailyReport.upsert({
      where: { userId_reportDate: { userId: sales2.id, reportDate: makeDate(8) } },
      update: {},
      create: {
        userId: sales2.id,
        reportDate: makeDate(8),
        problem: "ベータ社の担当者が転勤になった。新担当者への引き継ぎが必要。",
        plan: "新担当者との面識を作るため、挨拶訪問を設定する。",
        status: ReportStatus.SUBMITTED,
        visitRecords: {
          create: [
            {
              customerId: customers[1].id,
              visitContent: "担当者交代の連絡を受けた。新担当者への引き継ぎ訪問を依頼した。",
              visitOrder: 1,
            },
          ],
        },
      },
    }),
  ]);

  console.warn(`Created ${reports.length} daily reports`);

  // ── コメント（山田部長が提出済み日報にコメント）──────
  const submittedReports = reports.filter(
    (r) => r.status === ReportStatus.SUBMITTED
  );

  if (submittedReports.length > 0) {
    await prisma.comment.create({
      data: {
        reportId: submittedReports[0].id,
        userId: manager.id,
        commentText: "価格交渉の件、来週私も同行します。事前に戦略を打ち合わせましょう。",
      },
    });
    console.warn("Created sample comment");
  }

  console.warn("Seeding completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
