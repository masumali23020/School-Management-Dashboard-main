"use client";

import * as React from "react";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import type { FinanceCategory, FinanceEntry } from "@/types/finance";
import { formatBDT } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CollectionForm } from "@/components/finance/CollectionForm";

interface ExpenseTableProps {
  rows: FinanceEntry[];
  total: number;
  page: number;
  pageSize: number;
  type: "ALL" | "COLLECTION" | "EXPENSE";
  showTypeFilter?: boolean;
  categoryId?: number;
  month?: string;
  fromDate?: string;
  toDate?: string;
  categories: FinanceCategory[];
  collectionCategories: FinanceCategory[];
  expenseCategories: FinanceCategory[];
  onRefresh: () => Promise<void>;
  onDelete: (entry: FinanceEntry) => Promise<void>;
  onFilterChange: (value: {
    type?: "ALL" | "COLLECTION" | "EXPENSE";
    categoryId?: number;
    month?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
  }) => void;
}

export function ExpenseTable({
  rows,
  total,
  page,
  pageSize,
  type,
  showTypeFilter = true,
  categoryId,
  month,
  fromDate,
  toDate,
  categories,
  collectionCategories,
  expenseCategories,
  onRefresh,
  onDelete,
  onFilterChange,
}: ExpenseTableProps) {
  const [deleteTarget, setDeleteTarget] = React.useState<FinanceEntry | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const availableCategories = type === "COLLECTION" ? collectionCategories : type === "EXPENSE" ? expenseCategories : categories;

  const columns = React.useMemo<ColumnDef<FinanceEntry>[]>(
    () => [
      {
        accessorKey: "type",
        header: "Type",
      },
      {
        accessorKey: "category",
        header: "Category",
      },
      {
        accessorKey: "person",
        header: "Name",
        cell: ({ row }) => row.original.person || "-",
      },
      {
        accessorKey: "amount",
        header: "Amount",
        cell: ({ row }) => formatBDT(row.original.amount),
      },
      {
        accessorKey: "paymentMethod",
        header: "Method",
      },
      {
        accessorKey: "date",
        header: "Date",
        cell: ({ row }) => new Date(row.original.date).toLocaleDateString(),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const entry = row.original;
          const isCollection = entry.type === "COLLECTION";
          return (
            <div className="flex gap-2">
              <CollectionForm
                mode={isCollection ? "collection" : "expense"}
                type="edit"
                entryId={entry.id}
                initialData={entry}
                triggerLabel="Edit"
                categories={isCollection ? collectionCategories : expenseCategories}
                onSuccess={onRefresh}
              />
              <Button variant="destructive" onClick={() => setDeleteTarget(entry)}>
                Delete
              </Button>
            </div>
          );
        },
      },
    ],
    [collectionCategories, expenseCategories, onDelete, onRefresh]
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className={`grid gap-2 ${showTypeFilter ? "md:grid-cols-5" : "md:grid-cols-4"}`}>
        {showTypeFilter && (
          <Select
            value={type}
            onValueChange={(value) =>
              onFilterChange({ type: value as "ALL" | "COLLECTION" | "EXPENSE", categoryId: undefined, page: 1 })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All types</SelectItem>
              <SelectItem value="COLLECTION">Collections</SelectItem>
              <SelectItem value="EXPENSE">Expenses</SelectItem>
            </SelectContent>
          </Select>
        )}
        <Select
          value={categoryId ? String(categoryId) : "all"}
          onValueChange={(value) => onFilterChange({ categoryId: value === "all" ? undefined : Number(value), page: 1 })}
        >
          <SelectTrigger>
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {availableCategories.map((category) => (
              <SelectItem key={category.id} value={String(category.id)}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="month"
          value={month || ""}
          onChange={(event) => onFilterChange({ month: event.target.value || undefined, page: 1 })}
        />
        <Input
          type="date"
          value={fromDate || ""}
          onChange={(event) => onFilterChange({ fromDate: event.target.value || undefined, page: 1 })}
        />
        <Input
          type="date"
          value={toDate || ""}
          onChange={(event) => onFilterChange({ toDate: event.target.value || undefined, page: 1 })}
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No records found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {page} of {Math.max(1, Math.ceil(total / pageSize))}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" disabled={page <= 1} onClick={() => onFilterChange({ page: page - 1 })}>
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={page >= Math.ceil(total / pageSize)}
            onClick={() => onFilterChange({ page: page + 1 })}
          >
            Next
          </Button>
        </div>
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete finance record?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. It will permanently remove this {deleteTarget?.type?.toLowerCase()} entry.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isDeleting || !deleteTarget}
              onClick={async () => {
                if (!deleteTarget) return;
                setIsDeleting(true);
                await onDelete(deleteTarget);
                setIsDeleting(false);
                setDeleteTarget(null);
              }}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
