"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  deleteCollectionAction,
  deleteExpenseAction,
  getFinanceBootstrapDataAction,
  getFinanceTableAction,
} from "@/Actions/finance";
import { SummaryCards } from "@/components/finance/SummaryCards";
import { CollectionForm } from "@/components/finance/CollectionForm";
import { ExpenseTable } from "@/components/finance/ExpenseTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FinanceCategory, FinanceEntry, FinanceSummary, MonthlyReportItem } from "@/types/finance";
import { CircleDollarSign, ReceiptText, Wallet } from "lucide-react";

const PAGE_SIZE = 10;

export default function FinanceDashboardClient() {
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReportItem[]>([]);
  const [collectionCategories, setCollectionCategories] = useState<FinanceCategory[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<FinanceCategory[]>([]);
  const [rows, setRows] = useState<FinanceEntry[]>([]);
  const [total, setTotal] = useState(0);
  
  const [filters, setFilters] = useState<{
    page: number;
    type: "ALL" | "COLLECTION" | "EXPENSE";
    categoryId?: number;
    month?: string;
    fromDate?: string;
    toDate?: string;
  }>({
    page: 1,
    type: "ALL",
  });

  const loadBootstrap = useCallback(async () => {
    const response = await getFinanceBootstrapDataAction();
    if (!response.success || !response.data) {
      toast.error(response.message);
      return;
    }
    setSummary(response.data.summary);
    setMonthlyReport(response.data.monthlyReport);
    setCollectionCategories(response.data.collectionCategories);
    setExpenseCategories(response.data.expenseCategories);
  }, []);

  const loadTable = useCallback(async () => {
    const response = await getFinanceTableAction({
      type: filters.type,
      page: filters.page,
      pageSize: PAGE_SIZE,
      categoryId: filters.categoryId,
      month: filters.month,
      fromDate: filters.fromDate,
      toDate: filters.toDate,
    });

    if (!response.success || !response.data) {
      toast.error(response.message);
      return;
    }
    setRows(response.data.rows);
    setTotal(response.data.total);
  }, [filters]);

  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([loadBootstrap(), loadTable()]);
    setIsLoading(false);
  }, [loadBootstrap, loadTable]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const handleDelete = useCallback(
    async (entry: FinanceEntry) => {
      const result =
        entry.type === "COLLECTION" ? await deleteCollectionAction(entry.id) : await deleteExpenseAction(entry.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      await refreshAll();
    },
    [refreshAll]
  );

  if (isLoading || !summary) {
    return <div className="p-4">Loading finance dashboard...</div>;
  }

  // ডাইনামিক কার্ড ডাটা অ্যারে যা SummaryCards-এ পাস করা হবে
  const myCardData = [
    {
      title: "মোট সংগ্রহ",
      value: summary.totalCollections,
      icon: CircleDollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      description: "Lifetime income"
    },
    {
      title: "মোট খরচ",
      value: summary.totalExpenses,
      icon: ReceiptText,
      color: "text-rose-600",
      bgColor: "bg-rose-50",
      description: "Lifetime spending"
    },
    {
      title: "নেট ব্যালেন্স",
      value: summary.netBalance,
      icon: Wallet,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      description: "Current cash in hand"
    },
  ];

  return (
    <div className="space-y-6 p-4">
      {/* এখানে summary-এর বদলে items পাস করুন */}
      <SummaryCards items={myCardData} />

      <div className="flex flex-wrap gap-2">
        <CollectionForm mode="collection" categories={collectionCategories} onSuccess={refreshAll} />
        <CollectionForm mode="expense" categories={expenseCategories} onSuccess={refreshAll} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <ExpenseTable
          rows={rows}
          total={total}
          page={filters.page}
          pageSize={PAGE_SIZE}
          type={filters.type}
          categoryId={filters.categoryId}
          month={filters.month}
          fromDate={filters.fromDate}
          toDate={filters.toDate}
          categories={[...collectionCategories, ...expenseCategories]}
          collectionCategories={collectionCategories}
          expenseCategories={expenseCategories}
          onRefresh={refreshAll}
          onDelete={handleDelete}
          onFilterChange={(value) => setFilters((prev) => ({ ...prev, ...value }))}
        />

        {/* Categories Sidebar */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Category Names</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-semibold text-emerald-700">Collection Categories</p>
              <ul className="space-y-1 text-sm">
                {collectionCategories.length === 0 ? (
                  <li className="text-muted-foreground text-xs italic">No collection categories.</li>
                ) : (
                  collectionCategories.map((category) => (
                    <li key={`collection-${category.id}`} className="rounded-md border bg-emerald-50/50 px-2 py-1">
                      {category.name}
                    </li>
                  ))
                )}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-rose-700">Expense Categories</p>
              <ul className="space-y-1 text-sm">
                {expenseCategories.length === 0 ? (
                  <li className="text-muted-foreground text-xs italic">No expense categories.</li>
                ) : (
                  expenseCategories.map((category) => (
                    <li key={`expense-${category.id}`} className="rounded-md border bg-rose-50/50 px-2 py-1">
                      {category.name}
                    </li>
                  ))
                )}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Report List */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Report Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {monthlyReport.length === 0 ? (
              <p className="text-muted-foreground italic">No monthly data available.</p>
            ) : (
              monthlyReport.map((item) => (
                <div key={item.month} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <span className="font-medium">{item.month}</span>
                  <span className="text-muted-foreground">
                    In: <span className="text-emerald-600 font-semibold">{item.collections.toFixed(2)}</span> | 
                    Out: <span className="text-rose-600 font-semibold">{item.expenses.toFixed(2)}</span> | 
                    Net: <span className={item.net >= 0 ? "text-blue-600 font-bold" : "text-red-600 font-bold"}>{item.net.toFixed(2)}</span>
                  </span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}