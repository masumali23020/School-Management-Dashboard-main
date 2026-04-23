import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt"; // এটি খুবই হালকা
import type { PlanType, UserRole } from "@/types/auth";

// ─── Native JWT verification (Super Admin-এর জন্য আগের মতোই থাকবে) ──────────
async function verifyJWT(token: string, secret: string): Promise<boolean> {
  try {
    const keyData = new TextEncoder().encode(secret);
    const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const [headerB64, payloadB64, sigB64] = token.split(".");
    if (!headerB64 || !payloadB64 || !sigB64) return false;
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const sig = Uint8Array.from(atob(sigB64.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
    return await crypto.subtle.verify("HMAC", key, sig, data);
  } catch { return false; }
}

const PUBLIC_PATHS = ["/login", "/api/auth", "/_next", "/favicon.ico", "/public"];
const SUPER_PREFIX = "/superadmin";
const SUPER_LOGIN = "/superadmin/login";

const PLAN_LEVEL: Record<string, number> = { FREE: 0, STANDARD: 1, POPULAR: 2 };
const FEATURE_PLAN: Record<string, number> = { sms_panel: 2, analytics: 2, advanced_reports: 1, custom_branding: 2, bulk_import: 1, api_access: 1 };
const ROLE_ROUTES: Record<string, UserRole[]> = { "/admin": ["ADMIN"], "/teacher": ["TEACHER", "ADMIN"], "/cashier": ["CASHIER", "ADMIN"], "/staff": ["STAFF", "ADMIN"], "/student": ["STUDENT", "ADMIN"] };
const FEATURE_ROUTES: Record<string, string> = { "/admin/sms": "sms_panel", "/admin/analytics": "analytics", "/admin/reports": "advanced_reports", "/admin/branding": "custom_branding" };
const ROLE_DASHBOARDS: Record<string, string> = { ADMIN: "/admin/dashboard", TEACHER: "/teacher", CASHIER: "/cashier", STAFF: "/staff", STUDENT: "/student" };

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ═══ BRANCH A: Super Admin ══════════════════════════════════════════════════
  if (pathname.startsWith(SUPER_PREFIX)) {
    const superAdminSecret = process.env.SUPER_ADMIN_JWT_SECRET;
    if (!superAdminSecret) return NextResponse.redirect(new URL("/", req.url));
    const token = req.cookies.get("superadmin_token")?.value;

    if (pathname === SUPER_LOGIN) {
      if (token && (await verifyJWT(token, superAdminSecret))) return NextResponse.redirect(new URL("/superadmin/dashboard", req.url));
      return NextResponse.next();
    }
    if (!token || !(await verifyJWT(token, superAdminSecret))) {
      const res = NextResponse.redirect(new URL(SUPER_LOGIN, req.url));
      res.cookies.delete("superadmin_token");
      return res;
    }
    return NextResponse.next();
  }

  // ═══ BRANCH B: General Auth (Using getToken) ════════════════════════════════
  // 'auth()' এর বদলে 'getToken' ব্যবহার করায় সাইজ অনেক কমে যাবে
  const token = await getToken({ 
    req, 
    secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET 
  });

  const role = token?.role as UserRole | undefined;
  const planType = token?.planType as PlanType | undefined;
  const hasSession = !!token;

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isProtectedRoute = Object.keys(ROLE_ROUTES).some((route) => pathname.startsWith(route));

  if (pathname === "/login" && hasSession && role) {
    return NextResponse.redirect(new URL(ROLE_DASHBOARDS[role] ?? "/admin/dashboard", req.url));
  }

  if (isPublicPath) return NextResponse.next();

  if (!isProtectedRoute && pathname !== "/" && !pathname.startsWith('/superadmin')) {
    return NextResponse.next();
  }

  if (!hasSession) {
    const loginUrl = new URL("/login", req.url);
    if (isProtectedRoute || pathname === "/") loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/" && role) {
    return NextResponse.redirect(new URL(ROLE_DASHBOARDS[role] ?? "/login", req.url));
  }

  if (role) {
    for (const [prefix, allowed] of Object.entries(ROLE_ROUTES)) {
      if (pathname.startsWith(prefix) && !allowed.includes(role)) {
        return NextResponse.redirect(new URL(ROLE_DASHBOARDS[role] ?? "/", req.url));
      }
    }
  }

  if (planType) {
    for (const [prefix, feature] of Object.entries(FEATURE_ROUTES)) {
      if (pathname.startsWith(prefix)) {
        const requiredLevel = FEATURE_PLAN[feature];
        const currentLevel = PLAN_LEVEL[planType] ?? 0;
        if (currentLevel < requiredLevel) return NextResponse.redirect(new URL("/admin/billing", req.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|public/).*)"],
};