import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url:
      process.env.DATABASE_URL ??
      "mysql://user:password@localhost:3306/tomato_nippo",
  },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
