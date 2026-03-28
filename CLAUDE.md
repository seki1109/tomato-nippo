# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**tomato-nippo** is a Sales Daily Report Management System (営業日報システム). This is a Next.js 15 + React 19 + TypeScript web application currently in the specification/pre-implementation phase. All design is documented in `docs/`.

## Commands

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Run production server
npm run lint       # Check ESLint issues
npm run lint:fix   # Auto-fix ESLint issues
```

Testing frameworks are not yet installed. The test spec in `docs/05_test_specifications.md` calls for Jest/Vitest (unit), Jest + Supertest (API), and Playwright (E2E).

## Architecture

### Tech Stack
- **Framework**: Next.js 15 (App Router assumed), React 19, TypeScript 5
- **UIコンポーネント**: shadcn/ui + Tailwind CSS
- **Auth**: JWT Bearer tokens
- **API**: RESTful under `/api/v1`
- **APIスキーマ定義**: OpenAPI
- **Database**: MySQL (schema defined in `docs/02_er_diagram.md`)
- **Databaseスキーマ定義**: Prisma.js
- **テスト**: Vitest

### Domain Model
Five core tables:
- `USER` — employees with roles: `SALES`, `MANAGER`, `ADMIN`
- `CUSTOMER` — company master data
- `DAILY_REPORT` — daily report with status: `DRAFT` → `SUBMITTED`
- `VISIT_RECORD` — multiple visits per report (ordered)
- `COMMENT` — manager comments on reports

### Role-Based Access
- **SALES**: Create/edit own reports only
- **MANAGER**: Read all reports, post/edit/delete comments
- **ADMIN**: Manage customer and user master data

### Screens → Routes
| Screen | Path |
|--------|------|
| Login | `/login` |
| Report list | `/reports` |
| New report | `/reports/new` |
| Report detail/edit | `/reports/:id` |
| Customer list | `/master/customers` |
| Customer form | `/master/customers/:id` |
| User list | `/master/users` |
| User form | `/master/users/:id` |

### API Structure
Base path: `/api/v1`

- `POST /auth/login`, `POST /auth/logout`
- `GET|POST /reports`, `GET|PUT|DELETE /reports/:id`, `PATCH /reports/:id/submit`
- `POST|PUT|DELETE /reports/:id/visit-records/:vid`, `PATCH /reports/:id/visit-records/reorder`
- `POST|PUT|DELETE /reports/:id/comments/:cid`
- `GET|POST|PUT|DELETE /customers`
- `GET|POST|PUT|PATCH /users`

Error response codes: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`

## ESLint Rules (enforced)
- No unused variables (underscore-prefix exception allowed)
- TypeScript strict mode + consistent type imports
- No floating promises
- Import order: builtin → external → internal → parent → sibling → index → type
- No `console.log` (only `console.warn`/`console.error` allowed)
- `const` over `let`; no `var`

## Specs Reference
All implementation details are in `docs/`:
- `01_requirements.md` — feature list (F01–F16)
- `02_er_diagram.md` — DB schema with field types and constraints
- `03_screen_definitions.md` — UI layout and field validation rules
- `04_api_definitions.md` — request/response shapes for all endpoints
- `05_test_specifications.md` — unit, API, and E2E test cases


### 画面設計
@docs/03_screen_definitions.md

### API設計
@docs/04_api_definitions.md

### テスト仕様書
@docs/05_test_specifications.md



