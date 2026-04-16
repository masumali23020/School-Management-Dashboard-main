"use server";

// src/Actions/FinanceActions/financeActions.ts

import prisma from "@/lib/db";
import { getUserRoleAuth } from "@/lib/logsessition";

// ── ROLE CHECK WITH SCHOOL ID ─────────────────────────────────────────────
async function requireRoleAndSchool(...roles: string[]) {
  const { role, schoolId, userId } = await getUserRoleAuth();
  if (!roles.includes(role as string)) throw new Error("Unauthorized");
  if (!schoolId) throw new Error("No school found for this account");
  return { role, schoolId: Number(schoolId), userId };
}

// Helper to get user's display name
async function getUserDisplayName(userId: string, schoolId: number): Promise<string> {
  try {
    // First try to get from Employee table
    const employee = await prisma.employee.findFirst({
      where: { 
        id: userId,
        schoolId: schoolId
      },
      select: { name: true, surname: true }
    });
    
    if (employee) {
      return `${employee.name} ${employee.surname}`.trim();
    }
    
    // Fallback to Admin table
    const admin = await prisma.employee.findFirst({
      where: { 
        id: userId,
        schoolId: schoolId
      },
      select: { username: true }
    });
    
    if (admin?.username) {
      return admin.username;
    }
    
    return userId; // Return userId as last resort
  } catch {
    return userId;
  }
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
  collectedByName: string; // Added for display name
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
// GET FINANCE DATA - SCHOOL WISE
// ═══════════════════════════════════════════════════════════════

export async function getFinanceData(params: {
  academicYear?: string;
  month?: string;
  fromDate?: string;
  toDate?: string;
  type?: "INCOME" | "EXPENSE" | "";
}) {
  try {
    const { schoolId } = await requireRoleAndSchool("admin", "cashier");

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

    // ── INCOME: Student Fees (School Wise) ─────────────────
    const feePayments = await prisma.feePayment.findMany({
      where: {
        schoolId: schoolId,
        ...(yearFilter ? { academicYear: yearFilter } : {}),
        ...(params.month ? { monthLabel: params.month } : {}),
        ...(Object.keys(dateFilter).length ? { paidAt: dateFilter } : {}),
      },
      include: {
        student: { select: { name: true, surname: true } },
        classFeeStructure: {
          include: { feeType: true },
        },
        collectedBy: { select: { name: true, surname: true } }, // Get employee details
      },
      orderBy: { paidAt: "desc" },
    });

    // ── EXPENSE: Employee Salary (School Wise) ─────────────
    const salaryPayments = await prisma.employeeSalaryPayment.findMany({
      where: {
        schoolId: schoolId,
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
    const incomeRows: FinanceTransaction[] = await Promise.all(feePayments.map(async (p) => {
      const collectedByName = p.collectedBy
        ? `${p.collectedBy.name} ${p.collectedBy.surname}`.trim()
        : await getUserDisplayName(p.collectedById, schoolId);
      
      return {
        id: p.id,
        invoiceNumber: p.invoiceNumber,
        type: "INCOME" as const,
        category: p.classFeeStructure?.feeType?.name ?? "Fee",
        party: `${p.student.name} ${p.student.surname}`,
        partyId: p.studentId,
        amount: Number(p.amountPaid),
        paymentMethod: p.paymentMethod as string,
        academicYear: p.academicYear,
        monthLabel: p.monthLabel,
        paidAt: p.paidAt.toISOString(),
        collectedBy: p.collectedById,
        collectedByName: collectedByName,
        remarks: p.remarks,
      };
    }));

    // ── MAP EXPENSE ──────────────────────────
    const expenseRows: FinanceTransaction[] = salaryPayments.map((p) => {
      const processedByName = p.processedBy
        ? `${p.processedBy.name} ${p.processedBy.surname}`.trim()
        : "System";
      
      return {
        id: p.id,
        invoiceNumber: p.invoiceNumber,
        type: "EXPENSE" as const,
        category: p.salaryType?.name ?? "Salary",
        party: `${p.employee.name} ${p.employee.surname}`,
        partyId: p.employeeId,
        amount: Number(p.amountPaid),
        paymentMethod: p.paymentMethod as string,
        academicYear: p.academicYear,
        monthLabel: p.monthLabel,
        paidAt: p.paidAt.toISOString(),
        collectedBy: p.processedById,
        collectedByName: processedByName,
        remarks: p.remarks,
      };
    });

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
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    const monthlyMap: Record<string, { income: number; expense: number }> = {};

    ALL_MONTHS.forEach((m) => {
      monthlyMap[m] = { income: 0, expense: 0 };
    });

    incomeRows.forEach((r) => {
      const m = r.monthLabel ??
        new Date(r.paidAt).toLocaleString("en-GB", { month: "long" });

      if (monthlyMap[m]) monthlyMap[m].income += r.amount;
    });

    expenseRows.forEach((r) => {
      const m = r.monthLabel ??
        new Date(r.paidAt).toLocaleString("en-GB", { month: "long" });

      if (monthlyMap[m]) monthlyMap[m].expense += r.amount;
    });

    const monthly = ALL_MONTHS
      .filter((m) => monthlyMap[m].income > 0 || monthlyMap[m].expense > 0)
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
  } catch (e: any) {
    if (e?.message?.includes("Unauthorized")) {
      return { success: false, error: e.message, transactions: [], summary: null };
    }
    console.error("[getFinanceData] error:", e);
    return { success: false, error: "Failed to fetch finance data", transactions: [], summary: null };
  }
}

// ═══════════════════════════════════════════════════════════════
// GET ACADEMIC YEARS - SCHOOL WISE
// ═══════════════════════════════════════════════════════════════

export async function getFinanceAcademicYears() {
  try {
    const { schoolId } = await requireRoleAndSchool("admin", "cashier");

    const [feeYears, salaryYears] = await Promise.all([
      prisma.feePayment.findMany({
        where: { schoolId: schoolId },
        distinct: ["academicYear"],
        select: { academicYear: true },
        orderBy: { academicYear: "desc" },
      }),
      prisma.employeeSalaryPayment.findMany({
        where: { schoolId: schoolId },
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
  } catch (e: any) {
    if (e?.message?.includes("Unauthorized")) {
      return [];
    }
    console.error("[getFinanceAcademicYears] error:", e);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// GET FINANCE SUMMARY ONLY (for dashboard widgets)
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// GET FINANCE SUMMARY ONLY (for dashboard widgets)
// ═══════════════════════════════════════════════════════════════

export async function getFinanceSummary(academicYear?: string) {
  try {
    const { schoolId } = await requireRoleAndSchool("admin", "cashier");

    const yearFilter = academicYear || undefined;

    // Get income summary
    const incomeAggregate = await prisma.feePayment.aggregate({
      where: {
        schoolId: schoolId,
        ...(yearFilter ? { academicYear: yearFilter } : {}),
      },
      _sum: { amountPaid: true },
      _count: true,
    });

    // Get expense summary
    const expenseAggregate = await prisma.employeeSalaryPayment.aggregate({
      where: {
        schoolId: schoolId,
        ...(yearFilter ? { academicYear: yearFilter } : {}),
      },
      _sum: { amountPaid: true },
      _count: true,
    });

    // Convert Decimal to number
    const totalIncome = incomeAggregate._sum.amountPaid 
      ? Number(incomeAggregate._sum.amountPaid) 
      : 0;
    const totalExpense = expenseAggregate._sum.amountPaid 
      ? Number(expenseAggregate._sum.amountPaid) 
      : 0;

    // Get current month's income and expense
    const currentMonth = new Date().toLocaleString("en-GB", { month: "long" });
    const currentYear = academicYear || (() => {
      const y = new Date().getFullYear();
      return `${y}-${y + 1}`;
    })();

    const currentMonthIncome = await prisma.feePayment.aggregate({
      where: {
        schoolId: schoolId,
        academicYear: currentYear,
        monthLabel: currentMonth,
      },
      _sum: { amountPaid: true },
    });

    const currentMonthExpense = await prisma.employeeSalaryPayment.aggregate({
      where: {
        schoolId: schoolId,
        academicYear: currentYear,
        monthLabel: currentMonth,
      },
      _sum: { amountPaid: true },
    });

    // Convert Decimal to number for current month as well
    const currentMonthIncomeAmount = currentMonthIncome._sum.amountPaid 
      ? Number(currentMonthIncome._sum.amountPaid) 
      : 0;
    const currentMonthExpenseAmount = currentMonthExpense._sum.amountPaid 
      ? Number(currentMonthExpense._sum.amountPaid) 
      : 0;

    return {
      success: true,
      data: {
        totalIncome,
        totalExpense,
        netBalance: totalIncome - totalExpense,
        incomeCount: incomeAggregate._count,
        expenseCount: expenseAggregate._count,
        currentMonthIncome: currentMonthIncomeAmount,
        currentMonthExpense: currentMonthExpenseAmount,
        currentMonthNet: currentMonthIncomeAmount - currentMonthExpenseAmount,
      },
    };
  } catch (e: any) {
    if (e?.message?.includes("Unauthorized")) {
      return { success: false, error: e.message, data: null };
    }
    console.error("[getFinanceSummary] error:", e);
    return { success: false, error: "Failed to fetch finance summary", data: null };
  }
}

// ═══════════════════════════════════════════════════════════════
// GET RECENT TRANSACTIONS (for dashboard)
// ═══════════════════════════════════════════════════════════════

export async function getRecentTransactions(limit: number = 10) {
  try {
    const { schoolId } = await requireRoleAndSchool("admin", "cashier");

    // Get recent fee payments
    const recentFees = await prisma.feePayment.findMany({
      where: { schoolId: schoolId },
      take: limit,
      orderBy: { paidAt: "desc" },
      include: {
        student: { select: { name: true, surname: true } },
        classFeeStructure: { include: { feeType: true } },
        collectedBy: { select: { name: true, surname: true } },
      },
    });

    // Get recent salary payments
    const recentSalaries = await prisma.employeeSalaryPayment.findMany({
      where: { schoolId: schoolId },
      take: limit,
      orderBy: { paidAt: "desc" },
      include: {
        employee: { select: { name: true, surname: true } },
        salaryType: { select: { name: true } },
        processedBy: { select: { name: true, surname: true } },
      },
    });

    // Combine and sort
    const allTransactions = [
      ...recentFees.map((p) => ({
        id: p.id,
        type: "INCOME" as const,
        description: `${p.student.name} ${p.student.surname} - ${p.classFeeStructure?.feeType?.name}`,
        amount: p.amountPaid,
        date: p.paidAt,
        invoiceNumber: p.invoiceNumber,
        collectedBy: p.collectedBy ? `${p.collectedBy.name} ${p.collectedBy.surname}`.trim() : "System",
      })),
      ...recentSalaries.map((p) => ({
        id: p.id,
        type: "EXPENSE" as const,
        description: `${p.employee.name} ${p.employee.surname} - ${p.salaryType?.name}`,
        amount: p.amountPaid,
        date: p.paidAt,
        invoiceNumber: p.invoiceNumber,
        collectedBy: p.processedBy ? `${p.processedBy.name} ${p.processedBy.surname}`.trim() : "System",
      })),
    ];

    allTransactions.sort((a, b) => b.date.getTime() - a.date.getTime());
    
    return {
      success: true,
      data: allTransactions.slice(0, limit).map(t => ({
        ...t,
        date: t.date.toISOString(),
      })),
    };
  } catch (e: any) {
    if (e?.message?.includes("Unauthorized")) {
      return { success: false, error: e.message, data: [] };
    }
    console.error("[getRecentTransactions] error:", e);
    return { success: false, error: "Failed to fetch recent transactions", data: [] };
  }
}