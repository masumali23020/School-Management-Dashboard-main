import { z } from "zod";

const paymentMethodEnum = z.enum(["CASH", "MOBILE_BANKING", "BANK_TRANSFER"]);

export const collectionSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  categoryId: z.coerce.number().int().positive("Category is required"),
  donorName: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  paymentMethod: paymentMethodEnum,
  date: z.string().min(1, "Date is required"),
  remarks: z.string().trim().max(500).optional().or(z.literal("")),
});

export const collectionCategorySchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120, "Name is too long"),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export const expenseCategorySchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120, "Name is too long"),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export const expenseSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  categoryId: z.coerce.number().int().positive("Category is required"),
  title: z.string().trim().max(160).optional().or(z.literal("")),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  paymentMethod: paymentMethodEnum,
  date: z.string().min(1, "Date is required"),
});

export const financeFilterSchema = z.object({
  categoryId: z.coerce.number().int().positive().optional(),
  month: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  type: z.enum(["ALL", "COLLECTION", "EXPENSE"]).default("ALL"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export type CollectionInput = z.infer<typeof collectionSchema>;
export type CollectionCategoryInput = z.infer<typeof collectionCategorySchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type ExpenseCategoryInput = z.infer<typeof expenseCategorySchema>;
export type FinanceFilterInput = z.infer<typeof financeFilterSchema>;
