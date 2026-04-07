# tomato-nippo — 営業日報システム

Next.js 15 + React 19 + TypeScript で構築した営業日報管理 Web アプリケーションです。

## 技術スタック

| カテゴリ | 使用技術 |
|---|---|
| フレームワーク | Next.js 15 (App Router), React 19, TypeScript 5 |
| UI | shadcn/ui, Tailwind CSS |
| 認証 | JWT (jose) |
| データベース | MySQL / MariaDB |
| ORM | Prisma |
| 単体テスト | Vitest |
| APIテスト | Vitest + Supertest |
| E2Eテスト | Playwright |

## 主な機能

- **日報管理**: 営業担当者が日報を作成・提出。上長が全担当者の日報を閲覧
- **コメント**: 上長（MANAGER）が日報にコメントを投稿・編集・削除
- **顧客マスター**: 管理者（ADMIN）が顧客情報を管理
- **ユーザーマスター**: 管理者がユーザーを登録・ロール変更・有効/無効を管理

## ロール

| ロール | 権限 |
|---|---|
| SALES | 自分の日報の作成・編集・提出・削除 |
| MANAGER | 全日報の閲覧、コメントの投稿・編集・削除 |
| ADMIN | 顧客マスター・ユーザーマスターの管理 |

## セットアップ

### 前提条件

- Node.js 20 以上
- MySQL / MariaDB

### インストール

```bash
npm install
```

### 環境変数

`.env` ファイルを作成し、以下を設定してください。

```env
DATABASE_URL="mysql://user:password@localhost:3306/tomato_nippo"
JWT_SECRET="your-secret-key"
```

### データベースセットアップ

```bash
# マイグレーション実行
npm run db:migrate

# 初期データ投入
npm run db:seed
```

### 開発サーバー起動

```bash
npm run dev
```

http://localhost:3000 でアプリケーションが起動します。

## コマンド

```bash
npm run dev            # 開発サーバー起動
npm run build          # 本番ビルド
npm run start          # 本番サーバー起動
npm run lint           # ESLint チェック
npm run lint:fix       # ESLint 自動修正

npm run test           # 単体テスト実行
npm run test:watch     # 単体テスト（ウォッチモード）
npm run test:api       # APIテスト実行
npm run test:api:watch # APIテスト（ウォッチモード）
npm run test:e2e       # E2Eテスト実行
npm run test:e2e:ui    # E2EテストUI起動
npm run test:e2e:headed # E2Eテスト（ブラウザ表示あり）

npm run db:migrate     # DBマイグレーション
npm run db:seed        # 初期データ投入
npm run db:studio      # Prisma Studio 起動
npm run db:generate    # Prisma Client 生成
```

## 画面一覧

| 画面 | URL | 対象ロール |
|---|---|---|
| ログイン | `/login` | 全員 |
| 日報一覧 | `/reports` | SALES / MANAGER |
| 日報作成 | `/reports/new` | SALES |
| 日報詳細・編集 | `/reports/:id` | SALES / MANAGER |
| 顧客マスター一覧 | `/master/customers` | ADMIN |
| 顧客マスター登録・編集 | `/master/customers/:id` | ADMIN |
| ユーザーマスター一覧 | `/master/users` | ADMIN |
| ユーザーマスター登録・編集 | `/master/users/:id` | ADMIN |

## API

Base URL: `/api/v1`  
認証方式: `Authorization: Bearer {JWT}`

詳細は [`docs/04_api_definitions.md`](docs/04_api_definitions.md) を参照してください。

## ドキュメント

| ファイル | 内容 |
|---|---|
| [`docs/01_requirements.md`](docs/01_requirements.md) | 要件定義 |
| [`docs/02_er_diagram.md`](docs/02_er_diagram.md) | ER図・DBスキーマ |
| [`docs/03_screen_definitions.md`](docs/03_screen_definitions.md) | 画面定義書 |
| [`docs/04_api_definitions.md`](docs/04_api_definitions.md) | API定義書 |
| [`docs/05_test_specifications.md`](docs/05_test_specifications.md) | テスト仕様書 |
