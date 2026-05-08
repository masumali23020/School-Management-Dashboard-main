"use server";

import { auth } from "@/auth";
import {
  collectionCategorySchema,
  collectionSchema,
  expenseCategorySchema,
  expenseSchema,
  financeFilterSchema,
} from "@/schemas/finance";
import { financeService } from "@/services/finance.service";

type ActionResult<T = null> = {
  success: boolean;
  message: string;
  data?: T;
};

async function requireFinanceSession() {
  const session = await auth();
  const user = session?.user;
  if (!user?.schoolId || !user?.id) throw new Error("Unauthorized");
  if (!["ADMIN", "CASHIER"].includes(user.role)) throw new Error("Unauthorized");
  return { schoolId: user.schoolId, userId: user.id };
}

function parseError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

export async function createCollectionAction(input: unknown): Promise<ActionResult> {
  try {
    const { schoolId, userId } = await requireFinanceSession();
    const payload = collectionSchema.parse(input);
    await financeService.createCollection(schoolId, userId, payload);
    return { success: true, message: "Collection added successfully" };
  } catch (error) {
    return { success: false, message: parseError(error) };
  }
}

export async function createCollectionCategory(input: unknown): Promise<ActionResult> {
  try {
    const { schoolId } = await requireFinanceSession();
    const payload = collectionCategorySchema.parse(input);
    await financeService.createCollectionCategory(schoolId, payload);
    return { success: true, message: "Collection category created successfully" };
  } catch (error) {
    return { success: false, message: parseError(error) };
  }
}

export async function updateCollectionCategory(id: number, input: unknown): Promise<ActionResult> {
  try {
    const { schoolId } = await requireFinanceSession();
    const payload = collectionCategorySchema.parse(input);
    await financeService.updateCollectionCategory(schoolId, id, payload);
    return { success: true, message: "Collection category updated successfully" };
  } catch (error) {
    return { success: false, message: parseError(error) };
  }
}

export async function deleteCollectionCategory(id: number): Promise<ActionResult> {
  try {
    const { schoolId } = await requireFinanceSession();
    await financeService.deleteCollectionCategory(schoolId, id);
    return { success: true, message: "Collection category deleted successfully" };
  } catch (error) {
    return { success: false, message: parseError(error) };
  }
}

export async function getCollectionCategories(): Promise<ActionResult<Awaited<ReturnType<typeof financeService.getCollectionCategories>>>> {
  try {
    const { schoolId } = await requireFinanceSession();
    const data = await financeService.getCollectionCategories(schoolId);
    return { success: true, message: "OK", data };
  } catch (error) {
    return { success: false, message: parseError(error) };
  }
}

export async function updateCollectionAction(id: number, input: unknown): Promise<ActionResult> {
  try {
    const { schoolId } = await requireFinanceSession();
    const payload = collectionSchema.parse(input);
    await financeService.updateCollection(schoolId, id, payload);
    return { success: true, message: "Collection updated successfully" };
  } catch (error) {
    return { success: false, message: parseError(error) };
  }
}

export async function deleteCollectionAction(id: number): Promise<ActionResult> {
  try {
    const { schoolId } = await requireFinanceSession();
    await financeService.deleteCollection(schoolId, id);
    return { success: true, message: "Collection deleted successfully" };
  } catch (error) {
    return { success: false, message: parseError(error) };
  }
}

export async function createExpenseAction(input: unknown): Promise<ActionResult> {
  try {
    const { schoolId, userId } = await requireFinanceSession();
    const payload = expenseSchema.parse(input);
    await financeService.createExpense(schoolId, userId, payload);
    return { success: true, message: "Expense added successfully" };
  } catch (error) {
    return { success: false, message: parseError(error) };
  }
}

export async function createExpenseCategory(input: unknown): Promise<ActionResult> {
  try {
    const { schoolId } = await requireFinanceSession();
    const payload = expenseCategorySchema.parse(input);
    await financeService.createExpenseCategory(schoolId, payload);
    return { success: true, message: "Expense category created successfully" };
  } catch (error) {
    return { success: false, message: parseError(error) };
  }
}

