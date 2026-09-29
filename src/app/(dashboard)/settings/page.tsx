import prisma from "@/lib/db";
import { getUserRoleAuth } from "@/lib/logsessition";
import { redirect } from "next/navigation";
import SchoolProfileClient from "../list/profile/SchoolProfileClient";


export default async function SchoolSettingPage() {
  const { role, schoolId } = await getUserRoleAuth();

  if (!schoolId) redirect("/sign-in");

  const school = await prisma.school.findUnique({
    where: { id: Number(schoolId) },
    include: {
      plan: true,
      _count: {
        select: {
          employees: true,
          students: true,
          parents: true,
          grades: true,
          classes: true,
          subjects: true,
        },
      },
    },
  });

  if (!school) redirect("/not-found");

  // ✅ Prisma result কে SchoolWithCount type-এ cast করা
  return <SchoolProfileClient school={school } role={role as string} />;
}