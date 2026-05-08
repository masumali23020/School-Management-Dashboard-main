import prisma from "@/lib/db";
import type {
  CollectionCategoryInput,
  CollectionInput,
  ExpenseCategoryInput,
  ExpenseInput,
  FinanceFilterInput,
} from "@/schemas/finance";

export const financeRepository = {
  getCollectionCategories(schoolId: number) {
    return prisma.collectionCategory.findMany({
      where: { schoolId },
      orderBy: { name: "asc" },
    });
  },

  getExpenseCategories(schoolId: number) {
    return prisma.expenseCategory.findMany({
      where: { schoolId },
      orderBy: { name: "asc" },
    });
  },

  createCollectionCategory(schoolId: number, payload: CollectionCategoryInput) {
    return prisma.collectionCategory.create({
      data: {
        schoolId,
        name: payload.name,
        description: payload.description || null,
        isActive: payload.isActive,
      },
    });
  },

  updateCollectionCategory(schoolId: number, id: number, payload: CollectionCategoryInput) {
    return prisma.collectionCategory.updateMany({
      where: { id, schoolId },
      data: {
        name: payload.name,
        description: payload.description || null,
        isActive: payload.isActive,
      },
    });
  },

  deleteCollectionCategory(schoolId: number, id: number) {
    return prisma.collectionCategory.deleteMany({
      where: { id, schoolId },
    });
  },

  createExpenseCategory(schoolId: number, payload: ExpenseCategoryInput) {
    return prisma.expenseCategory.create({
      data: {
        schoolId,
        name: payload.name,
        description: payload.description || null,
        isActive: payload.isActive,
      },
    });
  },

  updateExpenseCategory(schoolId: number, id: number, payload: ExpenseCategoryInput) {
    return prisma.expenseCategory.updateMany({
      where: { id, schoolId },
      data: {
        name: payload.name,
        description: payload.description || null,
        isActive: payload.isActive,
      },
    });
  },

  deleteExpenseCategory(schoolId: number, id: number) {
    return prisma.expenseCategory.deleteMany({
      where: { id, schoolId },
    });
  },
};
