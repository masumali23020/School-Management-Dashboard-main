import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import { getSuperAdminSession } from "@/Actions/school/superadmin-login.action";
import SuperAdminPaymentsClient from "./superadmin-payments-client";

export default async function SuperAdminPaymentsPage() {
  const session = await getSuperAdminSession();
  if (!session) redirect("/superadmin/login");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [schools, payments, monthlyRevenue, yearlyRevenue] = await Promise.all([
    prisma.school.findMany({
      orderBy: { schoolName: "asc" },
      select: { id: true, schoolName: true, slug: true, expiredAt: true, plan: { select: { name: true } } },
    }),
    prisma.subscriptionPayment.findMany({
      orderBy: { paidAt: "desc" },
      take: 50,
      include: { school: { select: { schoolName: true, slug: true } } },
    }),
    prisma.subscriptionPayment.aggregate({
      _sum: { amount: true },
      where: { status: "PAID", paidAt: { gte: monthStart } },
    }),
    prisma.subscriptionPayment.aggregate({
      _sum: { amount: true },
      where: { status: "PAID", paidAt: { gte: yearStart } },
    }),
  ]);

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-[#6b7280]">Super Admin</p>
            <h1 className="text-2xl md:text-3xl font-bold">Subscription Payments</h1>
          </div>
          <Link
            href="/superadmin/dashboard"
            className="rounded-lg border border-[#2a2d3a] px-4 py-2 text-[#9ca3af] hover:text-white"
          >
            Back Dashboard
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-[#1f2130] bg-[#0f1117] p-4">
            <p className="text-xs uppercase tracking-wider text-[#6b7280]">Monthly Revenue</p>
            <p className="mt-2 text-2xl font-bold text-green-400">৳{Number(monthlyRevenue._sum.amount ?? 0).toLocaleString("en-BD")}</p>
          </div>
          <div className="rounded-xl border border-[#1f2130] bg-[#0f1117] p-4">
            <p className="text-xs uppercase tracking-wider text-[#6b7280]">Yearly Revenue</p>
            <p className="mt-2 text-2xl font-bold text-blue-400">৳{Number(yearlyRevenue._sum.amount ?? 0).toLocaleString("en-BD")}</p>
          </div>
        </div>

        <SuperAdminPaymentsClient schools={schools} payments={payments} />
      </div>
    </div>
  );
}
