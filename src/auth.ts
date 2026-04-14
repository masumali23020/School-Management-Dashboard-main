// auth.ts  (project root — Next.js 15 Auth.js v5 config)
// Multi-tenant, role-based authentication with single-query optimization

import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import  prisma  from "@/lib/db";
import type { SessionUser, AuthError } from "@/types/auth";
import { authDebugServer } from "@/lib/auth-debug";

// ─── Module Augmentation ─────────────────────────────────────────────────────
// Extend the built-in session/JWT types so TypeScript knows about our fields.

declare module "next-auth" {
  interface Session {
    user: SessionUser & DefaultSession["user"];
  }
  interface User extends SessionUser {}
}

declare module "next-auth/jwt" {
  interface JWT extends SessionUser {}
}

// ─── Auth.js Configuration ───────────────────────────────────────────────────

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },

  providers: [
    Credentials({
      name: "School Login",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        schoolId: { label: "School ID", type: "number" },
      },

      async authorize(credentials) {
        const { username, password, schoolId } = credentials as {
          username: string;
          password: string;
          schoolId: string;
        };

        try {
          if (!username || !password || !schoolId) {
            authDebugServer("authorize: missing field", {
              hasUsername: !!username,
              hasPassword: !!password,
              hasSchoolId: !!schoolId,
            });
            throw new Error("USER_NOT_FOUND" satisfies AuthError);
          }

          const schoolIdNum = parseInt(schoolId, 10);
          if (!Number.isFinite(schoolIdNum) || schoolIdNum < 1) {
            authDebugServer("authorize: invalid schoolId", { schoolId });
            throw new Error("SCHOOL_NOT_FOUND" satisfies AuthError);
          }

          const loginKey = username.trim();

          authDebugServer("authorize: lookup", {
            loginKey,
            schoolId: schoolIdNum,
          });

          const employeeInclude = {
            school: {
              include: {
                plan: true,
                _count: {
                  select: {
                    students: true,
                    employees: true,
                  },
                },
              },
            },
          } as const;

          // ── Step 1: Employee by username, else by internal id (e.g. emp_xxx) ─
          let employee = await prisma.employee.findFirst({
            where: {
              username: loginKey,
              schoolId: schoolIdNum,
            },
            include: employeeInclude,
          });

          if (!employee) {
            employee = await prisma.employee.findFirst({
              where: {
                id: loginKey,
                schoolId: schoolIdNum,
              },
              include: employeeInclude,
            });
            if (employee) {
              authDebugServer("authorize: employee match by id (Admin ID)", {
                id: employee.id,
              });
            }
          }

          if (employee) {
            authDebugServer("authorize: employee match", {
              id: employee.id,
              role: employee.role,
            });
            return await verifyAndBuildUser({
              id: employee.id,
              username: employee.username,
              password: employee.password ?? "",
              name: employee.name,
              role: employee.role as SessionUser["role"],
              school: employee.school,
              inputPassword: password,
            });
          }

          // ── Step 2: Student by username, else by student id ─────────────────
          let student = await prisma.student.findFirst({
            where: {
              username: loginKey,
              schoolId: schoolIdNum,
            },
            include: {
              school: {
                include: {
                  plan: true,
                  _count: {
                    select: {
                      students: true,
                      employees: true,
                    },
                  },
                },
              },
            },
          });

          if (!student) {
            student = await prisma.student.findFirst({
              where: {
                id: loginKey,
                schoolId: schoolIdNum,
              },
              include: {
                school: {
                  include: {
                    plan: true,
                    _count: {
                      select: {
                        students: true,
                        employees: true,
                      },
                    },
                  },
                },
              },
            });
            if (student) {
              authDebugServer("authorize: student match by id", { id: student.id });
            }
          }

          if (student) {
            authDebugServer("authorize: student match", { id: student.id });
            return await verifyAndBuildUser({
              id: student.id,
              username: student.username,
              password: student.password ?? "",
              name: student.name,
              role: "STUDENT",
              school: student.school,
              inputPassword: password,
            });
          }

          authDebugServer("authorize: no user for school/loginKey", {
            schoolId: schoolIdNum,
            loginKey,
          });
          throw new Error("USER_NOT_FOUND" satisfies AuthError);
        } catch (e) {
          const known: AuthError[] = [
            "USER_NOT_FOUND",
            "INVALID_PASSWORD",
            "SCHOOL_DISABLED",
            "SUBSCRIPTION_EXPIRED",
            "PLAN_LIMIT_REACHED",
            "SCHOOL_NOT_FOUND",
            "UNKNOWN_ERROR",
          ];
          if (e instanceof Error && known.includes(e.message as AuthError)) {
            authDebugServer("authorize: rejected", { code: e.message });
            throw e;
          }
          console.error("[auth:server] authorize: unexpected error", e);
          throw new Error("UNKNOWN_ERROR" satisfies AuthError);
        }
      },
    }),
  ],

  // ── JWT Callback: persist custom fields into the token ──────────────────────
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const uid = user.userId ?? user.id;
        token.userId = uid;
        token.role = user.role;
        token.schoolId = user.schoolId;
        token.planType = user.planType;
        token.name = user.name;
        token.username = user.username;
      }
      return token;
    },

    // ── Session Callback: expose token fields to the client session ────────────
    async session({ session, token }) {
      const uid = token.userId as string;
      session.user.id = uid;
      session.user.userId = uid;
      session.user.role = token.role as SessionUser["role"];
      session.user.schoolId = token.schoolId as number;
      session.user.planType = token.planType as SessionUser["planType"];
      session.user.name = token.name as string;
      session.user.username = token.username as string;
      return session;
    },

    // ── Redirect callback: keep it simple and defer to middleware/app pages for role-based routes
    async redirect({ url, baseUrl }) {
      // On successful sign-in, landing route is controlled by middleware + frontend logic.
      return baseUrl;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login", // Redirect to login with ?error= param
  },
});

// ─── Helper: Verify password + school status, then build the user object ──────

interface VerifyInput {
  id: string;
  username: string;
  password: string;
  name: string;
  role: SessionUser["role"];
  school: {
    id: number;
    isActive: boolean;
    expiredAt: Date | null;
    plan: {
      name: SessionUser["planType"];
      maxStudents: number;
      maxEmployees: number;
    };
    _count: {
      students: number;
      employees: number;
    };
  };
  inputPassword: string;
}

async function verifyAndBuildUser(input: VerifyInput): Promise<SessionUser> {
  const { id, username, password, name, role, school, inputPassword } = input;

  // Security check 1: school must be active
  if (!school.isActive) {
    throw new Error("SCHOOL_DISABLED" satisfies AuthError);
  }

  // Security check 2: subscription must not be expired
  if (school.expiredAt && school.expiredAt < new Date()) {
    throw new Error("SUBSCRIPTION_EXPIRED" satisfies AuthError);
  }

  // Security check 3: plan limits must be respected
  const studentLimitReached =
    school.plan.maxStudents > 0 && school._count.students >= school.plan.maxStudents;
  const employeeLimitReached =
    school.plan.maxEmployees > 0 && school._count.employees >= school.plan.maxEmployees;

  if (studentLimitReached || employeeLimitReached) {
    throw new Error("PLAN_LIMIT_REACHED" satisfies AuthError);
  }

  // Security check 4: bcrypt password verification
  const isValidPassword = await bcrypt.compare(inputPassword, password);
  if (!isValidPassword) {
    throw new Error("INVALID_PASSWORD" satisfies AuthError);
  }

  return {
    id,
    userId: id,
    username,
    name,
    role,
    schoolId: school.id,
    planType: school.plan.name,
  };
}
