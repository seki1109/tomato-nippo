import type { Comment } from "./comment";
import type { Customer } from "./customer";
import type { AuthUser } from "./user";

export type ReportStatus = "DRAFT" | "SUBMITTED";

export interface VisitRecord {
  visit_id: number;
  customer: Pick<Customer, "customer_id" | "company_name">;
  visit_content: string;
  visit_order: number;
  created_at: string;
  updated_at: string;
}

export interface DailyReport {
  report_id: number;
  report_date: string;
  status: ReportStatus;
  problem?: string;
  plan?: string;
  user: Pick<AuthUser, "user_id" | "name"> & { department?: string };
  visit_records: VisitRecord[];
  comments: Comment[];
  created_at: string;
  updated_at: string;
}

export interface DailyReportSummary {
  report_id: number;
  report_date: string;
  status: ReportStatus;
  user: Pick<AuthUser, "user_id" | "name">;
  updated_at: string;
}
