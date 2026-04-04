// middleware.ts  (project root — UPDATED)
// School users: NextAuth JWT session
// Super Admin: separate httpOnly cookie (superadmin_token)

import { auth } from "@/auth";
import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import type { PlanType, UserRole } from "@/types/auth";
import { canAccessFeature, type Feature } from "@/lib/subscription-guard";

const SUPER_ADMIN_SECRET = new TextEncoder().encode(
  process.env.SUPER_ADMIN_JWT_SECRET ?? process.env.AUTH_SECRET ?? "fallback-secret"
);

const ROLE_ROUTES: Record<string, UserRole[]> = {
  "/admin":   ["ADMIN"],
  "/teacher": ["TEACHER", "ADMIN"],
  "/cashier": ["CASHIER", "ADMIN"],
  "/staff":   ["STAFF", "ADMIN"],
  "/student": ["STUDENT", "ADMIN"],

 

};

const FEATURE_ROUTES: Record<string, Feature> = {
  "/admin/sms":       "sms_panel",
  "/admin/analytics": "analytics",
  "/admin/reports":   "advanced_reports",
  "/admin/branding":  "custom_branding",
};

const ROLE_DASHBOARDS: Record<string, string> = {
  ADMIN:   "/admin/dashboard",
  TEACHER: "/teacher",
  CASHIER: "/cashier",
  STAFF:   "/staff",
  STUDENT: "/student",
  PARENT:  "/parent",
};

const PUBLIC_ROUTES       = ["/", "/login", "/api/auth"];
const SUPER_ADMIN_PUBLIC  = "/superadmin/login";
const SUPER_ADMIN_PREFIX  = "/superadmin";

export default auth(async function middleware(
  req: NextRequest & { auth: { user?: { role?: string; planType?: string } } | null }
) {
  const { pathname } = req.nextUrl;

  // ── BRANCH A: Super Admin routes ──────────────────────────────────────────
  if (pathname.startsWith(SUPER_ADMIN_PREFIX)) {
    if (pathname === SUPER_ADMIN_PUBLIC) {
      const token = req.cookies.get("superadmin_token")?.value;
      if (token) {
        try {
          await jwtVerify(token, SUPER_ADMIN_SECRET);
          return NextResponse.redirect(new URL("/superadmin/dashboard", req.url));
        } catch { /* invalid token, show login */ }
      }
      return NextResponse.next();
    }

    const token = req.cookies.get("superadmin_token")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/superadmin/login", req.url));
    }
    try {
      await jwtVerify(token, SUPER_ADMIN_SECRET);
      return NextResponse.next();
    } catch {
      const res = NextResponse.redirect(new URL("/superadmin/login", req.url));
      res.cookies.delete("superadmin_token");
      return res;
    }
  }

  // ── BRANCH B: School user routes ──────────────────────────────────────────
  const session = req.auth;

  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    if (pathname === "/login" && session?.user?.role) {
      return NextResponse.redirect(
        new URL(ROLE_DASHBOARDS[session.user.role] ?? "/", req.url)
      );
    }
    return NextResponse.next();
  }

  if (!session?.user) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  const role     = session.user.role     as UserRole;
  const planType = session.user.planType as PlanType;

  if (pathname === "/") {
    return NextResponse.redirect(new URL(ROLE_DASHBOARDS[role] ?? "/login", req.url));
  }

  for (const [prefix, allowed] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(prefix) && !allowed.includes(role)) {
      return NextResponse.redirect(new URL(ROLE_DASHBOARDS[role] ?? "/", req.url));
    }
  }

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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)" ],
};