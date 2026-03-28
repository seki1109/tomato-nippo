# 営業日報システム API定義書

**バージョン:** 1.0
**作成日:** 2026-03-27
**Base URL:** `/api/v1`
**認証方式:** Bearer Token（JWT）

---

## 目次

1. [共通仕様](#1-共通仕様)
2. [認証 API](#2-認証-api)
3. [日報 API](#3-日報-api)
4. [訪問記録 API](#4-訪問記録-api)
5. [コメント API](#5-コメント-api)
6. [顧客マスター API](#6-顧客マスター-api)
7. [ユーザーマスター API](#7-ユーザーマスター-api)

---

## 1. 共通仕様

### リクエストヘッダー

| ヘッダー | 値 | 必須 |
|---|---|---|
| `Content-Type` | `application/json` | ○（POST/PUT/PATCH） |
| `Authorization` | `Bearer {token}` | ○（認証不要エンドポイント以外） |

### レスポンス形式

```json
{
  "data": { ... },
  "message": "success"
}
```

### エラーレスポンス形式

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力値が不正です",
    "details": [
      { "field": "report_date", "message": "日付は必須です" }
    ]
  }
}
```

### HTTPステータスコード

| コード | 意味 |
|---|---|
| 200 | OK |
| 201 | Created |
| 204 | No Content（削除成功） |
| 400 | Bad Request（バリデーションエラー） |
| 401 | Unauthorized（未認証） |
| 403 | Forbidden（権限なし） |
| 404 | Not Found |
| 409 | Conflict（重複など） |
| 500 | Internal Server Error |

### エラーコード一覧

| コード | 説明 |
|---|---|
| `VALIDATION_ERROR` | 入力値の形式・必須チェックエラー |
| `UNAUTHORIZED` | 認証トークンが無効または未指定 |
| `FORBIDDEN` | 操作権限なし |
| `NOT_FOUND` | リソースが存在しない |
| `CONFLICT` | 同日の日報が既に存在する など |

---

## 2. 認証 API

### POST `/auth/login`

ログイン。JWTトークンを返す。

**認証:** 不要

**リクエスト:**

```json
{
  "email": "tanaka@example.com",
  "password": "password123"
}
```

**レスポンス: 200**

```json
{
  "data": {
    "token": "eyJhbGci...",
    "user": {
      "user_id": 1,
      "name": "田中太郎",
      "email": "tanaka@example.com",
      "role": "SALES",
      "department": "東京営業部"
    }
  },
  "message": "success"
}
```

**エラー: 401**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "メールアドレスまたはパスワードが正しくありません"
  }
}
```

---

### POST `/auth/logout`

ログアウト。トークンを無効化する。

**認証:** 必要

**リクエスト:** なし

**レスポンス: 204**

---

## 3. 日報 API

### GET `/reports`

日報一覧を取得する。SALESは自分の日報のみ、MANAGERは全員分を取得。

**認証:** 必要（SALES / MANAGER）

**クエリパラメータ:**

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `user_id` | integer | | 担当者で絞り込み（MANAGERのみ指定可） |
| `year_month` | string | | 年月で絞り込み（例: `2026-03`） |
| `status` | string | | `DRAFT` または `SUBMITTED` |
| `page` | integer | | ページ番号（デフォルト: 1） |
| `per_page` | integer | | 1ページあたりの件数（デフォルト: 20） |

**レスポンス: 200**

```json
{
  "data": {
    "reports": [
      {
        "report_id": 10,
        "report_date": "2026-03-27",
        "status": "SUBMITTED",
        "user": {
          "user_id": 1,
          "name": "田中太郎"
        },
        "updated_at": "2026-03-27T18:30:00Z"
      }
    ],
    "pagination": {
      "total": 50,
      "page": 1,
      "per_page": 20,
      "total_pages": 3
    }
  },
  "message": "success"
}
```

---

### POST `/reports`

日報を新規作成する。

**認証:** 必要（SALES）

**リクエスト:**

```json
{
  "report_date": "2026-03-27",
  "problem": "株式会社△△の担当者が変わり、関係構築が必要。",
  "plan": "株式会社〇〇へ提案資料を送付する。",
  "status": "DRAFT",
  "visit_records": [
    {
      "customer_id": 5,
      "visit_content": "新製品の提案を実施。前向きな反応。",
      "visit_order": 1
    },
    {
      "customer_id": 8,
      "visit_content": "契約更新の打ち合わせ。来週返答予定。",
      "visit_order": 2
    }
  ]
}
```

**レスポンス: 201**

```json
{
  "data": {
    "report_id": 10,
    "report_date": "2026-03-27",
    "status": "DRAFT",
    "problem": "株式会社△△の担当者が変わり、関係構築が必要。",
    "plan": "株式会社〇〇へ提案資料を送付する。",
    "user": {
      "user_id": 1,
      "name": "田中太郎"
    },
    "visit_records": [
      {
        "visit_id": 20,
        "customer": { "customer_id": 5, "company_name": "株式会社〇〇" },
        "visit_content": "新製品の提案を実施。前向きな反応。",
        "visit_order": 1
      }
    ],
    "comments": [],
    "created_at": "2026-03-27T17:00:00Z",
    "updated_at": "2026-03-27T17:00:00Z"
  },
  "message": "success"
}
```

**エラー: 409**（同日の日報が既に存在）

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "2026-03-27 の日報は既に存在します"
  }
}
```

---

### GET `/reports/:report_id`

日報の詳細を取得する。

**認証:** 必要（SALES: 自分の日報のみ / MANAGER: 全員分）

**レスポンス: 200**

```json
{
  "data": {
    "report_id": 10,
    "report_date": "2026-03-27",
    "status": "SUBMITTED",
    "problem": "株式会社△△の担当者が変わり、関係構築が必要。",
    "plan": "株式会社〇〇へ提案資料を送付する。",
    "user": {
      "user_id": 1,
      "name": "田中太郎",
      "department": "東京営業部"
    },
    "visit_records": [
      {
        "visit_id": 20,
        "customer": { "customer_id": 5, "company_name": "株式会社〇〇" },
        "visit_content": "新製品の提案を実施。前向きな反応。",
        "visit_order": 1
      }
    ],
    "comments": [
      {
        "comment_id": 3,
        "comment_text": "△△社の件、来週フォローアップ頼みます。",
        "user": { "user_id": 2, "name": "山田部長" },
        "created_at": "2026-03-27T19:00:00Z"
      }
    ],
    "created_at": "2026-03-27T17:00:00Z",
    "updated_at": "2026-03-27T18:30:00Z"
  },
  "message": "success"
}
```

---

### PUT `/reports/:report_id`

日報を更新する。ステータスが `DRAFT` の場合のみ可能。

**認証:** 必要（SALES: 自分の日報のみ）

**リクエスト:**

```json
{
  "problem": "修正した課題内容",
  "plan": "修正した翌日計画",
  "status": "DRAFT"
}
```

**レスポンス: 200** — 更新後の日報詳細（GET `/reports/:report_id` と同形式）

**エラー: 403**（SUBMITTED の日報を編集しようとした場合）

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "提出済みの日報は編集できません"
  }
}
```

---

### PATCH `/reports/:report_id/submit`

日報を提出する（DRAFT → SUBMITTED）。

**認証:** 必要（SALES: 自分の日報のみ）

**リクエスト:** なし

**レスポンス: 200**

```json
{
  "data": {
    "report_id": 10,
    "status": "SUBMITTED",
    "updated_at": "2026-03-27T18:30:00Z"
  },
  "message": "success"
}
```

---

### DELETE `/reports/:report_id`

日報を削除する。ステータスが `DRAFT` の場合のみ可能。

**認証:** 必要（SALES: 自分の日報のみ）

**レスポンス: 204**

---

## 4. 訪問記録 API

### POST `/reports/:report_id/visit-records`

訪問記録を1件追加する。

**認証:** 必要（SALES: 自分の日報のみ）

**リクエスト:**

```json
{
  "customer_id": 12,
  "visit_content": "新規開拓の挨拶訪問。担当者と名刺交換。",
  "visit_order": 3
}
```

**レスポンス: 201**

```json
{
  "data": {
    "visit_id": 25,
    "customer": { "customer_id": 12, "company_name": "株式会社新規" },
    "visit_content": "新規開拓の挨拶訪問。担当者と名刺交換。",
    "visit_order": 3,
    "created_at": "2026-03-27T17:30:00Z"
  },
  "message": "success"
}
```

---

### PUT `/reports/:report_id/visit-records/:visit_id`

訪問記録を更新する。

**認証:** 必要（SALES: 自分の日報のみ）

**リクエスト:**

```json
{
  "customer_id": 12,
  "visit_content": "修正した訪問内容。",
  "visit_order": 3
}
```

**レスポンス: 200** — 更新後の訪問記録（POST と同形式）

---

### DELETE `/reports/:report_id/visit-records/:visit_id`

訪問記録を削除する。

**認証:** 必要（SALES: 自分の日報のみ）

**レスポンス: 204**

---

### PATCH `/reports/:report_id/visit-records/reorder`

訪問記録の並び順を一括更新する。

**認証:** 必要（SALES: 自分の日報のみ）

**リクエスト:**

```json
{
  "orders": [
    { "visit_id": 20, "visit_order": 1 },
    { "visit_id": 25, "visit_order": 2 },
    { "visit_id": 21, "visit_order": 3 }
  ]
}
```

**レスポンス: 200**

```json
{
  "data": null,
  "message": "success"
}
```

---

## 5. コメント API

### POST `/reports/:report_id/comments`

コメントを投稿する。

**認証:** 必要（MANAGER）

**リクエスト:**

```json
{
  "comment_text": "△△社の件、来週フォローアップ頼みます。"
}
```

**レスポンス: 201**

```json
{
  "data": {
    "comment_id": 3,
    "comment_text": "△△社の件、来週フォローアップ頼みます。",
    "user": { "user_id": 2, "name": "山田部長" },
    "created_at": "2026-03-27T19:00:00Z",
    "updated_at": "2026-03-27T19:00:00Z"
  },
  "message": "success"
}
```

---

### PUT `/reports/:report_id/comments/:comment_id`

コメントを更新する。自分が投稿したコメントのみ可能。

**認証:** 必要（MANAGER）

**リクエスト:**

```json
{
  "comment_text": "修正したコメント内容。"
}
```

**レスポンス: 200** — 更新後のコメント（POST と同形式）

---

### DELETE `/reports/:report_id/comments/:comment_id`

コメントを削除する。自分が投稿したコメントのみ可能。

**認証:** 必要（MANAGER）

**レスポンス: 204**

---

## 6. 顧客マスター API

### GET `/customers`

顧客一覧を取得する。

**認証:** 必要（全ロール）

**クエリパラメータ:**

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `q` | string | | 会社名・担当者名で部分一致検索 |
| `page` | integer | | ページ番号（デフォルト: 1） |
| `per_page` | integer | | 件数（デフォルト: 50） |

**レスポンス: 200**

```json
{
  "data": {
    "customers": [
      {
        "customer_id": 5,
        "company_name": "株式会社〇〇",
        "contact_person": "佐藤一郎",
        "phone": "03-0000-0000",
        "address": "東京都千代田区..."
      }
    ],
    "pagination": {
      "total": 120,
      "page": 1,
      "per_page": 50,
      "total_pages": 3
    }
  },
  "message": "success"
}
```

---

### POST `/customers`

顧客を新規登録する。

**認証:** 必要（ADMIN）

**リクエスト:**

```json
{
  "company_name": "株式会社新規",
  "contact_person": "鈴木花子",
  "phone": "03-1111-2222",
  "address": "東京都港区..."
}
```

**レスポンス: 201**

```json
{
  "data": {
    "customer_id": 30,
    "company_name": "株式会社新規",
    "contact_person": "鈴木花子",
    "phone": "03-1111-2222",
    "address": "東京都港区...",
    "is_active": true,
    "created_at": "2026-03-27T10:00:00Z",
    "updated_at": "2026-03-27T10:00:00Z"
  },
  "message": "success"
}
```

---

### PUT `/customers/:customer_id`

顧客情報を更新する。

**認証:** 必要（ADMIN）

**リクエスト:**

```json
{
  "company_name": "株式会社〇〇（更新）",
  "contact_person": "佐藤次郎",
  "phone": "03-0000-9999",
  "address": "東京都新宿区..."
}
```

**レスポンス: 200** — 更新後の顧客情報（POST と同形式）

---

### DELETE `/customers/:customer_id`

顧客を論理削除する（`is_active = false`）。

**認証:** 必要（ADMIN）

**レスポンス: 204**

---

## 7. ユーザーマスター API

### GET `/users`

ユーザー一覧を取得する。

**認証:** 必要（ADMIN）

**クエリパラメータ:**

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `role` | string | | `SALES` / `MANAGER` / `ADMIN` で絞り込み |
| `is_active` | boolean | | 有効フラグで絞り込み（デフォルト: true） |

**レスポンス: 200**

```json
{
  "data": {
    "users": [
      {
        "user_id": 1,
        "name": "田中太郎",
        "email": "tanaka@example.com",
        "role": "SALES",
        "department": "東京営業部",
        "is_active": true,
        "created_at": "2026-01-01T00:00:00Z"
      }
    ]
  },
  "message": "success"
}
```

---

### POST `/users`

ユーザーを新規登録する。

**認証:** 必要（ADMIN）

**リクエスト:**

```json
{
  "name": "田中太郎",
  "email": "tanaka@example.com",
  "password": "password123",
  "role": "SALES",
  "department": "東京営業部"
}
```

**レスポンス: 201**

```json
{
  "data": {
    "user_id": 10,
    "name": "田中太郎",
    "email": "tanaka@example.com",
    "role": "SALES",
    "department": "東京営業部",
    "is_active": true,
    "created_at": "2026-03-27T10:00:00Z",
    "updated_at": "2026-03-27T10:00:00Z"
  },
  "message": "success"
}
```

**エラー: 409**（メールアドレス重複）

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "このメールアドレスは既に使用されています"
  }
}
```

---

### PUT `/users/:user_id`

ユーザー情報を更新する。

**認証:** 必要（ADMIN）

**リクエスト:**

```json
{
  "name": "田中太郎",
  "email": "tanaka@example.com",
  "role": "MANAGER",
  "department": "東京営業部",
  "is_active": true
}
```

**レスポンス: 200** — 更新後のユーザー情報（POST と同形式）

---

### PATCH `/users/:user_id/password`

パスワードを変更する。

**認証:** 必要（ADMIN）

**リクエスト:**

```json
{
  "new_password": "newPassword456"
}
```

**レスポンス: 204**

---

## API エンドポイント一覧

| メソッド | エンドポイント | 説明 | 権限 |
|---|---|---|---|
| POST | `/auth/login` | ログイン | 全員 |
| POST | `/auth/logout` | ログアウト | 全員 |
| GET | `/reports` | 日報一覧 | SALES / MANAGER |
| POST | `/reports` | 日報作成 | SALES |
| GET | `/reports/:id` | 日報詳細 | SALES / MANAGER |
| PUT | `/reports/:id` | 日報更新 | SALES |
| PATCH | `/reports/:id/submit` | 日報提出 | SALES |
| DELETE | `/reports/:id` | 日報削除 | SALES |
| POST | `/reports/:id/visit-records` | 訪問記録追加 | SALES |
| PUT | `/reports/:id/visit-records/:vid` | 訪問記録更新 | SALES |
| DELETE | `/reports/:id/visit-records/:vid` | 訪問記録削除 | SALES |
| PATCH | `/reports/:id/visit-records/reorder` | 訪問記録並び替え | SALES |
| POST | `/reports/:id/comments` | コメント投稿 | MANAGER |
| PUT | `/reports/:id/comments/:cid` | コメント更新 | MANAGER |
| DELETE | `/reports/:id/comments/:cid` | コメント削除 | MANAGER |
| GET | `/customers` | 顧客一覧 | 全員 |
| POST | `/customers` | 顧客登録 | ADMIN |
| PUT | `/customers/:id` | 顧客更新 | ADMIN |
| DELETE | `/customers/:id` | 顧客削除（論理） | ADMIN |
| GET | `/users` | ユーザー一覧 | ADMIN |
| POST | `/users` | ユーザー登録 | ADMIN |
| PUT | `/users/:id` | ユーザー更新 | ADMIN |
| PATCH | `/users/:id/password` | パスワード変更 | ADMIN |