export async function updateExpenseCategory(id: number, input: unknown): Promise<ActionResult> {
  try {
    const { schoolId } = await requireFinanceSession();
    const payload = expenseCategorySchema.parse(input);
    await financeService.updateExpenseCategory(schoolId, id, payload);
    return { success: true, message: "Expense category updated successfully" };
  } catch (error) {
    return { success: false, message: parseError(error) };
  }
}

export async function deleteExpenseCategory(id: number): Promise<ActionResult> {
  try {
    const { schoolId } = await requireFinanceSession();
    await financeService.deleteExpenseCategory(schoolId, id);
    return { success: true, message: "Expense category deleted successfully" };
  } catch (error) {
    return { success: false, message: parseError(error) };
  }
}

export async function getExpenseCategories(): Promise<ActionResult<Awaited<ReturnType<typeof financeService.getExpenseCategories>>>> {
  try {
    const { schoolId } = await requireFinanceSession();
    const data = await financeService.getExpenseCategories(schoolId);
    return { success: true, message: "OK", data };
  } catch (error) {
    return { success: false, message: parseError(error) };
  }
}

export async function updateExpenseAction(id: number, input: unknown): Promise<ActionResult> {
  try {
    const { schoolId } = await requireFinanceSession();
    const payload = expenseSchema.parse(input);
    await financeService.updateExpense(schoolId, id, payload);
    return { success: true, message: "Expense updated successfully" };
  } catch (error) {
    return { success: false, message: parseError(error) };
  }
}

export async function deleteExpenseAction(id: number): Promise<ActionResult> {
  try {
    const { schoolId } = await requireFinanceSession();
    await financeService.deleteExpense(schoolId, id);
    return { success: true, message: "Expense deleted successfully" };
  } catch (error) {
    return { success: false, message: parseError(error) };
  }
}

export async function getFinanceBootstrapDataAction(): Promise<
  ActionResult<{
    collectionCategories: Awaited<ReturnType<typeof financeService.getCollectionCategories>>;
    expenseCategories: Awaited<ReturnType<typeof financeService.getExpenseCategories>>;
    summary: Awaited<ReturnType<typeof financeService.getSummary>>;
    monthlyReport: Awaited<ReturnType<typeof financeService.getMonthlyReport>>;
  }>
> {
  try {
    const { schoolId } = await requireFinanceSession();
    const [collectionCategories, expenseCategories, summary, monthlyReport] = await Promise.all([
      financeService.getCollectionCategories(schoolId),
      financeService.getExpenseCategories(schoolId),
      financeService.getSummary(schoolId),
      financeService.getMonthlyReport(schoolId),
    ]);
    return {
      success: true,
      message: "OK",
      data: { collectionCategories, expenseCategories, summary, monthlyReport },
    };
  } catch (error) {
    return { success: false, message: parseError(error) };
  }
}

export async function getFinanceTableAction(input: unknown): Promise<
  ActionResult<{
    rows: Awaited<ReturnType<typeof financeService.getFinanceTable>>["data"];
    total: number;
  }>
> {
  try {
    const { schoolId } = await requireFinanceSession();
    const filters = financeFilterSchema.parse(input);
    const table = await financeService.getFinanceTable(schoolId, filters);
    return { success: true, message: "OK", data: { rows: table.data, total: table.total } };
  } catch (error) {
    return { success: false, message: parseError(error) };
  }
}

export async function getCollections(input: unknown): Promise<
  ActionResult<{
    rows: Awaited<ReturnType<typeof financeService.getFinanceTable>>["data"];
    total: number;
  }>
> {
  return getFinanceTableAction({ ...(input as object), type: "COLLECTION" });
}

export async function getExpenses(input: unknown): Promise<
  ActionResult<{
    rows: Awaited<ReturnType<typeof financeService.getFinanceTable>>["data"];
    total: number;
  }>
> {
  return getFinanceTableAction({ ...(input as object), type: "EXPENSE" });
}
