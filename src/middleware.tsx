// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import type { PlanType, UserRole } from "@/types/auth";

// ─── Native JWT verification (Super Admin) ──────────────────────────────────
async function verifyJWT(token: string, secret: string): Promise<boolean> {
  try {
    const keyData = new TextEncoder().encode(secret);
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const [headerB64, payloadB64, sigB64] = token.split(".");
    if (!headerB64 || !payloadB64 || !sigB64) return false;
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const sig = Uint8Array.from(
      atob(sigB64.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0)
    );
    return await crypto.subtle.verify("HMAC", key, sig, data);
  } catch {
    return false;
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────
// IMPORTANT: Add ALL static file paths here to prevent middleware from running on them
const STATIC_FILES = [
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/favicon.ico",
  "/results.png",
  "/student.png",
  "/teacher.png",
  "/staff.png",
  "/cashier.png",
  "/avatar.png",
  "/view.png",
  "/filter.png",
  "/sort.png",
  "/logo.png",
];

const PUBLIC_PATHS = [
  "/login",
  "/api/auth",
  "/_next",
  "/favicon.ico",
  "/public",
  "/manifest.webmanifest",
  "/icon",
  ...STATIC_FILES,
];

const SUPER_PREFIX = "/superadmin";
const SUPER_LOGIN = "/superadmin/login";

const PLAN_LEVEL: Record<string, number> = {
  FREE: 0,
  STANDARD: 1,
  POPULAR: 2,
};

const FEATURE_PLAN: Record<string, number> = {
  sms_panel: 2,
  analytics: 2,
  advanced_reports: 1,
  custom_branding: 2,
  bulk_import: 1,
  api_access: 1,
};

const ROLE_ROUTES: Record<string, UserRole[]> = {
  "/admin": ["ADMIN"],
  "/teacher": ["TEACHER", "ADMIN"],
  "/cashier": ["CASHIER", "ADMIN"],
  "/staff": ["STAFF", "ADMIN"],
  "/student": ["STUDENT", "ADMIN"],
};

const FEATURE_ROUTES: Record<string, string> = {
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
};

// ─── Helper: Check if path is static file ──────────────────────────────────
function isStaticFile(pathname: string): boolean {
  // Check for common static file extensions
  if (
    pathname.match(
      /\.(png|jpg|jpeg|gif|svg|ico|webp|css|js|map|woff|woff2|ttf|eot)$/
    )
  ) {
    return true;
  }
  
  // Check against known static file paths
  return STATIC_FILES.some((file) => pathname === file || pathname.startsWith(file));
}

// ─── Helper: Check if path is public ───────────────────────────────────────
function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p)
  );
}

// ─── Middleware ────────────────────────────────────────────────────────────────
export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ═══ BRANCH 0: Skip middleware for static files and public assets ═══════════
  if (isStaticFile(pathname)) {
    return NextResponse.next();
  }

  // ═══ BRANCH A: Super Admin ══════════════════════════════════════════════════
  if (pathname.startsWith(SUPER_PREFIX)) {
    const superAdminSecret = process.env.SUPER_ADMIN_JWT_SECRET;
    if (!superAdminSecret) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    
    const token = req.cookies.get("superadmin_token")?.value;

    if (pathname === SUPER_LOGIN) {
      if (token && (await verifyJWT(token, superAdminSecret))) {
        return NextResponse.redirect(new URL("/superadmin/dashboard", req.url));
      }
      return NextResponse.next();
    }

    if (!token || !(await verifyJWT(token, superAdminSecret))) {
      const res = NextResponse.redirect(new URL(SUPER_LOGIN, req.url));
      res.cookies.delete("superadmin_token");
      return res;
    }
    return NextResponse.next();
  }

  // ═══ BRANCH B: Skip middleware for public paths ════════════════════════════
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // ═══ BRANCH C: General Auth Check ══════════════════════════════════════════
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
    });

    const role = token?.role as UserRole | undefined;
    const planType = token?.planType as PlanType | undefined;
    const hasSession = !!token;

    const isProtectedRoute = Object.keys(ROLE_ROUTES).some((route) =>
      pathname.startsWith(route)
    );

    // Handle root path
    if (pathname === "/") {
      if (hasSession && role) {
        return NextResponse.redirect(
          new URL(ROLE_DASHBOARDS[role] ?? "/login", req.url)
        );
      }
      // Allow access to root without redirect for unauthenticated users
      return NextResponse.next();
    }

    // Redirect to dashboard if logged in and trying to access login
    if (pathname === "/login" && hasSession && role) {
      return NextResponse.redirect(
        new URL(ROLE_DASHBOARDS[role] ?? "/admin/dashboard", req.url)
      );
    }

    // Protect routes that require authentication
    if (!hasSession && isProtectedRoute) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Role-based access control
    if (hasSession && role) {
      for (const [prefix, allowed] of Object.entries(ROLE_ROUTES)) {
        if (pathname.startsWith(prefix) && !allowed.includes(role)) {
          return NextResponse.redirect(
            new URL(ROLE_DASHBOARDS[role] ?? "/login", req.url)
          );
        }
      }
    }

    // Plan-based feature access control
    if (hasSession && planType) {
      for (const [prefix, feature] of Object.entries(FEATURE_ROUTES)) {
        if (pathname.startsWith(prefix)) {
          const requiredLevel = FEATURE_PLAN[feature];
          const currentLevel = PLAN_LEVEL[planType] ?? 0;
          if (currentLevel < requiredLevel) {
            return NextResponse.redirect(new URL("/admin/billing", req.url));
          }
        }
      }
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Middleware error:", error);
    // If there's an error in middleware, allow the request to proceed
    // This prevents the loop when getToken fails
    return NextResponse.next();
  }
}

// ─── Matcher Configuration ──────────────────────────────────────────────────
// Only run middleware on specific paths, excluding static assets and Next.js internals
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - All static asset extensions
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|webmanifest|xml|txt)).*)",
  ],
};