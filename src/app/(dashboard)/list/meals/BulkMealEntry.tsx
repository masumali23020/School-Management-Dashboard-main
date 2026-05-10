"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { toast } from "react-toastify";
import { useState } from "react";
import { CalendarIcon, Loader2, UserX } from "lucide-react";

import { MealFilterBar } from "./MealFilterBar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label"; // standard label, safe outside FormField
import { cn } from "@/lib/utils";

import {
  ClassForFilter,
  recordBulkMealAttendance,
  StudentForMeal,
} from "@/Actions/meals/meal.actions";
import {
  BulkMealEntryInput,
  BulkMealEntrySchema,
} from "@/lib/FormValidationSchema";
import { useMealFilter } from "./useMealFilter";

// ─── TYPES ─────────────────────────────

interface MealType {
  id: number;
  name: string;
  rate: string;
}

interface Props {
  mealTypes: MealType[];
  sessions: string[];
  initialClasses: ClassForFilter[];
  initialStudents: StudentForMeal[];
}

function initials(name: string, surname?: string) {
  return [name, surname]
    .filter(Boolean)
    .map((n) => n?.[0])
    .join("")
    .toUpperCase();
}

// ─── COMPONENT ─────────────────────────────

export function BulkMealEntry({
  mealTypes,
  sessions,
  initialClasses,
  initialStudents,
}: Props) {
  const filter = useMealFilter({ initialClasses, initialStudents });

  const form = useForm<BulkMealEntryInput>({
    resolver: zodResolver(BulkMealEntrySchema),
    defaultValues: {
      studentIds: [],
      mealTypeIds: [],
      date: format(new Date(), "yyyy-MM-dd"),
      isGuest: false,
      quantity: 1,
      status: "CONSUMED",
    },
  });

  const watchedStudents = form.watch("studentIds") || [];
  const watchedMeals = form.watch("mealTypeIds") || [];
  const watchedQuantity = form.watch("quantity") || 1;

  const totalEntries = watchedStudents.length * watchedMeals.length;
  const totalMealCount = totalEntries * watchedQuantity;

  const allFilteredIds = filter.filteredStudents.map((s) => s.id);

  const allSelected =
    allFilteredIds.length > 0 &&
    allFilteredIds.every((id) => watchedStudents.includes(id));

  const toggleAll = () => {
    const current = form.getValues("studentIds");
    if (allSelected) {
      form.setValue(
        "studentIds",
        current.filter((id) => !allFilteredIds.includes(id))
      );
    } else {
      form.setValue(
        "studentIds",
        Array.from(new Set([...current, ...allFilteredIds]))
      );
    }
  };

const onSubmit = async (values: BulkMealEntryInput) => {
  const result = await recordBulkMealAttendance(values);
  
  if (result.success) {
    toast.success(`${result.data.count} records saved successfully`);
    
    // ফর্ম রিসেট করার সময় কোয়ান্টিটিও ১ করে দিন
    form.setValue("studentIds", []);
    form.setValue("mealTypeIds", []);
    form.setValue("quantity", 1); 
    
    // ঐচ্ছিক: গেস্ট মোড অফ করে দিতে চাইলে
    // form.setValue("isGuest", false);
  } else {
    toast.error(result.error ?? "Failed to save records");
  }
};

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        
        {/* DATE & QUANTITY ROW */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={(d) => field.onChange(d ? format(d, "yyyy-MM-dd") : "")}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity per Student</FormLabel>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => field.onChange(Math.max(1, Number(field.value) - 1))}
                  >
                    −
                  </Button>
                  <div className="flex h-10 flex-1 items-center justify-center rounded-md border bg-background px-3 text-sm font-bold tabular-nums">
                    {field.value}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => field.onChange(Math.min(50, Number(field.value) + 1))}
                  >
                    +
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* MEAL TYPES & GUEST TOGGLE */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            {/* CHANGED: Used standard Label instead of FormLabel */}
            <Label className="text-sm font-semibold">Meal Types</Label>
            <FormField
              control={form.control}
              name="isGuest"
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Switch
                    id="guest-mode"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  <Label htmlFor="guest-mode" className="text-xs font-medium cursor-pointer">Guest Meal Rate</Label>
                </div>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="mealTypeIds"
            render={({ field }) => (
              <FormItem>
                <div className="flex flex-wrap gap-2">
                  {mealTypes.map((meal) => {
                    const checked = field.value.includes(meal.id);
                    return (
                      <button
                        key={meal.id}
                        type="button"
                        onClick={() => {
                          const cur = field.value;
                          field.onChange(
                            checked ? cur.filter((id) => id !== meal.id) : [...cur, meal.id]
                          );
                        }}
                        className={cn(
                          "px-4 py-1.5 rounded-full border text-sm transition-colors",
                          checked ? "bg-primary text-white border-primary" : "bg-background hover:bg-accent"
                        )}
                      >
                        {meal.name}
                      </button>
                    );
                  })}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        <MealFilterBar
          sessions={sessions}
          classes={filter.classes}
          studentCount={filter.filteredStudents.length}
          selectedYear={filter.selectedYear}
          selectedClassId={filter.selectedClassId}
          onYearChange={filter.onYearChange}
          onClassChange={filter.onClassChange}
          onReset={filter.onReset}
        />

        {/* SELECT ALL SECTION */}
        <div className="flex justify-between items-center mb-2">
          {/* CHANGED: Used standard span instead of FormLabel */}
          <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Select Students
          </span>
          <Button type="button" size="sm" variant="outline" onClick={toggleAll}>
            {allSelected ? "Deselect All" : "Select All Filtered"}
          </Button>
        </div>

        {/* STUDENTS LIST */}
    {/* STUDENTS LIST */}
<FormField
  control={form.control}
  name="studentIds"
  render={({ field }) => (
    <FormItem>
      <ScrollArea className="h-72 border rounded-lg p-3 bg-card">
        {filter.filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <UserX className="h-8 w-8 mb-2 opacity-20" />
            <p className="text-sm">No students found for this filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filter.filteredStudents.map((student) => {
              const isChecked = field.value?.includes(student.id);
              
              return (
                <div
                  key={student.id}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-md border transition-all",
                    isChecked ? "bg-primary/5 border-primary/30" : "hover:bg-accent border-transparent"
                  )}
                >
                  {/* ক্লিক ইভেন্ট শুধুমাত্র চেকবক্সে রাখুন অথবা onCheckedChange ব্যবহার করুন */}
                  <Checkbox 
                    id={`student-${student.id}`}
                    checked={isChecked} 
                    onCheckedChange={(val) => {
                      const cur = field.value ?? [];
                      if (val) {
                        field.onChange([...cur, student.id]);
                      } else {
                        field.onChange(cur.filter((id) => id !== student.id));
                      }
                    }}
                  />
                  
                  {/* Label ব্যবহার করুন যাতে নামের ওপর ক্লিক করলেও চেকবক্স কাজ করে */}
                  <Label 
                    htmlFor={`student-${student.id}`}
                    className="flex flex-1 items-center gap-3 cursor-pointer"
                  >
                    <Avatar className="h-8 w-8 border">
                      <AvatarFallback className="text-[10px]">
                        {initials(student.name, student.surname)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium leading-none">
                        {student.name} {student.surname}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        ID: {student.id.slice(-6)}
                      </span>
                    </div>
                  </Label>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
      <FormMessage />
    </FormItem>
  )}
/>

        {/* SUMMARY & SUBMIT */}
        <div className="space-y-4">
          {totalEntries > 0 && (
            <div className="p-4 border rounded-lg bg-primary/5 border-primary/20 flex flex-col gap-1">
              <div className="flex justify-between text-sm">
                <span>Selected Students:</span>
                <span className="font-bold">{watchedStudents.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Meal Types:</span>
                <span className="font-bold">{watchedMeals.length}</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between text-base font-bold text-primary">
                <span>Total Meals to Record:</span>
                <span>{totalMealCount}</span>
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-12 text-lg font-semibold"
            disabled={form.formState.isSubmitting || totalEntries === 0}
          >
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              `Save ${totalMealCount > 0 ? totalMealCount : ""} Meal Records`
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}