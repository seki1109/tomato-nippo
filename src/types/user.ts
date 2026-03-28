export type Role = "SALES" | "MANAGER" | "ADMIN";

export interface User {
  user_id: number;
  name: string;
  email: string;
  role: Role;
  department?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  user_id: number;
  name: string;
  email: string;
  role: Role;
  department?: string;
}
