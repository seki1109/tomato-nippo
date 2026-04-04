import { jwtVerify } from "jose";
import { NextResponse } from "next/server";

import type { Role } from "@/types";
import type { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);

const PUBLIC_API_PATHS = ["/api/v1/auth/login"];

/**
 * ページルートのロール別アクセス制御
 * 上から順に評価し、最初にマッチしたルールを適用する
 */
const PAGE_ROUTE_RULES: { pattern: RegExp; allowedRoles: Role[] }[] = [
  { pattern: /^\/reports\/new$/, allowedRoles: ["SALES"] },
  { pattern: /^\/reports(\/.*)?$/, allowedRoles: ["SALES", "MANAGER"] },
  { pattern: /^\/master\//, allowedRoles: ["ADMIN"] },
];

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/v1/")) {
    return handleApiAuth(request);
  }

  return handlePageAuth(request);
}

async function handleApiAuth(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (PUBLIC_API_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "認証トークンが指定されていません",
        },
      },
      { status: 401 },
    );
  }

  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", String(payload["userId"]));
    requestHeaders.set("x-user-role", String(payload["role"]));
    requestHeaders.set("x-user-name", encodeURIComponent(String(payload["name"])));

    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "トークンが無効または期限切れです",
        },
      },
      { status: 401 },
    );
  }
}

async function handlePageAuth(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("auth-token")?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    const role = String(payload["role"]) as Role;

    const matchedRule = PAGE_ROUTE_RULES.find((rule) =>
      rule.pattern.test(pathname),
    );

    if (matchedRule && !matchedRule.allowedRoles.includes(role)) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    return NextResponse.next();
  } catch {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    "/api/v1/:path*",
    "/reports",
    "/reports/:path*",
    "/master/:path*",
  ],
};
