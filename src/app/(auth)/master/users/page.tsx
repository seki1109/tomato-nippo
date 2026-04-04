"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import AuthGuard from "@/components/auth/AuthGuard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";

import type { User } from "@/types";

interface UsersResponse {
  data: { users: User[] };
  message: string;
}

const ROLE_LABELS: Record<string, string> = {
  SALES: "SALES",
  MANAGER: "MANAGER",
  ADMIN: "ADMIN",
};

function UsersContent() {
  const router = useRouter();
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [activeRes, inactiveRes] = await Promise.all([
        fetch("/api/v1/users", {
          headers: { Authorization: `Bearer ${token ?? ""}` },
        }),
        fetch("/api/v1/users?is_active=false", {
          headers: { Authorization: `Bearer ${token ?? ""}` },
        }),
      ]);

      if (!activeRes.ok || !inactiveRes.ok) {
        setError("ユーザー一覧の取得に失敗しました");
        return;
      }

      const [activeJson, inactiveJson] = (await Promise.all([
        activeRes.json(),
        inactiveRes.json(),
      ])) as [UsersResponse, UsersResponse];

      const combined = [...activeJson.data.users, ...inactiveJson.data.users];
      // user_id で重複除去して id 昇順に並べる
      const unique = Array.from(
        new Map(combined.map((u) => [u.user_id, u])).values(),
      ).sort((a, b) => a.user_id - b.user_id);

      setUsers(unique);
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ユーザーマスター</h1>
        <Button onClick={() => router.push("/master/users/new")}>
          + 新規登録
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>氏名</TableHead>
              <TableHead>メールアドレス</TableHead>
              <TableHead>ロール</TableHead>
              <TableHead>状態</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground"
                >
                  ユーザーが見つかりません
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.user_id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{ROLE_LABELS[user.role] ?? user.role}</TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? "default" : "secondary"}>
                      {user.is_active ? "有効" : "無効"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        router.push(`/master/users/${user.user_id}`)
                      }
                    >
                      編集
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

export default function UsersPage() {
  return (
    <AuthGuard allowedRoles={["ADMIN"]}>
      <UsersContent />
    </AuthGuard>
  );
}
