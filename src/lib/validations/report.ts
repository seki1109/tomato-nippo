export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

interface VisitRecordInput {
  customer_id?: unknown;
  visit_content?: unknown;
  visit_order?: unknown;
}

function getTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function validateReportCreate(
  body: Record<string, unknown>,
): ValidationResult {
  const { report_date, visit_records, problem, plan } = body;
  const errors: ValidationError[] = [];
  const today = getTodayString();

  // report_date
  if (
    report_date === undefined ||
    report_date === null ||
    report_date === ""
  ) {
    errors.push({ field: "report_date", message: "日付は必須です" });
  } else if (
    typeof report_date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(report_date)
  ) {
    errors.push({
      field: "report_date",
      message: "日付の形式が正しくありません（YYYY-MM-DD）",
    });
  } else if (report_date > today) {
    errors.push({
      field: "report_date",
      message: "今日以前の日付を指定してください",
    });
  }

  // visit_records
  if (!Array.isArray(visit_records) || visit_records.length === 0) {
    errors.push({
      field: "visit_records",
      message: "訪問記録は1件以上必要です",
    });
  } else {
    (visit_records as VisitRecordInput[]).forEach((vr, i) => {
      if (!vr.customer_id) {
        errors.push({
          field: `visit_records[${i}].customer_id`,
          message: "顧客IDは必須です",
        });
      }
      if (!vr.visit_content) {
        errors.push({
          field: `visit_records[${i}].visit_content`,
          message: "訪問内容は必須です",
        });
      } else if (
        typeof vr.visit_content === "string" &&
        vr.visit_content.length > 1000
      ) {
        errors.push({
          field: `visit_records[${i}].visit_content`,
          message: "訪問内容は1000文字以内で入力してください",
        });
      }
    });
  }

  // problem
  if (typeof problem === "string" && problem.length > 2000) {
    errors.push({
      field: "problem",
      message: "課題・相談は2000文字以内で入力してください",
    });
  }

  // plan
  if (typeof plan === "string" && plan.length > 2000) {
    errors.push({
      field: "plan",
      message: "明日やることは2000文字以内で入力してください",
    });
  }

  return { valid: errors.length === 0, errors };
}
