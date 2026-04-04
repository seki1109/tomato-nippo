"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";

import type { Comment } from "@/types/comment";
import type { DailyReport } from "@/types/report";

interface ApiResponse<T> {
  data: T;
  message: string;
}

interface ErrorResponse {
  error: { code: string; message: string };
}

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token } = useAuth();

  const reportId = params.id as string;

  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [editProblem, setEditProblem] = useState("");
  const [editPlan, setEditPlan] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [commentError, setCommentError] = useState("");

  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [savingComment, setSavingComment] = useState(false);

  const [deleteCommentId, setDeleteCommentId] = useState<number | null>(null);
  const [deletingComment, setDeletingComment] = useState(false);

  const fetchReport = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setApiError("");
    try {
      const res = await fetch(`/api/v1/reports/${reportId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = (await res.json()) as ApiResponse<DailyReport>;
        setReport(json.data);
      } else if (res.status === 403) {
        router.replace("/unauthorized");
      } else if (res.status === 404) {
        setApiError("日報が見つかりません");
      } else {
        setApiError("日報の取得に失敗しました");
      }
    } catch {
      setApiError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, [token, reportId, router]);

  useEffect(() => {
    void fetchReport();
  }, [fetchReport]);

  const isOwner = user && report && user.user_id === report.user.user_id;
  const canEditDelete = isOwner && report?.status === "DRAFT";
  const isManager = user?.role === "MANAGER";

  function handleEditStart() {
    if (!report) return;
    setEditProblem(report.problem ?? "");
    setEditPlan(report.plan ?? "");
    setEditError("");
    setIsEditing(true);
  }

  function handleEditCancel() {
    setIsEditing(false);
    setEditError("");
  }

  async function handleEditSave() {
    if (!token || !report) return;
    setSaving(true);
    setEditError("");
    try {
      const res = await fetch(`/api/v1/reports/${reportId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          problem: editProblem,
          plan: editPlan,
          status: report.status,
        }),
      });
      if (res.ok) {
        const json = (await res.json()) as ApiResponse<DailyReport>;
        setReport(json.data);
        setIsEditing(false);
      } else {
        const json = (await res.json()) as ErrorResponse;
        setEditError(json.error?.message ?? "保存に失敗しました");
      }
    } catch {
      setEditError("通信エラーが発生しました");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!token) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/reports/${reportId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok || res.status === 204) {
        router.push("/reports");
      } else {
        const json = (await res.json()) as ErrorResponse;
        setApiError(json.error?.message ?? "削除に失敗しました");
        setShowDeleteDialog(false);
      }
    } catch {
      setApiError("通信エラーが発生しました");
      setShowDeleteDialog(false);
    } finally {
      setDeleting(false);
    }
  }

  async function handlePostComment() {
    if (!token || !commentText.trim()) {
      if (!commentText.trim()) setCommentError("コメントを入力してください");
      return;
    }
    setPostingComment(true);
    setCommentError("");
    try {
      const res = await fetch(`/api/v1/reports/${reportId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ comment_text: commentText }),
      });
      if (res.ok) {
        const json = (await res.json()) as ApiResponse<Comment>;
        setReport((prev) =>
          prev ? { ...prev, comments: [...prev.comments, json.data] } : prev,
        );
        setCommentText("");
      } else {
        const json = (await res.json()) as ErrorResponse;
        setCommentError(json.error?.message ?? "コメントの投稿に失敗しました");
      }
    } catch {
      setCommentError("通信エラーが発生しました");
    } finally {
      setPostingComment(false);
    }
  }

  function handleCommentEditStart(comment: Comment) {
    setEditingCommentId(comment.comment_id);
    setEditCommentText(comment.comment_text);
  }

  function handleCommentEditCancel() {
    setEditingCommentId(null);
    setEditCommentText("");
  }

  async function handleCommentEditSave(commentId: number) {
    if (!token) return;
    setSavingComment(true);
    try {
      const res = await fetch(
        `/api/v1/reports/${reportId}/comments/${commentId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ comment_text: editCommentText }),
        },
      );
      if (res.ok) {
        const json = (await res.json()) as ApiResponse<Comment>;
        setReport((prev) =>
          prev
            ? {
                ...prev,
                comments: prev.comments.map((c) =>
                  c.comment_id === commentId ? json.data : c,
                ),
              }
            : prev,
        );
        setEditingCommentId(null);
      } else {
        const json = (await res.json()) as ErrorResponse;
        setCommentError(json.error?.message ?? "コメントの更新に失敗しました");
      }
    } catch {
      setCommentError("通信エラーが発生しました");
    } finally {
      setSavingComment(false);
    }
  }

  async function handleCommentDelete(commentId: number) {
    if (!token) return;
    setDeletingComment(true);
    try {
      const res = await fetch(
        `/api/v1/reports/${reportId}/comments/${commentId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok || res.status === 204) {
        setReport((prev) =>
          prev
            ? {
                ...prev,
                comments: prev.comments.filter(
                  (c) => c.comment_id !== commentId,
                ),
              }
            : prev,
        );
      } else {
        const json = (await res.json()) as ErrorResponse;
        setCommentError(json.error?.message ?? "コメントの削除に失敗しました");
      }
    } catch {
      setCommentError("通信エラーが発生しました");
    } finally {
      setDeletingComment(false);
      setDeleteCommentId(null);
    }
  }

  function formatDate(dateStr: string): string {
    return dateStr.replace(/-/g, "/");
  }

  function formatDateTime(isoStr: string): string {
    const d = new Date(isoStr);
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${y}/${mo}/${day} ${h}:${m}`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-sm text-muted-foreground">読み込み中...</span>
      </div>
    );
  }

  if (apiError && !report) {
    return (
      <div className="p-6">
        <p className="text-sm text-destructive">{apiError}</p>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">
            日報詳細 - {formatDate(report.report_date)}（{report.user.name}）
          </h1>
          <div className="flex items-center gap-2">
            <Badge variant={report.status === "SUBMITTED" ? "default" : "secondary"}>
              {report.status === "SUBMITTED" ? "提出済み" : "下書き"}
            </Badge>
            {report.user.department && (
              <span className="text-sm text-muted-foreground">
                {report.user.department}
              </span>
            )}
          </div>
        </div>
        {canEditDelete && !isEditing && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleEditStart}>
              編集
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
            >
              削除
            </Button>
          </div>
        )}
      </div>

      {apiError && <p className="text-sm text-destructive">{apiError}</p>}

      <section className="space-y-2">
        <h2 className="font-semibold text-base border-b pb-1">訪問記録</h2>
        {report.visit_records.length === 0 ? (
          <p className="text-sm text-muted-foreground">訪問記録はありません</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="border px-3 py-2 text-left w-10">#</th>
                  <th className="border px-3 py-2 text-left w-40">顧客名</th>
                  <th className="border px-3 py-2 text-left">訪問内容</th>
                </tr>
              </thead>
              <tbody>
                {[...report.visit_records]
                  .sort((a, b) => a.visit_order - b.visit_order)
                  .map((vr) => (
                    <tr key={vr.visit_id} className="border-b last:border-b-0">
                      <td className="border px-3 py-2 text-center">{vr.visit_order}</td>
                      <td className="border px-3 py-2 font-medium">{vr.customer.company_name}</td>
                      <td className="border px-3 py-2 whitespace-pre-wrap">{vr.visit_content}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-base border-b pb-1">課題・相談（Problem）</h2>
        {isEditing ? (
          <Textarea
            value={editProblem}
            onChange={(e) => setEditProblem(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="課題・相談を入力"
          />
        ) : (
          <p className="text-sm whitespace-pre-wrap min-h-[2rem]">
            {report.problem ?? <span className="text-muted-foreground">なし</span>}
          </p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-base border-b pb-1">明日やること（Plan）</h2>
        {isEditing ? (
          <Textarea
            value={editPlan}
            onChange={(e) => setEditPlan(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="明日やることを入力"
          />
        ) : (
          <p className="text-sm whitespace-pre-wrap min-h-[2rem]">
            {report.plan ?? <span className="text-muted-foreground">なし</span>}
          </p>
        )}
      </section>

      {isEditing && (
        <div className="flex items-center gap-3">
          <Button onClick={() => void handleEditSave()} disabled={saving}>
            {saving ? "保存中..." : "保存"}
          </Button>
          <Button variant="outline" onClick={handleEditCancel} disabled={saving}>
            キャンセル
          </Button>
          {editError && <p className="text-sm text-destructive">{editError}</p>}
        </div>
      )}

      <section className="space-y-4">
        <h2 className="font-semibold text-base border-b pb-1">コメント</h2>
        {report.comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">コメントはありません</p>
        ) : (
          <div className="space-y-3">
            {report.comments.map((comment) => {
              const isMyComment = user?.user_id === comment.user.user_id;
              const isEditingThis = editingCommentId === comment.comment_id;
              return (
                <div key={comment.comment_id} className="rounded-md border p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{comment.user.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(comment.created_at)}
                      </span>
                      {isMyComment && !isEditingThis && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => handleCommentEditStart(comment)}
                          >
                            編集
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                            onClick={() => setDeleteCommentId(comment.comment_id)}
                          >
                            削除
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  {isEditingThis ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editCommentText}
                        onChange={(e) => setEditCommentText(e.target.value)}
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => void handleCommentEditSave(comment.comment_id)}
                          disabled={savingComment}
                        >
                          {savingComment ? "保存中..." : "保存"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCommentEditCancel}
                          disabled={savingComment}
                        >
                          キャンセル
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{comment.comment_text}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {isManager && (
          <div className="space-y-2 pt-2">
            <p className="text-sm font-medium">コメントを追加:</p>
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={3}
              placeholder="コメントを入力してください"
              disabled={postingComment}
            />
            {commentError && <p className="text-sm text-destructive">{commentError}</p>}
            <div className="flex justify-end">
              <Button onClick={() => void handlePostComment()} disabled={postingComment}>
                {postingComment ? "投稿中..." : "コメントを投稿"}
              </Button>
            </div>
          </div>
        )}
      </section>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>日報を削除しますか？</DialogTitle>
            <DialogDescription>
              {formatDate(report.report_date)}{" "}の日報を削除します。この操作は元に戻せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
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

      <Dialog
        open={deleteCommentId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteCommentId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>コメントを削除しますか？</DialogTitle>
            <DialogDescription>
              このコメントを削除します。この操作は元に戻せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteCommentId(null)}
              disabled={deletingComment}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deleteCommentId !== null &&
                void handleCommentDelete(deleteCommentId)
              }
              disabled={deletingComment}
            >
              {deletingComment ? "削除中..." : "削除する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
