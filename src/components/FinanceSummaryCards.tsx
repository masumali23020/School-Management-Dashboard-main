"use server";

import { auth } from "@/auth";
import prisma from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CircleDollarSign, ReceiptText, Wallet } from "lucide-react";
import { formatBDT } from "@/lib/currency";

async function getFinanceSummary(schoolId: number) {
  const [collectionAgg, expenseAgg, studentCollectionAgg, employeeSalaryAgg] = await Promise.all([
    prisma.collection.aggregate({
      where: { schoolId },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { schoolId },
      _sum: { amount: true },
    }),
    prisma.feePayment.aggregate({
      where: { schoolId },
      _sum: { amountPaid: true },
    }),
    prisma.employeeSalaryPayment.aggregate({
      where: { schoolId },
      _sum: { amountPaid: true },
    }),
  ]);

  const totalCollections = Number(collectionAgg._sum.amount || 0);
  const totalExpenses = Number(expenseAgg._sum.amount || 0);
  const totalStudentCollections = Number(studentCollectionAgg._sum.amountPaid || 0);
  const totalEmployeeSalaries = Number(employeeSalaryAgg._sum.amountPaid || 0);
  return {
    totalCollections,
    totalExpenses,
    totalStudentCollections,
    totalEmployeeSalaries,
    netBalance: totalCollections - totalExpenses,
  };
}

export default async function FinanceSummaryCards() {
  const session = await auth();
  const user = session?.user;
  if (!user?.schoolId || !user?.id) return null;
  if (!["ADMIN", "CASHIER"].includes(user.role)) return null;

  const summary = await getFinanceSummary(user.schoolId);

 const cards = [
  {
    title: "মোট সংগ্রহ",
    value: summary.totalCollections,
    icon: CircleDollarSign,
    color: "text-emerald-400",
    bgColor: "bg-emerald-50",
    description: "সর্বমোট আয়"
  },
  {
    title: "মোট শিক্ষার্থী ফি সংগ্রহ",
    value: summary.totalStudentCollections,
    icon: CircleDollarSign,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    description: "শিক্ষার্থীদের সর্বমোট ফি আদায়"
  },
  {
    title: "মোট খরচ",
    value: summary.totalExpenses,
    icon: ReceiptText,
    color: "text-rose-600",
    bgColor: "bg-rose-50",
    description: "সর্বমোট ব্যয়"
  },
  {
    title: "বর্তমান ব্যালেন্স",
    value: summary.netBalance,
    icon: Wallet,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    description: "বর্তমান নগদ অর্থ"
  },
  {
    title: "মোট কর্মচারী বেতন",
    value: summary.totalEmployeeSalaries,
    icon: CircleDollarSign,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    description: "সর্বমোট কর্মচারী বেতন প্রদান"
  }
];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cards.map((card, index) => (
        <Card key={index} className="overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold text-emerald-100 uppercase tracking-wider">
              {card.title}
            </CardTitle>
            <div className="p-2 rounded-lg bg-white/20">
              <card.icon className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {formatBDT(card.value)}
            </div>
            {card.description && (
              <p className="text-xs text-emerald-100 mt-1">
                {card.description}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}