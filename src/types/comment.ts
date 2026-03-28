import type { AuthUser } from "./user";

export interface Comment {
  comment_id: number;
  comment_text: string;
  user: Pick<AuthUser, "user_id" | "name">;
  created_at: string;
  updated_at: string;
}
