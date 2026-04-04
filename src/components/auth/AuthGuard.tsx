"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/contexts/AuthContext";

import type { Role } from "@/types";

interface AuthGuardProps {
  allowedRoles: Role[];
  children: React.ReactNode;
}

/**
 * クライアントサイドの認証・ロールガード。
 * Next.js Middleware による保護に加えてクライアント側でも二重にチェックする。
 *
 * - ローディング中はコンテンツを描画しない
 * - 未認証 → /login へリダイレクト
 * - ロール不一致 → /unauthorized へリダイレクト
 */
export default function AuthGuard({ allowedRoles, children }: AuthGuardProps) {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      router.replace("/unauthorized");
    }
  }, [user, isLoading, allowedRoles, router]);

  if (isLoading || !user || !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
