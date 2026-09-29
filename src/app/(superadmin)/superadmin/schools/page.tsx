import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import { getSuperAdminSession } from "@/Actions/school/superadmin-login.action";
import SuperAdminSchoolsClient from "./superadmin-schools-client";

export default async function SuperAdminSchoolsPage() {
  const session = await getSuperAdminSession();
  if (!session) redirect("/superadmin/login");

  const [schools, plans] = await Promise.all([
    prisma.school.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        plan: true,
        _count: { select: { students: true, employees: true } },
      },
    }),
    prisma.subscriptionPlan.findMany({ orderBy: { id: "asc" } }),
  ]);

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white px-4 py-8 md:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-[#6b7280]">Super Admin</p>
            <h1 className="text-2xl md:text-3xl font-bold">Schools Management</h1>
          </div>
          <div className="flex gap-3">
            <Link
              href="/superadmin/dashboard"
              className="px-4 py-2 rounded-lg border border-[#2a2d3a] text-[#9ca3af] hover:text-white"
            >
              Back Dashboard
            </Link>
            <Link
              href="/superadmin/register-school"
              className="px-4 py-2 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8]"
            >
              + Register School
            </Link>
          </div>
        </div>

        <SuperAdminSchoolsClient schools={schools} plans={plans} />
      </div>
    </div>
  );
}
