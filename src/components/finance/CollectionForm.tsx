"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { collectionSchema, expenseSchema, type CollectionInput, type ExpenseInput } from "@/schemas/finance";
import {
  createCollectionAction,
  createExpenseAction,
  updateCollectionAction,
  updateExpenseAction,
} from "@/Actions/finance";
import type { FinanceCategory, FinanceEntry } from "@/types/finance";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CollectionFormProps {
  mode: "collection" | "expense";
  categories: FinanceCategory[];
  onSuccess: () => Promise<void>;
  type?: "create" | "edit";
  entryId?: number;
  initialData?: FinanceEntry;
  triggerLabel?: string;
}

export function CollectionForm({
  mode,
  categories,
  onSuccess,
  type = "create",
  entryId,
  initialData,
  triggerLabel,
}: CollectionFormProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isCollection = mode === "collection";

  const collectionForm = useForm<CollectionInput>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      amount: initialData?.amount || 0,
      categoryId: initialData?.categoryId || 0,
      donorName: initialData?.person || "",
      phone: "",
      paymentMethod: (initialData?.paymentMethod as CollectionInput["paymentMethod"]) || "CASH",
      date: initialData?.date ? initialData.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
      remarks: initialData?.note || "",
    },
  });

  const expenseForm = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount: initialData?.amount || 0,
      categoryId: initialData?.categoryId || 0,
      title: initialData?.person || "",
      description: initialData?.note || "",
      paymentMethod: (initialData?.paymentMethod as ExpenseInput["paymentMethod"]) || "CASH",
      date: initialData?.date ? initialData.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    },
  });

  const handleCollectionSubmit = (values: CollectionInput) => {
    startTransition(async () => {
      const result =
        type === "edit" && entryId
          ? await updateCollectionAction(entryId, values)
          : await createCollectionAction(values);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setOpen(false);
      collectionForm.reset();
      await onSuccess();
    });
  };

  const handleExpenseSubmit = (values: ExpenseInput) => {
    startTransition(async () => {
      const result =
        type === "edit" && entryId ? await updateExpenseAction(entryId, values) : await createExpenseAction(values);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setOpen(false);
      expenseForm.reset();
      await onSuccess();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={type === "edit" ? "outline" : "default"}>
          {triggerLabel || (isCollection ? "Add Collection" : "Add Expense")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {type === "edit"
              ? isCollection
                ? "Edit Collection Entry"
                : "Edit Expense Entry"
              : isCollection
                ? "New Collection Entry"
                : "New Expense Entry"}
          </DialogTitle>
          <DialogDescription>Fill out the details and save.</DialogDescription>
        </DialogHeader>

        {isCollection ? (
          <Form {...collectionForm}>
            <form className="space-y-3" onSubmit={collectionForm.handleSubmit(handleCollectionSubmit)}>
              <FormField
                control={collectionForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={collectionForm.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value || "")}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={String(category.id)}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={collectionForm.control}
                name="donorName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Donor Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={collectionForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={collectionForm.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={collectionForm.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="MOBILE_BANKING">Mobile Banking</SelectItem>
                        <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? "Saving..." : "Save Collection"}
              </Button>
            </form>
          </Form>
        ) : (
          <Form {...expenseForm}>
            <form className="space-y-3" onSubmit={expenseForm.handleSubmit(handleExpenseSubmit)}>
              <FormField
                control={expenseForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={expenseForm.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value || "")}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={String(category.id)}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={expenseForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={expenseForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={expenseForm.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={expenseForm.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="MOBILE_BANKING">Mobile Banking</SelectItem>
                        <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? "Saving..." : "Save Expense"}
              </Button>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
