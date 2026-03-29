import { NextResponse } from "next/server";

type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT";

interface ErrorDetail {
  field: string;
  message: string;
}

export function successResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data, message: "success" }, { status });
}

export function errorResponse(
  code: ErrorCode,
  message: string,
  status: number,
  details?: ErrorDetail[],
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    },
    { status },
  );
}

export function validationError(
  message: string,
  details?: ErrorDetail[],
): NextResponse {
  return errorResponse("VALIDATION_ERROR", message, 400, details);
}

export function unauthorizedError(
  message = "認証が必要です",
): NextResponse {
  return errorResponse("UNAUTHORIZED", message, 401);
}

export function forbiddenError(
  message = "この操作を行う権限がありません",
): NextResponse {
  return errorResponse("FORBIDDEN", message, 403);
}

export function notFoundError(
  message = "リソースが見つかりません",
): NextResponse {
  return errorResponse("NOT_FOUND", message, 404);
}

export function conflictError(message: string): NextResponse {
  return errorResponse("CONFLICT", message, 409);
}
