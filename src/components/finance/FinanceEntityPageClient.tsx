"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  deleteCollectionAction,
  deleteExpenseAction,
  getFinanceBootstrapDataAction,
  getFinanceTableAction,
} from "@/Actions/finance";
import { CollectionForm } from "@/components/finance/CollectionForm";
import { ExpenseTable } from "@/components/finance/ExpenseTable";
import { formatBDT } from "@/lib/currency";
import type { FinanceCategory, FinanceEntry } from "@/types/finance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PAGE_SIZE = 10;

interface FinanceEntityPageClientProps {
  entity: "COLLECTION" | "EXPENSE";
}

export default function FinanceEntityPageClient({ entity }: FinanceEntityPageClientProps) {
  const isCollection = entity === "COLLECTION";
  const [isLoading, setIsLoading] = useState(true);
  const [collectionCategories, setCollectionCategories] = useState<FinanceCategory[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<FinanceCategory[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [rows, setRows] = useState<FinanceEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<{
    page: number;
    categoryId?: number;
    month?: string;
    fromDate?: string;
    toDate?: string;
  }>({
    page: 1,
  });

  const loadBootstrap = useCallback(async () => {
    const response = await getFinanceBootstrapDataAction();
    if (!response.success || !response.data) return toast.error(response.message);

    setCollectionCategories(response.data.collectionCategories);
    setExpenseCategories(response.data.expenseCategories);
    setTotalAmount(isCollection ? response.data.summary.totalCollections : response.data.summary.totalExpenses);
  }, [isCollection]);

  const loadTable = useCallback(async () => {
    const response = await getFinanceTableAction({
      type: entity,
      page: filters.page,
      pageSize: PAGE_SIZE,
      categoryId: filters.categoryId,
      month: filters.month,
      fromDate: filters.fromDate,
      toDate: filters.toDate,
    });
    if (!response.success || !response.data) return toast.error(response.message);
    setRows(response.data.rows);
    setTotal(response.data.total);
  }, [entity, filters]);

  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([loadBootstrap(), loadTable()]);
    setIsLoading(false);
  }, [loadBootstrap, loadTable]);

const handleDelete = useCallback(
  async (entry: FinanceEntry) => {
    const result =
      entry.type === "COLLECTION"
        ? await deleteCollectionAction(entry.id)
        : await deleteExpenseAction(entry.id);

    if (!result.success) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message);

    await refreshAll();
  },
  [refreshAll]
);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  if (isLoading) return <div className="p-4">Loading...</div>;

  const activeCategories = isCollection ? collectionCategories : expenseCategories;

  return (
    <div className="space-y-6 p-4">
      <Card>
        <CardHeader>
          <CardTitle>{isCollection ? "Collections Dashboard" : "Expenses Dashboard"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border p-3">
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="text-2xl font-semibold">{formatBDT(totalAmount)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-sm text-muted-foreground">Total Records</p>
            <p className="text-2xl font-semibold">{total}</p>
          </div>
        </CardContent>
      </Card>

      <CollectionForm
        mode={isCollection ? "collection" : "expense"}
        categories={activeCategories}
        onSuccess={refreshAll}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <ExpenseTable
          rows={rows}
          total={total}
          page={filters.page}
          pageSize={PAGE_SIZE}
          type={entity}
          showTypeFilter={false}
          categoryId={filters.categoryId}
          month={filters.month}
          fromDate={filters.fromDate}
          toDate={filters.toDate}
          categories={activeCategories}
          collectionCategories={collectionCategories}
          expenseCategories={expenseCategories}
          onRefresh={refreshAll}
          onDelete={handleDelete}
          onFilterChange={(value) => setFilters((prev) => ({ ...prev, ...value }))}
        />

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>{isCollection ? "Collection Categories" : "Expense Categories"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No categories found.</p>
            ) : (
              activeCategories.map((category) => (
                <div key={category.id} className="rounded-md border px-2 py-1 text-sm">
                  {category.name}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
