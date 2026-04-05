export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLogin(body: Record<string, unknown>): ValidationResult {
  const { email, password } = body;
  const errors: ValidationError[] = [];

  if (!email) {
    errors.push({ field: "email", message: "メールアドレスは必須です" });
  } else if (typeof email !== "string" || !EMAIL_REGEX.test(email)) {
    errors.push({
      field: "email",
      message: "メールアドレスの形式で入力してください",
    });
  }

  if (!password) {
    errors.push({ field: "password", message: "パスワードは必須です" });
  }

  return { valid: errors.length === 0, errors };
}
