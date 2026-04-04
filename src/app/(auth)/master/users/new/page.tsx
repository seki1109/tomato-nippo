"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import AuthGuard from "@/components/auth/AuthGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";

import type { Role } from "@/types";

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
  department?: string;
}

interface ErrorResponse {
  error: { code: string; message: string; details?: { field: string; message: string }[] };
}

function NewUserContent() {
  const router = useRouter();
  const { token } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [department, setDepartment] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const next: FieldErrors = {};

    if (!name.trim()) {
      next.name = "氏名は必須です";
    } else if (name.length > 100) {
      next.name = "氏名は100文字以内で入力してください";
    }

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      next.email = "メールアドレスは必須です";
    } else if (!EMAIL_REGEX.test(email)) {
      next.email = "メールアドレスの形式で入力してください";
    }

    if (!password) {
      next.password = "パスワードは必須です";
    } else if (password.length < 8) {
      next.password = "パスワードは8文字以上で入力してください";
    } else if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      next.password = "パスワードは英字と数字を混在させてください";
    }

    if (!role) {
      next.role = "ロールは必須です";
    }

    if (department.length > 100) {
      next.department = "部署名は100文字以内で入力してください";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError("");

    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? ""}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
          department: department.trim() || undefined,
        }),
      });

      if (res.ok) {
        router.push("/master/users");
        return;
      }

      const json = (await res.json()) as ErrorResponse;
      if (res.status === 409) {
        setErrors({ email: json.error.message });
      } else if (res.status === 400 && json.error.details) {
        const next: FieldErrors = {};
        for (const d of json.error.details) {
          (next as Record<string, string>)[d.field] = d.message;
        }
        setErrors(next);
      } else {
        setApiError(json.error?.message ?? "保存に失敗しました");
      }
    } catch {
      setApiError("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ユーザー登録</h1>

      <form onSubmit={handleSubmit} noValidate className="max-w-lg space-y-4">
        {/* 氏名 */}
        <div className="space-y-1">
          <label htmlFor="name" className="text-sm font-medium">
            氏名 <span className="text-destructive">*</span>
          </label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name}</p>
          )}
        </div>

        {/* メールアドレス */}
        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium">
            メールアドレス <span className="text-destructive">*</span>
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
            disabled={submitting}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email}</p>
          )}
        </div>

        {/* パスワード */}
        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium">
            パスワード <span className="text-destructive">*</span>
          </label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            disabled={submitting}
          />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password}</p>
          )}
        </div>

        {/* ロール */}
        <div className="space-y-1">
          <label htmlFor="role" className="text-sm font-medium">
            ロール <span className="text-destructive">*</span>
          </label>
          <Select
            value={role}
            onValueChange={(v) => setRole(v as Role)}
            disabled={submitting}
          >
            <SelectTrigger id="role">
              <SelectValue placeholder="選択してください" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SALES">SALES</SelectItem>
              <SelectItem value="MANAGER">MANAGER</SelectItem>
              <SelectItem value="ADMIN">ADMIN</SelectItem>
            </SelectContent>
          </Select>
          {errors.role && (
            <p className="text-sm text-destructive">{errors.role}</p>
          )}
        </div>

        {/* 部署名 */}
        <div className="space-y-1">
          <label htmlFor="department" className="text-sm font-medium">
            部署名
          </label>
          <Input
            id="department"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            disabled={submitting}
          />
          {errors.department && (
            <p className="text-sm text-destructive">{errors.department}</p>
          )}
        </div>

        {apiError && <p className="text-sm text-destructive">{apiError}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? "保存中..." : "保存"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => router.push("/master/users")}
          >
            キャンセル
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function NewUserPage() {
  return (
    <AuthGuard allowedRoles={["ADMIN"]}>
      <NewUserContent />
    </AuthGuard>
  );
}
