// lib/get-session.ts
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types/auth";

/**
 * Returns the current session user or null.
 * Use inside Server Components / Route Handlers.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  return (session?.user as SessionUser) ?? null;
}

/**
 * Asserts that a valid session exists, redirecting to /login if not.
 * Optionally asserts that the user has one of the allowed roles.
 *
 * Usage:
 *   const user = await requireSession(["ADMIN", "TEACHER"]);
 */
export async function requireSession(
  allowedRoles?: SessionUser["role"][]
): Promise<SessionUser> {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;

  if (!user) {
    redirect("/login");
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user.role;
    if (!allowedRoles.includes(userRole)) {
      // Authenticated but wrong role — redirect to their own dashboard
      const dashboards: Record<string, string> = {
        ADMIN: "/admin/dashboard",
        TEACHER: "/teacher/dashboard",
        CASHIER: "/cashier/dashboard",
        STAFF: "/staff/dashboard",
        STUDENT: "/student/dashboard",
        PARENT: "/parent/dashboard",
      };
      redirect(dashboards[userRole] ?? "/");
    }
  }

  return user;
}