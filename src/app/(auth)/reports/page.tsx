"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

import type { DailyReportSummary } from "@/types/report";

interface Pagination {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

interface ReportsApiResponse {
  data: {
    reports: DailyReportSummary[];
    pagination: Pagination;
  };
  message: string;
}

function generateYearMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${d.getFullYear()}年${d.getMonth() + 1}月`;
    options.push({ value, label });
  }
  return options;
}

function formatDate(dateStr: string): string {
  return dateStr.replace(/-/g, "/");
}

function formatDateTime(isoStr: string): string {
  const d = new Date(isoStr);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

const YEAR_MONTH_OPTIONS = generateYearMonthOptions();

export default function ReportsPage() {
  const router = useRouter();
  const { user, token } = useAuth();

  const isManager = user?.role === "MANAGER";
  const isSales = user?.role === "SALES";

  const [reports, setReports] = useState<DailyReportSummary[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    per_page: 20,
    total_pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // フィルター状態
  const [filterUserId, setFilterUserId] = useState<string>("all");
  const [filterYearMonth, setFilterYearMonth] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [page, setPage] = useState(1);

  // MANAGER用担当者一覧（ロードしたレポートから収集）
  const [userOptions, setUserOptions] = useState<
    { user_id: number; name: string }[]
  >([]);

  const fetchReports = useCallback(
    async (
      currentPage: number,
      userId: string,
      yearMonth: string,
      status: string,
    ) => {
      if (!token) return;
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        params.set("page", String(currentPage));
        if (isManager && userId && userId !== "all") params.set("user_id", userId);
        if (yearMonth && yearMonth !== "all") params.set("year_month", yearMonth);
        if (status && status !== "all") params.set("status", status);

        const res = await fetch(`/api/v1/reports?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = (await res.json()) as ReportsApiResponse;
          setReports(json.data.reports);
          setPagination(json.data.pagination);

          // MANAGERの場合、担当者一覧を更新（重複排除）
          if (isManager) {
            setUserOptions((prev) => {
              const map = new Map(prev.map((u) => [u.user_id, u]));
              json.data.reports.forEach((r) => {
                map.set(r.user.user_id, r.user);
              });
              return Array.from(map.values()).sort((a, b) =>
                a.name.localeCompare(b.name, "ja"),
              );
            });
          }
        } else if (res.status === 403) {
          router.replace("/unauthorized");
        } else {
          setError("日報一覧の取得に失敗しました");
        }
      } catch {
        setError("通信エラーが発生しました");
      } finally {
        setLoading(false);
      }
    },
    [token, isManager, router],
  );

  useEffect(() => {
    void fetchReports(page, filterUserId, filterYearMonth, filterStatus);
  }, [fetchReports, page, filterUserId, filterYearMonth, filterStatus]);

  function handleSearch() {
    setPage(1);
    void fetchReports(1, filterUserId, filterYearMonth, filterStatus);
  }

  const totalPages = pagination.total_pages;

  const canGoNext = page < totalPages;
  const canGoPrev = page > 1;

  const pageLabel = useMemo(
    () => `${page} / ${totalPages}`,
    [page, totalPages],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">日報一覧</h1>
        {isSales && (
          <Button onClick={() => router.push("/reports/new")}>
            + 新規作成
          </Button>
        )}
      </div>

      {/* フィルター */}
      <div className="flex flex-wrap items-center gap-2">
        {isManager && (
          <Select value={filterUserId} onValueChange={setFilterUserId}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="担当者" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全員</SelectItem>
              {userOptions.map((u) => (
                <SelectItem key={u.user_id} value={String(u.user_id)}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={filterYearMonth} onValueChange={setFilterYearMonth}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="年月" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全期間</SelectItem>
            {YEAR_MONTH_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="ステータス" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全て</SelectItem>
            <SelectItem value="DRAFT">下書き</SelectItem>
            <SelectItem value="SUBMITTED">提出済み</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={handleSearch}>
          検索
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="text-sm text-muted-foreground">読み込み中...</span>
        </div>
      ) : reports.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <span className="text-sm text-muted-foreground">
            日報が見つかりません
          </span>
        </div>
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
                {reports.map((report) => (
                  <TableRow
                    key={report.report_id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/reports/${report.report_id}`)}
                  >
                    <TableCell>{formatDate(report.report_date)}</TableCell>
                    {isManager && <TableCell>{report.user.name}</TableCell>}
                    <TableCell>
                      <Badge
                        variant={
                          report.status === "SUBMITTED" ? "default" : "secondary"
                        }
                      >
                        {report.status === "SUBMITTED" ? "提出済み" : "下書き"}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDateTime(report.updated_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="sm"
                disabled={!canGoPrev}
                onClick={() => setPage((p) => p - 1)}
              >
                &lt; 前へ
              </Button>
              <span className="text-sm text-muted-foreground">{pageLabel}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={!canGoNext}
                onClick={() => setPage((p) => p + 1)}
              >
                次へ &gt;
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
