// actions/superadmin-login.action.ts
// Super Admin login — সম্পূর্ণ আলাদা auth flow, school tenant থেকে isolated

"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { SignJWT } from "jose";
import  prisma  from "@/lib/db";
import { z } from "zod";

// ─── Validation Schema ────────────────────────────────────────────────────────
const LoginSchema = z.object({
  email:    z.string().email("Valid email required"),
  password: z.string().min(1, "Password is required"),
});

// ─── JWT Secret ───────────────────────────────────────────────────────────────
const SUPER_ADMIN_SECRET = new TextEncoder().encode(
  process.env.SUPER_ADMIN_JWT_SECRET ?? process.env.AUTH_SECRET ?? "fallback-secret"
);

const COOKIE_NAME = "superadmin_token";

// ─── Return type ──────────────────────────────────────────────────────────────
export type SuperAdminLoginResult =
  | { success: true }
  | { success: false; error: string; fieldErrors?: { email?: string[]; password?: string[] } };

// ─── Login Action ─────────────────────────────────────────────────────────────
export async function superAdminLoginAction(
  formData: FormData
): Promise<SuperAdminLoginResult> {

  // 1. Validate input
  const raw = {
    email:    formData.get("email")    as string,
    password: formData.get("password") as string,
  };

  const parsed = LoginSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { email, password } = parsed.data;

  // 2. Find SuperAdmin
  const superAdmin = await prisma.superAdmin.findUnique({
    where: { email },
  });

  if (!superAdmin) {
    // Timing-safe: still run bcrypt to prevent user enumeration
    await bcrypt.compare(password, "$2b$12$placeholder.hash.to.prevent.timing");
    return { success: false, error: "Invalid email or password." };
  }

  // 3. Verify password
  const isValid = await bcrypt.compare(password, superAdmin.password);
  if (!isValid) {
    return { success: false, error: "Invalid email or password." };
  }

  // 4. Sign JWT
  const token = await new SignJWT({
    sub:   String(superAdmin.id),
    name:  superAdmin.name,
    email: superAdmin.email,
    role:  "SUPER_ADMIN",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(SUPER_ADMIN_SECRET);

  // 5. Set httpOnly cookie
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   60 * 60 * 8, // 8 hours
    path:     "/superadmin",
  });

  return { success: true };
}

// ─── Logout Action ────────────────────────────────────────────────────────────
export async function superAdminLogoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// ─── Session Getter (use in Server Components & Route Handlers) ───────────────
export interface SuperAdminSession {
  id:    string;
  name:  string;
  email: string;
  role:  "SUPER_ADMIN";
}

export async function getSuperAdminSession(): Promise<SuperAdminSession | null> {
  try {
    const { jwtVerify } = await import("jose");
    const cookieStore   = await cookies();
    const token         = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) return null;

    const { payload } = await jwtVerify(token, SUPER_ADMIN_SECRET);

    return {
      id:    payload.sub as string,
      name:  payload.name  as string,
      email: payload.email as string,
      role:  "SUPER_ADMIN",
    };
  } catch {
    return null;
  }
}