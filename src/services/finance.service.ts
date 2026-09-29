import prisma from "@/lib/db";
import { financeRepository } from "@/repositories/finance.repository";
import type {
  CollectionCategoryInput,
  CollectionInput,
  ExpenseCategoryInput,
  ExpenseInput,
  FinanceFilterInput,
} from "@/schemas/finance";
import type { FinanceCategory, FinanceEntry, FinanceSummary, MonthlyReportItem } from "@/types/finance";

function toISODate(dateValue: string): Date {
  return new Date(`${dateValue}T00:00:00.000Z`);
}

function parseMonthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export const financeService = {
  async getCollectionCategories(schoolId: number): Promise<FinanceCategory[]> {
    const categories = await financeRepository.getCollectionCategories(schoolId);
    return categories;
  },

  async getExpenseCategories(schoolId: number): Promise<FinanceCategory[]> {
    const categories = await financeRepository.getExpenseCategories(schoolId);
    return categories;
  },

  async createCollectionCategory(schoolId: number, payload: CollectionCategoryInput) {
    return financeRepository.createCollectionCategory(schoolId, payload);
  },

  async updateCollectionCategory(schoolId: number, categoryId: number, payload: CollectionCategoryInput) {
    const result = await financeRepository.updateCollectionCategory(schoolId, categoryId, payload);
    if (!result.count) throw new Error("Collection category not found");
    return result;
  },

  async deleteCollectionCategory(schoolId: number, categoryId: number) {
    const result = await financeRepository.deleteCollectionCategory(schoolId, categoryId);
    if (!result.count) throw new Error("Collection category not found");
    return result;
  },

  async createExpenseCategory(schoolId: number, payload: ExpenseCategoryInput) {
    return financeRepository.createExpenseCategory(schoolId, payload);
  },

  async updateExpenseCategory(schoolId: number, categoryId: number, payload: ExpenseCategoryInput) {
    const result = await financeRepository.updateExpenseCategory(schoolId, categoryId, payload);
    if (!result.count) throw new Error("Expense category not found");
    return result;
  },

  async deleteExpenseCategory(schoolId: number, categoryId: number) {
    const result = await financeRepository.deleteExpenseCategory(schoolId, categoryId);
    if (!result.count) throw new Error("Expense category not found");
    return result;
  },

  async createCollection(schoolId: number, userId: string, payload: CollectionInput) {
    return prisma.$transaction(async (tx) => {
      const category = await tx.collectionCategory.findFirst({
        where: { id: payload.categoryId, schoolId },
      });
      if (!category) throw new Error("Invalid collection category");

      return tx.collection.create({
        data: {
          schoolId,
          categoryId: payload.categoryId,
          amount: payload.amount,
          donorName: payload.donorName || null,
          phone: payload.phone || null,
          paymentMethod: payload.paymentMethod,
          receivedById: userId,
          remarks: payload.remarks || null,
          date: toISODate(payload.date),
        },
      });
    });
  },

  async updateCollection(schoolId: number, collectionId: number, payload: CollectionInput) {
    return prisma.$transaction(async (tx) => {
      const exists = await tx.collection.findFirst({
        where: { id: collectionId, schoolId },
      });
      if (!exists) throw new Error("Collection not found");

      const category = await tx.collectionCategory.findFirst({
        where: { id: payload.categoryId, schoolId },
      });
      if (!category) throw new Error("Invalid collection category");

      return tx.collection.update({
        where: { id: collectionId },
        data: {
          categoryId: payload.categoryId,
          amount: payload.amount,
          donorName: payload.donorName || null,
          phone: payload.phone || null,
          paymentMethod: payload.paymentMethod,
          remarks: payload.remarks || null,
          date: toISODate(payload.date),
        },
      });
    });
  },

  async deleteCollection(schoolId: number, collectionId: number) {
    return prisma.$transaction(async (tx) => {
      const exists = await tx.collection.findFirst({
        where: { id: collectionId, schoolId },
      });
      if (!exists) throw new Error("Collection not found");
      await tx.collection.delete({ where: { id: collectionId } });
    });
  },

  async createExpense(schoolId: number, userId: string, payload: ExpenseInput) {
    return prisma.$transaction(async (tx) => {
      const category = await tx.expenseCategory.findFirst({
        where: { id: payload.categoryId, schoolId },
      });
      if (!category) throw new Error("Invalid expense category");

      return tx.expense.create({
        data: {
          schoolId,
          categoryId: payload.categoryId,
          amount: payload.amount,
          title: payload.title || null,
          description: payload.description || null,
          spentById: userId,
          paymentMethod: payload.paymentMethod,
          date: toISODate(payload.date),
        },
      });
    });
  },

  async updateExpense(schoolId: number, expenseId: number, payload: ExpenseInput) {
    return prisma.$transaction(async (tx) => {
      const exists = await tx.expense.findFirst({
        where: { id: expenseId, schoolId },
      });
      if (!exists) throw new Error("Expense not found");

      const category = await tx.expenseCategory.findFirst({
        where: { id: payload.categoryId, schoolId },
      });
      if (!category) throw new Error("Invalid expense category");

      return tx.expense.update({
        where: { id: expenseId },
        data: {
          categoryId: payload.categoryId,
          amount: payload.amount,
          title: payload.title || null,
          description: payload.description || null,
          paymentMethod: payload.paymentMethod,
          date: toISODate(payload.date),
        },
      });
    });
  },

  async deleteExpense(schoolId: number, expenseId: number) {
    return prisma.$transaction(async (tx) => {
      const exists = await tx.expense.findFirst({
        where: { id: expenseId, schoolId },
      });
      if (!exists) throw new Error("Expense not found");
      await tx.expense.delete({ where: { id: expenseId } });
    });
  },

  async getSummary(schoolId: number): Promise<FinanceSummary> {
    const [collectionAgg, expenseAgg] = await Promise.all([
      prisma.collection.aggregate({
        where: { schoolId },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { schoolId },
        _sum: { amount: true },
      }),
    ]);

    const totalCollections = Number(collectionAgg._sum.amount || 0);
    const totalExpenses = Number(expenseAgg._sum.amount || 0);
    return {
      totalCollections,
      totalCollection: totalCollections,
      totalExpenses,
      netBalance: totalCollections - totalExpenses,
    };
  },

  async getMonthlyReport(schoolId: number): Promise<MonthlyReportItem[]> {
    const [collections, expenses] = await Promise.all([
      prisma.collection.findMany({ where: { schoolId }, select: { amount: true, date: true } }),
      prisma.expense.findMany({ where: { schoolId }, select: { amount: true, date: true } }),
    ]);

    const bucket = new Map<string, MonthlyReportItem>();
    for (const row of collections) {
      const month = parseMonthKey(row.date);
      const current = bucket.get(month) || { month, collections: 0, expenses: 0, net: 0 };
      current.collections += Number(row.amount);
      current.net = current.collections - current.expenses;
      bucket.set(month, current);
    }
    for (const row of expenses) {
      const month = parseMonthKey(row.date);
      const current = bucket.get(month) || { month, collections: 0, expenses: 0, net: 0 };
      current.expenses += Number(row.amount);
      current.net = current.collections - current.expenses;
      bucket.set(month, current);
    }

    return [...bucket.values()].sort((a, b) => (a.month < b.month ? 1 : -1));
  },

  async getFinanceTable(schoolId: number, filters: FinanceFilterInput): Promise<{
    data: FinanceEntry[];
    total: number;
  }> {
    const fromDate = filters.fromDate ? toISODate(filters.fromDate) : undefined;
    const toDate = filters.toDate ? new Date(`${filters.toDate}T23:59:59.999Z`) : undefined;
    const dateFilter = fromDate || toDate ? { gte: fromDate, lte: toDate } : undefined;

    const [collectionCategoryExists, expenseCategoryExists] = filters.categoryId
      ? await Promise.all([
          prisma.collectionCategory.findFirst({
            where: { id: filters.categoryId, schoolId },
            select: { id: true },
          }),
          prisma.expenseCategory.findFirst({
            where: { id: filters.categoryId, schoolId },
            select: { id: true },
          }),
        ])
      : [null, null];

    const collectionCategoryFilter =
      filters.categoryId && (filters.type === "COLLECTION" || (filters.type === "ALL" && collectionCategoryExists))
        ? { categoryId: filters.categoryId }
        : {};
    const expenseCategoryFilter =
      filters.categoryId && (filters.type === "EXPENSE" || (filters.type === "ALL" && expenseCategoryExists))
        ? { categoryId: filters.categoryId }
        : {};

    const [collections, expenses] = await Promise.all([
      filters.type === "EXPENSE"
        ? Promise.resolve([])
        : prisma.collection.findMany({
            where: {
              schoolId,
              ...collectionCategoryFilter,
              ...(dateFilter ? { date: dateFilter } : {}),
            },
            include: { category: true },
            orderBy: { date: "desc" },
          }),
      filters.type === "COLLECTION"
        ? Promise.resolve([])
        : prisma.expense.findMany({
            where: {
              schoolId,
              ...expenseCategoryFilter,
              ...(dateFilter ? { date: dateFilter } : {}),
            },
            include: { category: true },
            orderBy: { date: "desc" },
          }),
    ]);

    const rows: FinanceEntry[] = [
      ...collections.map((c) => ({
        id: c.id,
        type: "COLLECTION" as const,
        amount: Number(c.amount),
        categoryId: c.categoryId,
        category: c.category.name,
        paymentMethod: c.paymentMethod,
        date: c.date.toISOString(),
        note: c.remarks,
        person: c.donorName,
      })),
      ...expenses.map((e) => ({
        id: e.id,
        type: "EXPENSE" as const,
        amount: Number(e.amount),
        categoryId: e.categoryId,
        category: e.category.name,
        paymentMethod: e.paymentMethod,
        date: e.date.toISOString(),
        note: e.description,
        person: e.title || null,
      })),
    ].sort((a, b) => (a.date < b.date ? 1 : -1));

    const monthFiltered = filters.month
      ? rows.filter((row) => row.date.startsWith(filters.month as string))
      : rows;

    const start = (filters.page - 1) * filters.pageSize;
    const paginated = monthFiltered.slice(start, start + filters.pageSize);

    return { data: paginated, total: monthFiltered.length };
  },
};
