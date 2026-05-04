// middleware.ts — avoid importing ./auth (pulls Prisma into Edge); use getToken instead.
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { superAdminJwtSecret } from "@/lib/superadmin-jwt-secret";
import type { PlanType, UserRole } from "@/types/auth";

// ─── Native JWT verification (replaces jose) ──────────────────────────────────
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

/** Same resolution as next-auth (see next-auth/lib/env.js): AUTH_SECRET || NEXTAUTH_SECRET */
function authSecret(): string | undefined {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
}

/** Match Auth.js cookie names: __Secure- prefix only when the session cookie was set with secure: true */
function useSecureSessionCookie(req: NextRequest): boolean {
  return (
    req.nextUrl.protocol === "https:" ||
    req.headers.get("x-forwarded-proto") === "https"
  );
}

/** Decode session JWT; retry alternate cookie mode if host/proto detection mismatches */
async function getAuthJwt(req: NextRequest, secret: string) {
  const https = useSecureSessionCookie(req);
  let token = await getToken({ req, secret, secureCookie: https });
  if (!token) {
    token = await getToken({ req, secret, secureCookie: !https });
  }
  return token;
}

// ─── Route Config (no external imports) ───────────────────────────────────────
type Feature =
  | "sms_panel"
  | "analytics"
  | "advanced_reports"
  | "custom_branding"
  | "bulk_import"
  | "api_access";

const PLAN_LEVEL: Record<PlanType, number> = { FREE: 0, STANDARD: 1, POPULAR: 2 };

const FEATURE_PLAN: Record<Feature, number> = {
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
};

const PUBLIC_PATHS = ["/login", "/api/auth", "/_next", "/favicon.ico"];
const SUPER_PREFIX = "/superadmin";
const SUPER_LOGIN = "/superadmin/login";

// ─── Middleware ────────────────────────────────────────────────────────────────
export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ═══ BRANCH A: Super Admin ══════════════════════════════════════════════════
  if (pathname.startsWith(SUPER_PREFIX)) {
    const superSecret = superAdminJwtSecret();
    const token = req.cookies.get("superadmin_token")?.value;

    if (pathname === SUPER_LOGIN) {
      if (token && (await verifyJWT(token, superSecret))) {
        return NextResponse.redirect(new URL("/superadmin/dashboard", req.url));
      }
      return NextResponse.next();
    }

    if (!token || !(await verifyJWT(token, superSecret))) {
      const res = NextResponse.redirect(new URL(SUPER_LOGIN, req.url));
      res.cookies.set("superadmin_token", "", {
        maxAge: 0,
        path: "/superadmin",
      });
      return res;
    }
    return NextResponse.next();
  }


  // 2. Public Path Check
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  const secret = authSecret();
  if (!secret) {
    console.error(
      "[middleware] Set AUTH_SECRET or NEXTAUTH_SECRET (required to read the session cookie)."
    );
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const token = await getAuthJwt(req, secret);

  const role = token?.role as UserRole | undefined;
  const planType = token?.planType as PlanType | undefined;
  const hasSession = !!role;

  // 3. ডায়নামিক পাবলিক রুট হ্যান্ডলিং (School Slug)
  // চেক করুন রুটটি প্রটেক্টেড কি না। যদি প্রটেক্টেড না হয়, তবে সেটা পাবলিক।
  const isProtectedRoute = Object.keys(ROLE_ROUTES).some((route) => 
    pathname.startsWith(route)
  );

  // যদি রুটটি প্রটেক্টেড না হয় (যেমন: /bagulat-high-school), তবে সেটা এক্সেস করতে দাও
  if (!isProtectedRoute && pathname !== "/" && !pathname.startsWith('/superadmin')) {
    return NextResponse.next();
  }

  // 4. লগইন করা থাকলে লগইন পেজ থেকে ড্যাশবোর্ডে পাঠানো
  if (pathname === "/login" && role) {
    return NextResponse.redirect(new URL(ROLE_DASHBOARDS[role] ?? "/", req.url));
  }

  // 5. প্রটেক্টেড রুট কিন্তু সেশন নেই -> লগইন এ পাঠাও
  if (isProtectedRoute && !hasSession) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }



  // Redirect logged-in users away from login
  if (pathname === "/login" && role) {
    return NextResponse.redirect(
      new URL(ROLE_DASHBOARDS[role] ?? "/", req.url)
    );
  }

  if (isPublic) return NextResponse.next();

  // No session → redirect to login
  if (!hasSession) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Root redirect
  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(ROLE_DASHBOARDS[role] ?? "/login", req.url)
    );
  }

  // Role check
  for (const [prefix, allowed] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(prefix) && !allowed.includes(role)) {
      return NextResponse.redirect(
        new URL(ROLE_DASHBOARDS[role] ?? "/", req.url)
      );
    }
  }

  // Feature / Plan check
  if (planType) {
    for (const [prefix, feature] of Object.entries(FEATURE_ROUTES)) {
      if (pathname.startsWith(prefix)) {
        const requiredLevel = FEATURE_PLAN[feature];
        const currentLevel = PLAN_LEVEL[planType] ?? 0;
        if (currentLevel < requiredLevel) {
          const upgradeUrl = new URL("/admin/billing", req.url);
          upgradeUrl.searchParams.set("feature", feature);
          upgradeUrl.searchParams.set("from", pathname);
          return NextResponse.redirect(upgradeUrl);
        }
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|public/).*)",
  ],
};