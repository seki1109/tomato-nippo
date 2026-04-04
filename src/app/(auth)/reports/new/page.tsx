"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

import type { Customer, ReportStatus } from "@/types";

interface VisitRow {
  id: string;
  customer_id: string;
  visit_content: string;
}

interface CreateReportResponse {
  data: { report_id: number };
}

interface ApiErrorResponse {
  error: { code: string; message: string };
}

function NewReportForm() {
  const router = useRouter();
  const { token } = useAuth();

  const today = new Date().toISOString().split("T")[0]!;

  const [reportDate, setReportDate] = useState(today);
  const [visitRows, setVisitRows] = useState<VisitRow[]>([
    { id: crypto.randomUUID(), customer_id: "", visit_content: "" },
  ]);
  const [problem, setProblem] = useState("");
  const [plan, setPlan] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    async function fetchCustomers() {
      try {
        const res = await fetch("/api/v1/customers?per_page=1000", {
          headers: { Authorization: `Bearer ${token ?? ""}` },
        });
        if (res.ok) {
          const json = (await res.json()) as {
            data: { customers: Customer[] };
          };
          setCustomers(json.data.customers);
        }
      } catch (err) {
        console.warn("顧客データの取得に失敗しました:", err);
      } finally {
        setLoadingCustomers(false);
      }
    }
    void fetchCustomers();
  }, [token]);

  function addRow() {
    setVisitRows((prev) => [
      ...prev,
      { id: crypto.randomUUID(), customer_id: "", visit_content: "" },
    ]);
  }

  function removeRow(index: number) {
    setVisitRows((prev) => prev.filter((_, i) => i !== index));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`visit_customer_${index}`];
      delete next[`visit_content_${index}`];
      return next;
    });
  }

  function updateRow(
    index: number,
    field: "customer_id" | "visit_content",
    value: string,
  ) {
    setVisitRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!reportDate) {
      newErrors.reportDate = "日付は必須です";
    }

    if (visitRows.length === 0) {
      newErrors.visitRecords = "訪問記録は1件以上必要です";
    }

    visitRows.forEach((row, i) => {
      if (!row.customer_id) {
        newErrors[`visit_customer_${i}`] = "顧客を選択してください";
      }
      if (!row.visit_content) {
        newErrors[`visit_content_${i}`] = "訪問内容は必須です";
      } else if (row.visit_content.length > 1000) {
        newErrors[`visit_content_${i}`] = "1000文字以内で入力してください";
      }
    });

    if (problem.length > 2000) {
      newErrors.problem = "2000文字以内で入力してください";
    }

    if (plan.length > 2000) {
      newErrors.plan = "2000文字以内で入力してください";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(status: ReportStatus) {
    setApiError("");
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? ""}`,
        },
        body: JSON.stringify({
          report_date: reportDate,
          problem,
          plan,
          status,
          visit_records: visitRows.map((row, i) => ({
            customer_id: parseInt(row.customer_id, 10),
            visit_content: row.visit_content,
            visit_order: i + 1,
          })),
        }),
      });

      if (res.ok) {
        const json = (await res.json()) as CreateReportResponse;
        router.push(`/reports/${json.data.report_id}`);
      } else if (res.status === 409) {
        setApiError(`${reportDate} の日報は既に存在します`);
      } else {
        const json = (await res.json()) as ApiErrorResponse;
        setApiError(
          json.error?.message ?? "保存に失敗しました。もう一度お試しください。",
        );
      }
    } catch {
      setApiError("通信エラーが発生しました。もう一度お試しください。");
    } finally {
      setSubmitting(false);
    }
  }

  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent, overIndex: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === overIndex) return;
    const newRows = [...visitRows];
    const [removed] = newRows.splice(dragIndex, 1);
    if (removed) {
      newRows.splice(overIndex, 0, removed);
    }
    setVisitRows(newRows);
    setDragIndex(overIndex);
  }

  function handleDragEnd() {
    setDragIndex(null);
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">日報作成</h1>

      {/* 日付 */}
      <div className="space-y-1">
        <label htmlFor="report-date" className="text-sm font-medium">
          日付
        </label>
        <Input
          id="report-date"
          type="date"
          value={reportDate}
          onChange={(e) => setReportDate(e.target.value)}
          max={today}
          className="w-48"
          disabled={submitting}
        />
        {errors.reportDate && (
          <p className="text-sm text-destructive">{errors.reportDate}</p>
        )}
      </div>

      {/* 訪問記録 */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium">訪問記録</h2>
        {errors.visitRecords && (
          <p className="text-sm text-destructive">{errors.visitRecords}</p>
        )}

        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="w-8 px-3 py-2 text-left font-medium">#</th>
                <th className="w-48 px-3 py-2 text-left font-medium">
                  顧客名
                </th>
                <th className="px-3 py-2 text-left font-medium">訪問内容</th>
                <th className="w-16 px-3 py-2 text-left font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {visitRows.map((row, i) => (
                <tr
                  key={row.id}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "border-b last:border-b-0",
                    dragIndex === i && "opacity-50",
                  )}
                >
                  <td className="cursor-grab px-3 py-2 text-muted-foreground">
                    {i + 1}
                  </td>
                  <td className="px-3 py-2">
                    <Select
                      value={row.customer_id}
                      onValueChange={(val) =>
                        updateRow(i, "customer_id", val)
                      }
                      disabled={submitting || loadingCustomers}
                    >
                      <SelectTrigger
                        className={cn(
                          errors[`visit_customer_${i}`] &&
                            "border-destructive",
                        )}
                      >
                        <SelectValue placeholder="顧客を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((c) => (
                          <SelectItem
                            key={c.customer_id}
                            value={String(c.customer_id)}
                          >
                            {c.company_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors[`visit_customer_${i}`] && (
                      <p className="mt-0.5 text-xs text-destructive">
                        {errors[`visit_customer_${i}`]}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <Textarea
                      value={row.visit_content}
                      onChange={(e) =>
                        updateRow(i, "visit_content", e.target.value)
                      }
                      placeholder="訪問内容を入力"
                      className={cn(
                        "min-h-[60px] resize-y",
                        errors[`visit_content_${i}`] && "border-destructive",
                      )}
                      disabled={submitting}
                    />
                    <div className="mt-0.5 flex justify-between text-xs text-muted-foreground">
                      {errors[`visit_content_${i}`] ? (
                        <span className="text-destructive">
                          {errors[`visit_content_${i}`]}
                        </span>
                      ) : (
                        <span />
                      )}
                      <span>{row.visit_content.length}/1000</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeRow(i)}
                      disabled={visitRows.length <= 1 || submitting}
                    >
                      削除
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={addRow}
          disabled={submitting}
        >
          + 訪問先を追加
        </Button>
      </div>

      {/* 課題・相談（Problem） */}
      <div className="space-y-1">
        <label htmlFor="problem" className="text-sm font-medium">
          課題・相談（Problem）
        </label>
        <Textarea
          id="problem"
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          className={cn(
            "min-h-[100px] resize-y",
            errors.problem && "border-destructive",
          )}
          disabled={submitting}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          {errors.problem ? (
            <span className="text-destructive">{errors.problem}</span>
          ) : (
            <span />
          )}
          <span>{problem.length}/2000</span>
        </div>
      </div>

      {/* 明日やること（Plan） */}
      <div className="space-y-1">
        <label htmlFor="plan" className="text-sm font-medium">
          明日やること（Plan）
        </label>
        <Textarea
          id="plan"
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          className={cn(
            "min-h-[100px] resize-y",
            errors.plan && "border-destructive",
          )}
          disabled={submitting}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          {errors.plan ? (
            <span className="text-destructive">{errors.plan}</span>
          ) : (
            <span />
          )}
          <span>{plan.length}/2000</span>
        </div>
      </div>

      {apiError && <p className="text-sm text-destructive">{apiError}</p>}

      {/* ボタン */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void handleSubmit("DRAFT");
          }}
          disabled={submitting}
        >
          {submitting ? "保存中..." : "下書き保存"}
        </Button>
        <Button
          type="button"
          onClick={() => {
            void handleSubmit("SUBMITTED");
          }}
          disabled={submitting || visitRows.length === 0}
        >
          {submitting ? "提出中..." : "提出する"}
        </Button>
      </div>
    </div>
  );
}

export default function NewReportPage() {
  return (
    <AuthGuard allowedRoles={["SALES"]}>
      <NewReportForm />
    </AuthGuard>
  );
}
