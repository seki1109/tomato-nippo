"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";

import type { AuthUser } from "@/types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface LoginResponse {
  data: {
    token: string;
    user: AuthUser;
  };
  message: string;
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading, setAuth } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [apiError, setApiError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/reports");
    }
  }, [isLoading, user, router]);

  function validate(): boolean {
    let valid = true;
    setEmailError("");
    setPasswordError("");

    if (!email) {
      setEmailError("メールアドレスは必須です");
      valid = false;
    } else if (!EMAIL_REGEX.test(email)) {
      setEmailError("メールアドレスの形式で入力してください");
      valid = false;
    }

    if (!password) {
      setPasswordError("パスワードは必須です");
      valid = false;
    } else if (password.length < 8) {
      setPasswordError("パスワードは8文字以上で入力してください");
      valid = false;
    }

    return valid;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError("");

    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const json = (await res.json()) as LoginResponse;
        setAuth(json.data.user, json.data.token);
        router.push("/reports");
      } else {
        const json = (await res.json()) as ErrorResponse;
        setApiError(
          json.error?.message ?? "ログインに失敗しました。もう一度お試しください。",
        );
      }
    } catch {
      setApiError("通信エラーが発生しました。もう一度お試しください。");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-sm text-muted-foreground">読み込み中...</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 rounded-lg border p-8 shadow-sm">
        <h1 className="text-center text-2xl font-bold">営業日報システム</h1>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">
              メールアドレス
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={submitting}
            />
            {emailError && (
              <p className="text-sm text-destructive">{emailError}</p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">
              パスワード
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={submitting}
            />
            {passwordError && (
              <p className="text-sm text-destructive">{passwordError}</p>
            )}
          </div>

          {apiError && (
            <p className="text-sm text-destructive">{apiError}</p>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "ログイン中..." : "ログイン"}
          </Button>
        </form>
      </div>
    </div>
  );
}
