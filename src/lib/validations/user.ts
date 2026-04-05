export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

const VALID_ROLES = ["SALES", "MANAGER", "ADMIN"] as const;
type Role = (typeof VALID_ROLES)[number];

export function validateUserCreate(
  body: Record<string, unknown>,
): ValidationResult {
  const { name, email, password, role } = body;
  const errors: ValidationError[] = [];

  // name: 必須・100文字以内
  if (name === undefined || name === null || name === "") {
    errors.push({ field: "name", message: "氏名は必須です" });
  } else if (typeof name !== "string") {
    errors.push({ field: "name", message: "氏名の形式が正しくありません" });
  } else if (name.length > 100) {
    errors.push({
      field: "name",
      message: "氏名は100文字以内で入力してください",
    });
  }

  // email: 必須・メール形式
  if (email === undefined || email === null || email === "") {
    errors.push({ field: "email", message: "メールアドレスは必須です" });
  } else if (
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    errors.push({
      field: "email",
      message: "メールアドレスの形式で入力してください",
    });
  }

  // password: 必須・8文字以上・英数字混在
  if (password === undefined || password === null || password === "") {
    errors.push({ field: "password", message: "パスワードは必須です" });
  } else if (typeof password !== "string") {
    errors.push({
      field: "password",
      message: "パスワードの形式が正しくありません",
    });
  } else if (password.length < 8) {
    errors.push({
      field: "password",
      message: "パスワードは8文字以上で入力してください",
    });
  } else if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    errors.push({
      field: "password",
      message: "パスワードは英字と数字を混在させてください",
    });
  }

  // role: 必須・SALES / MANAGER / ADMIN のいずれか
  if (role === undefined || role === null || role === "") {
    errors.push({ field: "role", message: "ロールは必須です" });
  } else if (!VALID_ROLES.includes(role as Role)) {
    errors.push({
      field: "role",
      message: "ロールは SALES / MANAGER / ADMIN のいずれかを指定してください",
    });
  }

  return { valid: errors.length === 0, errors };
}
