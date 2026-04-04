// types/auth.ts
// Centralized type definitions for the entire auth system

export type UserRole = "ADMIN" | "TEACHER" | "CASHIER" | "STAFF" | "STUDENT" ;
export type PlanType = "FREE" | "STANDARD" | "POPULAR";

export interface SessionUser {
  /** Auth.js `User.id` — same value as `userId` (employee/student primary key). */
  id: string;
  userId: string;
  role: UserRole;
  schoolId: number;
  planType: PlanType;
  name: string;
  username: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
  schoolId: number;
}

export interface SchoolRegistrationInput {
  schoolName: string;
  planType: PlanType;
  planId: number;
  expiredAt?: Date;
  adminUsername: string;
  adminPassword: string;
  adminName: string;
  adminSurname: string;
}

export type AuthError =
  | "USER_NOT_FOUND"
  | "INVALID_PASSWORD"
  | "SCHOOL_DISABLED"
  | "SUBSCRIPTION_EXPIRED"
  | "SCHOOL_NOT_FOUND"
  | "UNKNOWN_ERROR";

export const AUTH_ERROR_MESSAGES: Record<AuthError, string> = {
  USER_NOT_FOUND: "Invalid credentials. Please check your username.",
  INVALID_PASSWORD: "Invalid credentials. Please check your password.",
  SCHOOL_DISABLED:
    "Your school account has been disabled. Contact support.",
  SUBSCRIPTION_EXPIRED:
    "Your school's subscription has expired. Please renew.",
  SCHOOL_NOT_FOUND: "School not found. Please verify your School ID.",
  UNKNOWN_ERROR: "An unexpected error occurred. Please try again.",
};

/** Maps Auth.js / browser error strings to our `AuthError` codes. */
export function parseSignInError(error: string | undefined): AuthError {
  if (!error) return "UNKNOWN_ERROR";
  const direct = error as AuthError;
  if (direct in AUTH_ERROR_MESSAGES) return direct;
  // NextAuth v5 often returns this when authorize throws or returns null
  if (error === "CredentialsSignin") return "USER_NOT_FOUND";
  return "UNKNOWN_ERROR";
}
