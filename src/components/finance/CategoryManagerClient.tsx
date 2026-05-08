"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import {
  createCollectionCategory,
  createExpenseCategory,
  deleteCollectionCategory,
  deleteExpenseCategory,
  getCollectionCategories,
  getExpenseCategories,
  updateCollectionCategory,
  updateExpenseCategory,
} from "@/Actions/finance";
import { collectionCategorySchema, expenseCategorySchema, type CollectionCategoryInput, type ExpenseCategoryInput } from "@/schemas/finance";
import type { FinanceCategory } from "@/types/finance";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface CategoryManagerClientProps {
  type: "collection" | "expense";
}

export default function CategoryManagerClient({ type }: CategoryManagerClientProps) {
  const [rows, setRows] = useState<FinanceCategory[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const isCollection = type === "collection";
  const schema = isCollection ? collectionCategorySchema : expenseCategorySchema;
  const form = useForm<CollectionCategoryInput | ExpenseCategoryInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
    },
  });

  const loadRows = useCallback(async () => {
    const res = isCollection ? await getCollectionCategories() : await getExpenseCategories();
    if (!res.success || !res.data) return toast.error(res.message);
    setRows(res.data);
  }, [isCollection]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const filtered = useMemo(
    () => rows.filter((row) => row.name.toLowerCase().includes(search.toLowerCase())),
    [rows, search]
  );

const handleSubmit = (
  values: CollectionCategoryInput | ExpenseCategoryInput
) => {
  startTransition(() => {
    void (async () => {
      const response =
        editingId !== null
          ? isCollection
            ? await updateCollectionCategory(editingId, values)
            : await updateExpenseCategory(editingId, values)
          : isCollection
            ? await createCollectionCategory(values)
            : await createExpenseCategory(values);

      if (!response.success) {
        toast.error(response.message);
        return;
      }

      toast.success(response.message);

      setOpen(false);
      setEditingId(null);

      form.reset({
        name: "",
        description: "",
        isActive: true,
      });

      await loadRows();
    })();
  });
};

  const handleEdit = (row: FinanceCategory) => {
    setEditingId(row.id);
    form.reset({
      name: row.name,
      description: row.description || "",
      isActive: row.isActive ?? true,
    });
    setOpen(true);
  };

const handleDelete = (id: number) => {
  startTransition(() => {
    void (async () => {
      const response = isCollection
        ? await deleteCollectionCategory(id)
        : await deleteExpenseCategory(id);

      if (!response.success) {
        toast.error(response.message);
        return;
      }

      toast.success(response.message);

      await loadRows();
    })();
  });
};

  return (
    <div className="space-y-6 p-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{isCollection ? "Collection Categories" : "Expense Categories"}</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingId(null);
                  form.reset({ name: "", description: "", isActive: true });
                }}
              >
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Update Category" : "Create Category"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form className="space-y-3" onSubmit={form.handleSubmit(handleSubmit)}>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isPending} className="w-full">
                    {isPending ? "Saving..." : editingId ? "Update" : "Create"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Search category..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    No categories found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.description || "-"}</TableCell>
                    <TableCell>{row.isActive ? "Active" : "Inactive"}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" onClick={() => handleEdit(row)}>
                        Edit
                      </Button>
                      <Button variant="destructive" onClick={() => handleDelete(row.id)} disabled={isPending}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
