import { decode, encode } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import type { SessionUser } from "@/types/auth";

const MOBILE_TOKEN_MAX_AGE = 60 * 60 * 24 * 30;
const MOBILE_TOKEN_SALT = "mobile-api-token";

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET or NEXTAUTH_SECRET is not configured");
  return secret;
}

export async function createMobileToken(user: SessionUser) {
  return encode({
    token: user,
    secret: getAuthSecret(),
    salt: MOBILE_TOKEN_SALT,
    maxAge: MOBILE_TOKEN_MAX_AGE,
  });
}

export async function getMobileUser(request: NextRequest): Promise<SessionUser | null> {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;

  const token = authorization.slice("Bearer ".length).trim();
  if (!token) return null;

  const payload = await decode({
    token,
    secret: getAuthSecret(),
    salt: MOBILE_TOKEN_SALT,
  });

  if (!payload?.id || !payload.userId || !payload.role || !payload.schoolId) {
    return null;
  }

  return {
    id: String(payload.id),
    userId: String(payload.userId),
    name: String(payload.name ?? ""),
    username: payload.username ? String(payload.username) : undefined,
    email: payload.email ? String(payload.email) : undefined,
    role: payload.role as SessionUser["role"],
    schoolId: Number(payload.schoolId),
    planType: payload.planType as SessionUser["planType"],
  };
}
import { decode, encode, type JWT } from "next-auth/jwt";
import { NextRequest } from "next/server";

export type MobileRole = "ADMIN" | "CASHIER" | "TEACHER" | "STAFF" | "STUDENT" | "PARENT";

export type MobileToken = JWT & {
  sub: string;
  role: MobileRole;
  schoolId: number;
  userType: "employee" | "student" | "parent";
};

function getSecret() {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET or NEXTAUTH_SECRET is not configured");
  return secret;
}

export async function createMobileToken(token: Omit<MobileToken, "iat" | "exp" | "jti">) {
  return encode({ secret: getSecret(), token, maxAge: 60 * 60 * 24 * 30 });
}

export async function getMobileToken(request: NextRequest): Promise<MobileToken | null> {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;

  const token = await decode({
    token: authorization.slice("Bearer ".length).trim(),
    secret: getSecret(),
  });

  if (!token?.sub || !token.schoolId || !token.role || !token.userType) return null;
  return token as MobileToken;
}