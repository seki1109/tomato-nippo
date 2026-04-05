"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";

import type { Customer } from "@/types/customer";

interface VisitRow {
  id: number; // ローカル管理用
  customer_id: string;
  visit_content: string;
}

interface ApiError {
  error: { code: string; message: string; details?: { field: string; message: string }[] };
}

interface CreatedReport {
  report_id: number;
}

interface CustomersResponse {
  data: { customers: Customer[]; pagination: { total_pages: number } };
}

interface ReportCreateResponse {
  data: CreatedReport;
}

let nextId = 1;
function newRow(): VisitRow {
  return { id: nextId++, customer_id: "", visit_content: "" };
}

function todayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export default function NewReportPage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const baseId = useId();

  const [reportDate, setReportDate] = useState(todayString());
  const [visitRows, setVisitRows] = useState<VisitRow[]>([newRow()]);
  const [problem, setProblem] = useState("");
  const [plan, setPlan] = useState("");

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState("");

  // SALES以外はアクセス不可
  useEffect(() => {
    if (user && user.role !== "SALES") {
      router.replace("/unauthorized");
    }
  }, [user, router]);

  // 顧客マスター取得（全件）
  useEffect(() => {
    if (!token) return;
    const fetchCustomers = async () => {
      setCustomersLoading(true);
      try {
        // まず1ページ目を取得してtotal_pagesを確認
        const res = await fetch("/api/v1/customers?per_page=100", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = (await res.json()) as CustomersResponse;
          const { customers: first, pagination } = json.data;
          if (pagination.total_pages <= 1) {
            setCustomers(first);
          } else {
            // 複数ページある場合は全ページ取得
            const pages = Array.from({ length: pagination.total_pages - 1 }, (_, i) => i + 2);
            const rest = await Promise.all(
              pages.map((p) =>
                fetch(`/api/v1/customers?per_page=100&page=${p}`, {
                  headers: { Authorization: `Bearer ${token}` },
                })
                  .then((r) => r.json() as Promise<CustomersResponse>)
                  .then((j) => j.data.customers),
              ),
            );
            setCustomers([...first, ...rest.flat()]);
          }
        }
      } catch {
        // 顧客取得失敗は継続（エラーは入力時に表示）
      } finally {
        setCustomersLoading(false);
      }
    };
    void fetchCustomers();
  }, [token]);

  function addVisitRow() {
    setVisitRows((prev) => [...prev, newRow()]);
  }

  function removeVisitRow(id: number) {
    setVisitRows((prev) => prev.filter((r) => r.id !== id));
  }

  function updateVisitRow(id: number, field: keyof Omit<VisitRow, "id">, value: string) {
    setVisitRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!reportDate) {
      errs.report_date = "日付は必須です";
    } else if (reportDate > todayString()) {
      errs.report_date = "今日以前の日付を指定してください";
    }
    if (visitRows.length === 0) {
      errs.visit_records = "訪問記録は1件以上必要です";
    } else {
      visitRows.forEach((row, i) => {
        if (!row.customer_id) {
          errs[`visit_customer_${i}`] = "顧客を選択してください";
        }
        if (!row.visit_content.trim()) {
          errs[`visit_content_${i}`] = "訪問内容は必須です";
        } else if (row.visit_content.length > 1000) {
          errs[`visit_content_${i}`] = "1000文字以内で入力してください";
        }
      });
    }
    if (problem.length > 2000) errs.problem = "2000文字以内で入力してください";
    if (plan.length > 2000) errs.plan = "2000文字以内で入力してください";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(status: "DRAFT" | "SUBMITTED") {
    if (!validate()) return;
    if (!token) return;
    setSubmitting(true);
    setApiError("");
    try {
      const body = {
        report_date: reportDate,
        problem,
        plan,
        status,
        visit_records: visitRows.map((row, i) => ({
          customer_id: Number(row.customer_id),
          visit_content: row.visit_content,
          visit_order: i + 1,
        })),
      };
      const res = await fetch("/api/v1/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (res.status === 201) {
        const json = (await res.json()) as ReportCreateResponse;
        router.push(`/reports/${json.data.report_id}`);
      } else {
        const json = (await res.json()) as ApiError;
        if (json.error.code === "CONFLICT") {
          setErrors((prev) => ({ ...prev, report_date: json.error.message }));
        } else {
          setApiError(json.error.message ?? "保存に失敗しました");
        }
      }
    } catch {
      setApiError("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">日報作成</h1>

      {/* 日付 */}
      <div className="space-y-1">
        <label htmlFor={`${baseId}-date`} className="text-sm font-medium">
          日付 <span className="text-destructive">*</span>
        </label>
        <input
          id={`${baseId}-date`}
          type="date"
          value={reportDate}
          max={todayString()}
          onChange={(e) => setReportDate(e.target.value)}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        />
        {errors.report_date && (
          <p className="text-xs text-destructive">{errors.report_date}</p>
        )}
      </div>

      {/* 訪問記録 */}
      <section className="space-y-3">
        <h2 className="font-semibold border-b pb-1">訪問記録</h2>
        {errors.visit_records && (
          <p className="text-xs text-destructive">{errors.visit_records}</p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="border px-3 py-2 text-left w-8">#</th>
                <th className="border px-3 py-2 text-left w-48">顧客名</th>
                <th className="border px-3 py-2 text-left">訪問内容</th>
                <th className="border px-3 py-2 w-16">操作</th>
              </tr>
            </thead>
            <tbody>
              {visitRows.map((row, i) => (
                <tr key={row.id}>
                  <td className="border px-3 py-2 text-center align-top">{i + 1}</td>
                  <td className="border px-3 py-2 align-top">
                    <Select
                      value={row.customer_id || "none"}
                      onValueChange={(v) =>
                        updateVisitRow(row.id, "customer_id", v === "none" ? "" : v)
                      }
                      disabled={customersLoading}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="選択してください" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" disabled>
                          選択してください
                        </SelectItem>
                        {customers.map((c) => (
                          <SelectItem key={c.customer_id} value={String(c.customer_id)}>
                            {c.company_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors[`visit_customer_${i}`] && (
                      <p className="text-xs text-destructive mt-1">
                        {errors[`visit_customer_${i}`]}
                      </p>
                    )}
                  </td>
                  <td className="border px-3 py-2 align-top">
                    <Textarea
                      value={row.visit_content}
                      onChange={(e) =>
                        updateVisitRow(row.id, "visit_content", e.target.value)
                      }
                      rows={2}
                      maxLength={1000}
                      placeholder="訪問内容を入力"
                      className="resize-none"
                    />
                    {errors[`visit_content_${i}`] && (
                      <p className="text-xs text-destructive mt-1">
                        {errors[`visit_content_${i}`]}
                      </p>
                    )}
                  </td>
                  <td className="border px-3 py-2 text-center align-top">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeVisitRow(row.id)}
                      disabled={visitRows.length === 1}
                    >
                      削除
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={addVisitRow}>
            + 訪問先を追加
          </Button>
        </div>
      </section>

      {/* 課題・相談 */}
      <section className="space-y-2">
        <h2 className="font-semibold border-b pb-1">課題・相談（Problem）</h2>
        <Textarea
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="現在の課題・相談を入力してください"
        />
        {errors.problem && (
          <p className="text-xs text-destructive">{errors.problem}</p>
        )}
      </section>

      {/* 明日やること */}
      <section className="space-y-2">
        <h2 className="font-semibold border-b pb-1">明日やること（Plan）</h2>
        <Textarea
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="明日やることを入力してください"
        />
        {errors.plan && (
          <p className="text-xs text-destructive">{errors.plan}</p>
        )}
      </section>

      {apiError && <p className="text-sm text-destructive">{apiError}</p>}

      <div className="flex justify-end gap-3 pb-8">
        <Button
          variant="outline"
          onClick={() => void handleSubmit("DRAFT")}
          disabled={submitting}
        >
          {submitting ? "保存中..." : "下書き保存"}
        </Button>
        <Button
          onClick={() => void handleSubmit("SUBMITTED")}
          disabled={submitting}
        >
          {submitting ? "保存中..." : "提出する"}
        </Button>
      </div>
    </div>
  );
}
