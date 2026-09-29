
import { LucideIcon } from "lucide-react";

export interface FinanceCategory {
  id: number;
  name: string;
  description?: string | null;
  isActive?: boolean;
}

export interface CollectionPayload {
  amount: number;
  categoryId: number;
  donorName?: string;
  phone?: string;
  paymentMethod: "CASH" | "MOBILE_BANKING" | "BANK_TRANSFER";
  date: string;
  remarks?: string;
}

export interface ExpensePayload {
  amount: number;
  categoryId: number;
  title?: string;
  description?: string;
  paymentMethod: "CASH" | "MOBILE_BANKING" | "BANK_TRANSFER";
  date: string;
}

export interface FinanceEntry {
  id: number;
  type: "COLLECTION" | "EXPENSE";
  amount: number;
  categoryId: number;
  category: string;
  paymentMethod: "CASH" | "MOBILE_BANKING" | "BANK_TRANSFER";
  date: string;
  note?: string | null;
  person?: string | null;
}

export interface FinanceSummary {
  totalCollections: number;
  totalCollection: number;
  totalExpenses: number;
  netBalance: number;
}

export interface MonthlyReportItem {
  month: string;
  collections: number;
  expenses: number;
  net: number;
}


export interface SummaryCardItem {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  description?: string;
}

interface SummaryCardsProps {
  items: SummaryCardItem[];
}