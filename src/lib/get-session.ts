// lib/get-session.ts
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types/auth";
import prisma from "@/lib/db";

export async function requireSession(
  allowedRoles?: SessionUser["role"][]
): Promise<SessionUser> {
  const session = await auth();
  let user = session?.user as SessionUser | undefined;

  console.log("Session user:", user);

  if (!user) {
    redirect("/login");
  }

  // যদি user-এ schoolId না থাকে, তাহলে ডাটাবেস থেকে fetch করুন
  if (!user.schoolId && (user.email || user.username)) {
    const email = user.email || user.username;
    
    if (!email) {
      console.error("No email or username found in session");
      return user;
    }
    
    const dbUser = await prisma.employee.findUnique({
      where: { email: email },
      include: {
        school: {
          include: {
            plan: true
          }
        }
      }
    });

    if (dbUser && dbUser.school) {
      // Create a new user object with all properties
      const enhancedUser: SessionUser = {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email || email,
        role: dbUser.role,
        schoolId: dbUser.schoolId,
        schoolName: dbUser.school.shortName || dbUser.school.schoolName,
        schoolLogo: dbUser.school.logoUrl || undefined,
        planType: dbUser.school.plan?.name,
        academicSession: dbUser.school.academicSession,
      };
      
      user = enhancedUser;
    } else {
      console.log("No employee found with email:", email);
    }
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user.role;
    if (!allowedRoles.includes(userRole)) {
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