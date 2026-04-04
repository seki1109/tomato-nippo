"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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

import type { Role, User } from "@/types";

interface FieldErrors {
  name?: string;
  email?: string;
  role?: string;
  department?: string;
}

interface UsersResponse {
  data: { users: User[] };
  message: string;
}

interface ErrorResponse {
  error: { code: string; message: string; details?: { field: string; message: string }[] };
}

function EditUserContent() {
  const router = useRouter();
  const params = useParams();
  const { token, user: authUser } = useAuth();
  const userId = Number(params.id);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [department, setDepartment] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchUser = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      // 有効・無効の両方を取得して該当ユーザーを探す
      const [activeRes, inactiveRes] = await Promise.all([
        fetch("/api/v1/users", {
          headers: { Authorization: `Bearer ${token ?? ""}` },
        }),
        fetch("/api/v1/users?is_active=false", {
          headers: { Authorization: `Bearer ${token ?? ""}` },
        }),
      ]);

      if (!activeRes.ok || !inactiveRes.ok) {
        setLoadError("ユーザー情報の取得に失敗しました");
        return;
      }

      const [activeJson, inactiveJson] = (await Promise.all([
        activeRes.json(),
        inactiveRes.json(),
      ])) as [UsersResponse, UsersResponse];

      const allUsers = [...activeJson.data.users, ...inactiveJson.data.users];
      const found = allUsers.find((u) => u.user_id === userId);

      if (!found) {
        setLoadError("ユーザーが見つかりません");
        return;
      }

      setName(found.name);
      setEmail(found.email);
      setRole(found.role);
      setDepartment(found.department ?? "");
      setIsActive(found.is_active);
    } catch {
      setLoadError("通信エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  }, [token, userId]);

  useEffect(() => {
    void fetchUser();
  }, [fetchUser]);

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

    // 自分自身を無効化しようとしている場合はクライアント側でも警告
    if (authUser?.user_id === userId && !isActive) {
      setApiError("自分自身を無効化することはできません");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? ""}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          role,
          department: department.trim() || undefined,
          is_active: isActive,
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

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">読み込み中...</p>;
  }

  if (loadError) {
    return <p className="text-sm text-destructive">{loadError}</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ユーザー編集</h1>

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

        {/* 有効フラグ */}
        <div className="flex items-center gap-3">
          <label htmlFor="is-active" className="text-sm font-medium">
            有効フラグ
          </label>
          <button
            id="is-active"
            type="button"
            role="switch"
            aria-checked={isActive}
            disabled={submitting}
            onClick={() => setIsActive((prev) => !prev)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
              isActive ? "bg-primary" : "bg-input"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                isActive ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <span className="text-sm text-muted-foreground">
            {isActive ? "有効" : "無効"}
          </span>
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

export default function EditUserPage() {
  return (
    <AuthGuard allowedRoles={["ADMIN"]}>
      <EditUserContent />
    </AuthGuard>
  );
}
