import { auth } from "@/auth";
import { NextResponse, type NextRequest } from "next/server";
import type { PlanType, UserRole } from "@/types/auth";
import { canAccessFeature, type Feature } from "@/lib/subscription-guard";

// 🔐 Secret
const SECRET =
  process.env.SUPER_ADMIN_JWT_SECRET ??
  process.env.AUTH_SECRET ??
  "fallback-secret";

// 🔐 Minimal JWT Verify (HS256)
async function verifyToken(token: string): Promise<boolean> {
  try {
    const [header, payload, signature] = token.split(".");
    if (!header || !payload || !signature) return false;

    const data = `${header}.${payload}`;

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      Uint8Array.from(atob(signature), c => c.charCodeAt(0)),
      new TextEncoder().encode(data)
    );

    return valid;
  } catch {
    return false;
  }
}

const ROLE_ROUTES: Record<string, UserRole[]> = {
  "/admin": ["ADMIN"],
  "/teacher": ["TEACHER", "ADMIN"],
  "/cashier": ["CASHIER", "ADMIN"],
  "/staff": ["STAFF", "ADMIN"],
  "/student": ["STUDENT", "ADMIN"],
};

const FEATURE_ROUTES: Record<string, Feature> = {
  "/admin/sms": "sms_panel",
  "/admin/analytics": "analytics",
  "/admin/reports": "advanced_reports",
  "/admin/branding": "custom_branding",
};

const ROLE_DASHBOARDS: Record<string, string> = {
  ADMIN: "/admin/dashboard",
  TEACHER: "/teacher",
  CASHIER: "/cashier",
  STAFF: "/staff",
  STUDENT: "/student",
  PARENT: "/parent",
};

const PUBLIC_ROUTES = ["/login", "/api/auth", "/_next", "/favicon.ico"];
const SUPER_ADMIN_PREFIX = "/superadmin";
const SUPER_ADMIN_PUBLIC = "/superadmin/login";

export default auth(async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // =========================
  // 🔥 1. SUPER ADMIN
  // =========================
  if (pathname.startsWith(SUPER_ADMIN_PREFIX)) {
    const token = req.cookies.get("superadmin_token")?.value;

    if (pathname === SUPER_ADMIN_PUBLIC) {
      if (token && (await verifyToken(token))) {
        return NextResponse.redirect(
          new URL("/superadmin/dashboard", req.url)
        );
      }
      return NextResponse.next();
    }

    if (!token || !(await verifyToken(token))) {
      const res = NextResponse.redirect(
        new URL(SUPER_ADMIN_PUBLIC, req.url)
      );
      res.cookies.set("superadmin_token", "", { maxAge: 0 });
      return res;
    }

    return NextResponse.next();
  }

  // =========================
  // 🔥 2. SCHOOL USER
  // =========================
  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

  // Already logged in → redirect from login
  if (pathname === "/login" && session?.user?.role) {
    const role = session.user.role as keyof typeof ROLE_DASHBOARDS;
    return NextResponse.redirect(
      new URL(ROLE_DASHBOARDS[role] ?? "/", req.url)
    );
  }

  if (isPublic) return NextResponse.next();

  // Not logged in
  if (!session?.user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = session.user.role as UserRole;
  const planType = session.user.planType as PlanType;

  // Root redirect
  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(ROLE_DASHBOARDS[role] ?? "/login", req.url)
    );
  }

  // Role guard
  for (const [prefix, allowed] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(prefix) && !allowed.includes(role)) {
      return NextResponse.redirect(
        new URL(ROLE_DASHBOARDS[role] ?? "/", req.url)
      );
    }
  }

  // Feature guard
  for (const [prefix, feature] of Object.entries(FEATURE_ROUTES)) {
    if (pathname.startsWith(prefix) && !canAccessFeature(planType, feature)) {
      const upgradeUrl = new URL("/admin/billing", req.url);
      upgradeUrl.searchParams.set("feature", feature);
      upgradeUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(upgradeUrl);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|public/).*)"],
};