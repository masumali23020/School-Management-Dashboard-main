// src/components/meals/MealTypeForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";


import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

import { Loader2, Plus, Pencil, UtensilsCrossed } from "lucide-react";
import { MealTypeInput, MealTypeSchema } from "@/lib/FormValidationSchema";
import { createMealType, updateMealType } from "@/Actions/meals/meal.actions";
import { toast } from "react-toastify";

interface Props {
  mealType?: {
    id: number;
    name: string;
    rate: string;
    guestRate?: string | null;
    isActive: boolean;
  };
  onSuccess?: () => void;
}

export function MealTypeForm({ mealType, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(mealType);

  const form = useForm<MealTypeInput>({
    resolver: zodResolver(MealTypeSchema),
    defaultValues: {
      name: mealType?.name ?? "",
      rate: mealType?.rate ?? "",
      guestRate: mealType?.guestRate ?? "",
      isActive: mealType?.isActive ?? true,
    },
  });

  const onSubmit = async (values: MealTypeInput) => {
    const result = isEdit
      ? await updateMealType(mealType!.id, values)
      : await createMealType(values);

    if (result.success) {
      toast.success(isEdit ? "Meal type updated" : "Meal type created", );
      setOpen(false);
      form.reset();
      onSuccess?.();
    } else {
      if (result.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([field, errors]) => {
          form.setError(field as keyof MealTypeInput, {
            message: errors[0],
          });
        });
      }
      toast.error("Something went wrong",);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add meal type
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-muted-foreground" />
            {isEdit ? "Edit meal type" : "Create meal type"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meal name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Breakfast, Lunch, Dinner"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Regular rate (৳)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Per student per meal
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="guestRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Guest rate (৳){" "}
                      <Badge variant="outline" className="text-[10px] ml-1">
                        optional
                      </Badge>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Leave empty to use regular rate
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel className="text-sm font-medium">Active</FormLabel>
                    <FormDescription className="text-xs">
                      Inactive meal types wont appear in entry forms
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEdit ? "Save changes" : "Create meal type"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}