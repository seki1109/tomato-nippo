"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";

import type { DailyReportSummary, User } from "@/types";

interface ReportsData {
  reports: DailyReportSummary[];
  pagination: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
}

const FILTER_ALL = "all";

function formatUpdatedAt(isoString: string): string {
  const d = new Date(isoString);
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  if (isToday) {
    return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ReportsPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [reportsData, setReportsData] = useState<ReportsData | null>(null);
  const [salesUsers, setSalesUsers] = useState<Pick<User, "user_id" | "name">[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [filterUserId, setFilterUserId] = useState(
    searchParams.get("user_id") ?? FILTER_ALL,
  );
  const [filterYearMonth, setFilterYearMonth] = useState(
    searchParams.get("year_month") ?? "",
  );
  const [filterStatus, setFilterStatus] = useState(
    searchParams.get("status") ?? FILTER_ALL,
  );

  const isManager = user?.role === "MANAGER";
  const currentPage = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  // MANAGERの場合、担当者フィルター用にユーザー一覧を取得
  useEffect(() => {
    if (!isManager || !token) return;

    fetch("/api/v1/users?is_active=true", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(
        (r) =>
          r.json() as Promise<{
            data: { users: Pick<User, "user_id" | "name">[] };
          }>,
      )
      .then((json) => {
        setSalesUsers(json.data.users);
      })
      .catch((err: unknown) => {
        console.warn("ユーザー一覧の取得に失敗しました:", err);
      });
  }, [isManager, token]);

  const fetchReports = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    setError("");

    const params = new URLSearchParams();
    const userId = searchParams.get("user_id");
    const yearMonth = searchParams.get("year_month");
    const status = searchParams.get("status");
    const page = searchParams.get("page") ?? "1";

    if (userId) params.set("user_id", userId);
    if (yearMonth) params.set("year_month", yearMonth);
    if (status) params.set("status", status);
    params.set("page", page);

    try {
      const res = await fetch(`/api/v1/reports?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setError("日報の取得に失敗しました");
        return;
      }

      const json = (await res.json()) as { data: ReportsData };
      setReportsData(json.data);
    } catch (err: unknown) {
      console.warn("日報取得エラー:", err);
      setError("通信エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  }, [token, searchParams]);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  // URLのクエリパラメータが変わったらフォーム状態を同期
  useEffect(() => {
    setFilterUserId(searchParams.get("user_id") ?? FILTER_ALL);
    setFilterYearMonth(searchParams.get("year_month") ?? "");
    setFilterStatus(searchParams.get("status") ?? FILTER_ALL);
  }, [searchParams]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (filterUserId && filterUserId !== FILTER_ALL) {
      params.set("user_id", filterUserId);
    }
    if (filterYearMonth) params.set("year_month", filterYearMonth);
    if (filterStatus && filterStatus !== FILTER_ALL) {
      params.set("status", filterStatus);
    }
    params.set("page", "1");
    router.push(`/reports?${params.toString()}`);
  }

  function buildPageUrl(page: number): string {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    return `/reports?${params.toString()}`;
  }

  const totalPages = reportsData?.pagination.total_pages ?? 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">日報一覧</h1>
        {user?.role === "SALES" && (
          <Button asChild>
            <Link href="/reports/new">
              <Plus className="mr-1 h-4 w-4" />
              新規作成
            </Link>
          </Button>
        )}
      </div>

      {/* 絞り込みフォーム */}
      <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3">
        {isManager && (
          <div className="space-y-1">
            <label className="text-sm font-medium">担当者</label>
            <Select value={filterUserId} onValueChange={setFilterUserId}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="全員" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={FILTER_ALL}>全員</SelectItem>
                {salesUsers.map((u) => (
                  <SelectItem key={u.user_id} value={String(u.user_id)}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium">年月</label>
          <Input
            type="month"
            value={filterYearMonth}
            onChange={(e) => setFilterYearMonth(e.target.value)}
            className="w-36"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">ステータス</label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="全て" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ALL}>全て</SelectItem>
              <SelectItem value="DRAFT">下書き</SelectItem>
              <SelectItem value="SUBMITTED">提出済み</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button type="submit">検索</Button>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日付</TableHead>
                  {isManager && <TableHead>担当者</TableHead>}
                  <TableHead>ステータス</TableHead>
                  <TableHead>更新日時</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!reportsData || reportsData.reports.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={isManager ? 4 : 3}
                      className="text-center text-muted-foreground"
                    >
                      日報がありません
                    </TableCell>
                  </TableRow>
                ) : (
                  reportsData.reports.map((report) => (
                    <TableRow
                      key={report.report_id}
                      className="cursor-pointer"
                      onClick={() =>
                        router.push(`/reports/${report.report_id}`)
                      }
                    >
                      <TableCell>{report.report_date}</TableCell>
                      {isManager && (
                        <TableCell>{report.user.name}</TableCell>
                      )}
                      <TableCell>
                        {report.status === "SUBMITTED" ? (
                          <Badge className="bg-green-600 text-white hover:bg-green-600/80">
                            提出済み
                          </Badge>
                        ) : (
                          <Badge variant="secondary">下書き</Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatUpdatedAt(report.updated_at)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href={currentPage > 1 ? buildPageUrl(currentPage - 1) : "#"}
                    aria-disabled={currentPage <= 1}
                    className={
                      currentPage <= 1 ? "pointer-events-none opacity-50" : ""
                    }
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="flex h-9 items-center px-4 text-sm">
                    {currentPage} / {totalPages}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href={
                      currentPage < totalPages
                        ? buildPageUrl(currentPage + 1)
                        : "#"
                    }
                    aria-disabled={currentPage >= totalPages}
                    className={
                      currentPage >= totalPages
                        ? "pointer-events-none opacity-50"
                        : ""
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </div>
  );
}
