"use server";

// src/Actions/FinanceActions/financeActions.ts

import prisma from "@/lib/db";
import { getUserRole } from "@/lib/utlis";

// ── ROLE CHECK ─────────────────────────────────────────────
async function requireRole(...roles: string[]) {
  const { role } = await getUserRole();
  if (!roles.includes(role)) throw new Error("Unauthorized");
  return role;
}

// ── TYPES ──────────────────────────────────────────────────

export type FinanceTransaction = {
  id: number;
  invoiceNumber: string;
  type: "INCOME" | "EXPENSE";
  category: string;
  party: string;
  partyId: string;
  amount: number;
  paymentMethod: string;
  academicYear: string;
  monthLabel: string | null;
  paidAt: string;
  collectedBy: string;
  remarks: string | null;
};

export type FinanceSummary = {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  incomeCount: number;
  expenseCount: number;
  monthly: {
    month: string;
    income: number;
    expense: number;
  }[];
  incomeByCategory: { category: string; total: number; count: number }[];
  expenseByCategory: { category: string; total: number; count: number }[];
};

// ═══════════════════════════════════════════════════════════════
// GET FINANCE DATA
// ═══════════════════════════════════════════════════════════════

export async function getFinanceData(params: {
  academicYear?: string;
  month?: string;
  fromDate?: string;
  toDate?: string;
  type?: "INCOME" | "EXPENSE" | "";
}) {
  await requireRole("admin", "cashier");

  // ── Date Filter ─────────────────────────
  const dateFilter: any = {};
  if (params.fromDate || params.toDate) {
    if (params.fromDate) dateFilter.gte = new Date(params.fromDate);

    if (params.toDate) {
      const to = new Date(params.toDate);
      to.setHours(23, 59, 59, 999);
      dateFilter.lte = to;
    }
  }

  const yearFilter = params.academicYear || undefined;

  // ── INCOME: Student Fees ─────────────────
  const feePayments = await prisma.feePayment.findMany({
    where: {
      ...(yearFilter ? { academicYear: yearFilter } : {}),
      ...(params.month ? { monthLabel: params.month } : {}),
      ...(Object.keys(dateFilter).length ? { paidAt: dateFilter } : {}),
    },
    include: {
      student: { select: { name: true, surname: true } },
      classFeeStructure: {
        include: { feeType: true },
      },
    },
    orderBy: { paidAt: "desc" },
  });

  // ── EXPENSE: Employee Salary ─────────────
  const salaryPayments = await prisma.employeeSalaryPayment.findMany({
    where: {
      ...(yearFilter ? { academicYear: yearFilter } : {}),
      ...(params.month ? { monthLabel: params.month } : {}),
      ...(Object.keys(dateFilter).length ? { paidAt: dateFilter } : {}),
    },
    include: {
      employee: { select: { name: true, surname: true } },
      salaryType: { select: { name: true } },
      processedBy: { select: { name: true, surname: true } },
    },
    orderBy: { paidAt: "desc" },
  });

  // ── MAP INCOME ───────────────────────────
  const incomeRows: FinanceTransaction[] = feePayments.map((p) => ({
    id: p.id,
    invoiceNumber: p.invoiceNumber,
    type: "INCOME",
    category: p.classFeeStructure?.feeType?.name ?? "Fee",
    party: `${p.student.name} ${p.student.surname}`,
    partyId: p.studentId,
    amount: Number(p.amountPaid),
    paymentMethod: p.paymentMethod as string,
    academicYear: p.academicYear,
    monthLabel: p.monthLabel,
    paidAt: p.paidAt.toISOString(),
    collectedBy: p.collectedBy,
    remarks: p.remarks,
  }));

  // ── MAP EXPENSE ──────────────────────────
  const expenseRows: FinanceTransaction[] = salaryPayments.map((p) => ({
    id: p.id,
    invoiceNumber: p.invoiceNumber,
    type: "EXPENSE",
    category: p.salaryType?.name ?? "Salary",
    party: `${p.employee.name} ${p.employee.surname}`,
    partyId: p.employeeId,
    amount: Number(p.amountPaid),
    paymentMethod: p.paymentMethod as string,
    academicYear: p.academicYear,
    monthLabel: p.monthLabel,
    paidAt: p.paidAt.toISOString(),
    collectedBy: `${p.processedBy.name} ${p.processedBy.surname}`,
    remarks: p.remarks,
  }));

  // ── FILTER TYPE ──────────────────────────
  let allRows: FinanceTransaction[] = [];

  if (!params.type || params.type === "INCOME") {
    allRows.push(...incomeRows);
  }

  if (!params.type || params.type === "EXPENSE") {
    allRows.push(...expenseRows);
  }

  // ── SORT ────────────────────────────────
  allRows.sort(
    (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()
  );

  // ── SUMMARY ─────────────────────────────
  const totalIncome = incomeRows.reduce((s, r) => s + r.amount, 0);
  const totalExpense = expenseRows.reduce((s, r) => s + r.amount, 0);

  // Monthly breakdown
  const ALL_MONTHS = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];

  const monthlyMap: Record<string, { income: number; expense: number }> = {};

  ALL_MONTHS.forEach((m) => {
    monthlyMap[m] = { income: 0, expense: 0 };
  });

  incomeRows.forEach((r) => {
    const m =
      r.monthLabel ??
      new Date(r.paidAt).toLocaleString("en-GB", { month: "long" });

    if (monthlyMap[m]) monthlyMap[m].income += r.amount;
  });

  expenseRows.forEach((r) => {
    const m =
      r.monthLabel ??
      new Date(r.paidAt).toLocaleString("en-GB", { month: "long" });

    if (monthlyMap[m]) monthlyMap[m].expense += r.amount;
  });

  const monthly = ALL_MONTHS
    .filter(
      (m) => monthlyMap[m].income > 0 || monthlyMap[m].expense > 0
    )
    .map((m) => ({
      month: m,
      ...monthlyMap[m],
    }));

  // Category breakdown
  const incomeCatMap: Record<string, { total: number; count: number }> = {};
  incomeRows.forEach((r) => {
    if (!incomeCatMap[r.category])
      incomeCatMap[r.category] = { total: 0, count: 0 };

    incomeCatMap[r.category].total += r.amount;
    incomeCatMap[r.category].count++;
  });

  const expenseCatMap: Record<string, { total: number; count: number }> = {};
  expenseRows.forEach((r) => {
    if (!expenseCatMap[r.category])
      expenseCatMap[r.category] = { total: 0, count: 0 };

    expenseCatMap[r.category].total += r.amount;
    expenseCatMap[r.category].count++;
  });

  const summary: FinanceSummary = {
    totalIncome,
    totalExpense,
    netBalance: totalIncome - totalExpense,
    incomeCount: incomeRows.length,
    expenseCount: expenseRows.length,
    monthly,
    incomeByCategory: Object.entries(incomeCatMap)
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.total - a.total),

    expenseByCategory: Object.entries(expenseCatMap)
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.total - a.total),
  };

  return {
    success: true,
    transactions: allRows,
    summary,
  };
}

// ═══════════════════════════════════════════════════════════════
// GET ACADEMIC YEARS
// ═══════════════════════════════════════════════════════════════

export async function getFinanceAcademicYears() {
  await requireRole("admin", "cashier");

  const [feeYears, salaryYears] = await Promise.all([
    prisma.feePayment.findMany({
      distinct: ["academicYear"],
      select: { academicYear: true },
      orderBy: { academicYear: "desc" },
    }),
    prisma.employeeSalaryPayment.findMany({
      distinct: ["academicYear"],
      select: { academicYear: true },
      orderBy: { academicYear: "desc" },
    }),
  ]);

  const allYears = [
    ...feeYears.map((r) => r.academicYear),
    ...salaryYears.map((r) => r.academicYear),
  ];

  return Array.from(new Set(allYears)).sort().reverse();
}