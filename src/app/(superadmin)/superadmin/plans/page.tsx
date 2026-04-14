import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import { getSuperAdminSession } from "@/Actions/school/superadmin-login.action";
import SuperAdminPlansClient from "./superadmin-plans-client";

export default async function SuperAdminPlansPage() {
  const session = await getSuperAdminSession();
  if (!session) redirect("/superadmin/login");

  const plans = await prisma.subscriptionPlan.findMany({
    orderBy: { id: "asc" },
    include: {
      _count: { select: { schools: true } },
    },
  });

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-[#6b7280]">Super Admin</p>
            <h1 className="text-2xl md:text-3xl font-bold">Subscription Plans</h1>
          </div>
          <Link
            href="/superadmin/dashboard"
            className="rounded-lg border border-[#2a2d3a] px-4 py-2 text-[#9ca3af] hover:text-white"
          >
            Back Dashboard
          </Link>
        </div>

        <SuperAdminPlansClient plans={plans} />
      </div>
    </div>
  );
}
