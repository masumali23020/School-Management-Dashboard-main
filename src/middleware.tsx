import { auth } from "@/auth";
import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import type { PlanType, UserRole } from "@/types/auth";
import { canAccessFeature, type Feature } from "@/lib/subscription-guard";

const SUPER_ADMIN_SECRET = new TextEncoder().encode(
  process.env.SUPER_ADMIN_JWT_SECRET ?? process.env.AUTH_SECRET ?? "fallback-secret"
);

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

// Simplified Public Routes check
const PUBLIC_ROUTES = ["/login", "/api/auth", "/_next", "/favicon.ico"];
const SUPER_ADMIN_PREFIX = "/superadmin";
const SUPER_ADMIN_PUBLIC = "/superadmin/login";

export default auth(async function middleware(req) {
  const { pathname } = req.nextUrl;
  const session = req.auth; // NextAuth v5 populates this

  // 1. BRANCH A: Super Admin Logic
  if (pathname.startsWith(SUPER_ADMIN_PREFIX)) {
    const token = req.cookies.get("superadmin_token")?.value;

    if (pathname === SUPER_ADMIN_PUBLIC) {
      if (token) {
        try {
          await jwtVerify(token, SUPER_ADMIN_SECRET);
          return NextResponse.redirect(new URL("/superadmin/dashboard", req.url));
        } catch { /* Token invalid, allow login page */ }
      }
      return NextResponse.next();
    }

    if (!token) return NextResponse.redirect(new URL(SUPER_ADMIN_PUBLIC, req.url));

    try {
      await jwtVerify(token, SUPER_ADMIN_SECRET);
      return NextResponse.next();
    } catch {
      const res = NextResponse.redirect(new URL(SUPER_ADMIN_PUBLIC, req.url));
      res.cookies.set("superadmin_token", "", { maxAge: 0 }); // Use .set to clear
      return res;
    }
  }

  // 2. BRANCH B: School User Logic
  const isPublic = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  // If logged in and hitting /login, send to dashboard
  if (pathname === "/login" && session?.user?.role) {
    const role = session.user.role as keyof typeof ROLE_DASHBOARDS;
    return NextResponse.redirect(new URL(ROLE_DASHBOARDS[role] ?? "/", req.url));
  }

  if (isPublic) return NextResponse.next();

  // Redirect to login if no session
  if (!session?.user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = session.user.role as UserRole;
  const planType = session.user.planType as PlanType;

  // Root redirect: / -> /admin/dashboard, etc.
  if (pathname === "/") {
    return NextResponse.redirect(new URL(ROLE_DASHBOARDS[role] ?? "/login", req.url));
  }

  // Role Access Control
  for (const [prefix, allowed] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(prefix) && !allowed.includes(role)) {
      return NextResponse.redirect(new URL(ROLE_DASHBOARDS[role] ?? "/", req.url));
    }
  }

  // Subscription/Feature Access Control
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