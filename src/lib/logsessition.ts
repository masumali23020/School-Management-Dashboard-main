// lib/logsessition.ts
import { auth } from "@/auth";
import { SessionUser } from "@/types/auth";
import prisma from "./db";

export async function getUserRoleAuth() {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;

  let school = null;
  
  // If user has schoolId, fetch complete school information
  if (user?.schoolId) {
    school = await prisma.school.findUnique({
      where: { id: user.schoolId },
      select: {
        id: true,
        schoolName: true,
        shortName: true,
        address: true,
        phone: true,
        email: true,
        logoUrl: true,
        bannerUrl: true,
        academicSession: true,
        isActive: true,
        slug: true,
        eiinNumber: true,
      }
    });
  }

  return {
    role: user?.role?.toLowerCase() || null,
    userId: user?.id || null,
    schoolId: user?.schoolId || null,
    name: user?.name || null,
    email: user?.email || null,
    school: school, // Complete school information
    schoolName: school?.schoolName || user?.schoolName || null,
    shortName: school?.shortName || null,
    academicSession: school?.academicSession || user?.academicSession || null,
  };
}