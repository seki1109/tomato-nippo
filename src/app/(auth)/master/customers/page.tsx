"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import AuthGuard from "@/components/auth/AuthGuard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";

interface CustomerRow {
  customer_id: number;
  company_name: string;
  contact_person: string | null;
  phone: string | null;
}

function CustomersPageContent() {
  const { token } = useAuth();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<CustomerRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const fetchCustomers = useCallback(
    async (q: string) => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ per_page: "100" });
        if (q) params.set("q", q);
        const res = await fetch(`/api/v1/customers?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setError("顧客一覧の取得に失敗しました。");
          return;
        }
        const json = (await res.json()) as {
          data: { customers: CustomerRow[] };
        };
        setCustomers(json.data.customers);
      } catch {
        setError("通信エラーが発生しました。");
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    void fetchCustomers(query);
  }, [fetchCustomers, query]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setQuery(searchInput);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(
        `/api/v1/customers/${deleteTarget.customer_id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        setDeleteTarget(null);
        void fetchCustomers(query);
      } else {
        setDeleteError("削除に失敗しました。もう一度お試しください。");
      }
    } catch {
      setDeleteError("通信エラーが発生しました。");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">顧客マスター</h1>
        <Button asChild>
          <Link href="/master/customers/new">+ 新規登録</Link>
        </Button>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          placeholder="会社名・担当者名で検索"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="max-w-sm"
        />
        <Button type="submit" variant="outline" size="icon">
          <Search className="h-4 w-4" />
          <span className="sr-only">検索</span>
        </Button>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>会社名</TableHead>
                <TableHead>担当者名</TableHead>
                <TableHead>電話番号</TableHead>
                <TableHead className="w-32">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground"
                  >
                    顧客が見つかりません
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow key={customer.customer_id}>
                    <TableCell className="font-medium">
                      {customer.company_name}
                    </TableCell>
                    <TableCell>{customer.contact_person ?? "—"}</TableCell>
                    <TableCell>{customer.phone ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link
                            href={`/master/customers/${customer.customer_id}`}
                          >
                            編集
                          </Link>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setDeleteError("");
                            setDeleteTarget(customer);
                          }}
                        >
                          削除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>顧客の削除</DialogTitle>
            <DialogDescription>
              「{deleteTarget?.company_name}」を削除しますか？この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p className="text-sm text-destructive">{deleteError}</p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={deleting}
            >
              {deleting ? "削除中..." : "削除する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CustomersPage() {
  return (
    <AuthGuard allowedRoles={["ADMIN"]}>
      <CustomersPageContent />
    </AuthGuard>
  );
}
