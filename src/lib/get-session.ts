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

  // Hard access guard: suspended/expired/plan-limit reached school users are forced to logout.
  if (user.schoolId) {
    const school = await prisma.school.findUnique({
      where: { id: user.schoolId },
      include: {
        plan: {
          select: {
            maxStudents: true,
            maxEmployees: true,
          },
        },
        _count: {
          select: {
            students: true,
            employees: true,
          },
        },
      },
    });

    if (!school) {
      redirect("/?account=SCHOOL_NOT_FOUND");
    }

    if (!school.isActive) {
      redirect("/?account=SCHOOL_DISABLED");
    }

    if (school.expiredAt && school.expiredAt < new Date()) {
      redirect("/?account=SUBSCRIPTION_EXPIRED");
    }

    const studentsLimitReached =
      school.plan.maxStudents > 0 && school._count.students >= school.plan.maxStudents;
    const employeesLimitReached =
      school.plan.maxEmployees > 0 && school._count.employees >= school.plan.maxEmployees;

    if (studentsLimitReached || employeesLimitReached) {
      redirect("/?account=PLAN_LIMIT_REACHED");
    }
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
        userId: dbUser.id
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