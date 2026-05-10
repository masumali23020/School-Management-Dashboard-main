// src/components/meals/MealEntryForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { format } from "date-fns";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  CalendarIcon,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  UserCheck,
  Users,
} from "lucide-react";
import { toast } from "react-toastify";
import { ClassForFilter, recordMealAttendance, StudentForMeal } from "@/Actions/meals/meal.actions";

import { MealEntryInput, MealEntrySchema } from "@/lib/FormValidationSchema";
import { MealFilterBar } from "./MealFilterBar";
import { useMealFilter } from "./useMealFilter";




// ─── Types ────────────────────────────────────────────────────────────────────

interface MealType {
  id: number;
  name: string;
  rate: string;
  guestRate?: string | null;
}

interface Props {
  mealTypes: MealType[];
  sessions: string[];
  initialClasses: ClassForFilter[];
  initialStudents: StudentForMeal[];
}

const STATUS_OPTIONS = [
  {
    value: "CONSUMED",
    label: "Consumed",
    icon: CheckCircle2,
    color: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-200",
  },
  {
    value: "CANCELED",
    label: "Canceled",
    icon: XCircle,
    color: "text-slate-500",
    bg: "bg-slate-50 border-slate-200",
  },
  {
    value: "WASTED",
    label: "Wasted",
    icon: AlertCircle,
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
  },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function MealEntryForm({
  mealTypes,
  sessions,
  initialClasses,
  initialStudents,
}: Props) {
  const [selectedMealType, setSelectedMealType] = useState<MealType | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  const filter = useMealFilter({ initialClasses, initialStudents });

  const form = useForm<MealEntryInput>({
    resolver: zodResolver(MealEntrySchema),
    defaultValues: {
      studentId: "",
      mealTypeId: 0,
      date: format(new Date(), "yyyy-MM-dd"),
      isGuest: false,
      quantity: 1,
      status: "CONSUMED",
    },
  });

  const watchedMealTypeId = form.watch("mealTypeId");
  const watchedStatus = form.watch("status");
  const watchedStudentId = form.watch("studentId");

  // Keep selectedMealType in sync with form value
  useEffect(() => {
    const found = mealTypes.find((m) => m.id === watchedMealTypeId);
    setSelectedMealType(found ?? null);
  }, [watchedMealTypeId, mealTypes]);

  // Clear student selection if they're filtered out
  useEffect(() => {
    if (
      watchedStudentId &&
      !filter.filteredStudents.find((s) => s.id === watchedStudentId)
    ) {
      form.setValue("studentId", "");
    }
  }, [filter.filteredStudents, watchedStudentId, form]);

  const computedRate = selectedMealType
    ? isGuest && selectedMealType.guestRate
      ? Number(selectedMealType.guestRate)
      : Number(selectedMealType.rate)
    : 0;

  const selectedStudent = filter.filteredStudents.find(
    (s) => s.id === watchedStudentId
  );

const onSubmit = async (values: MealEntryInput) => {
  try {
    console.log("FORM VALUES:", values);

    const result = await recordMealAttendance({
      ...values,
      isGuest,
    });

    console.log("SERVER RESULT:", result);

    if (result?.success) {
      toast.success("Meal saved successfully");

      form.reset({
        studentId: values.studentId,
        mealTypeId: undefined,
        date: values.date,
        isGuest: false,
        quantity: 1,
        status: "CONSUMED",
      });

      setIsGuest(false);
      setSelectedMealType(null);
    } else {
      toast.error(result?.error || "Save failed");
    }
  } catch (error) {
    console.error("SUBMIT ERROR:", error);
    toast.error("Something went wrong");
  }
};
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

        {/* ① Date ─────────────────────────────────────────────────────── */}
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value
                        ? format(new Date(field.value), "PPP")
                        : "Pick a date"}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value ? new Date(field.value) : undefined}
                    onSelect={(d) =>
                      field.onChange(d ? format(d, "yyyy-MM-dd") : "")
                    }
                    disabled={(d) => d > new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* ② Filter → Student ─────────────────────────────────────────── */}
        <div className="space-y-3">
          <p className="text-sm font-medium leading-none">Select student</p>

          {/* Session → Class cascade */}
          <MealFilterBar
            sessions={sessions}
            classes={filter.classes}
            studentCount={filter.filteredStudents.length}
            selectedYear={filter.selectedYear}
            selectedClassId={filter.selectedClassId}
            onYearChange={filter.onYearChange}
            onClassChange={filter.onClassChange}
            onReset={filter.onReset}
            isPending={filter.isPending}
          />

          {/* Student dropdown — narrowed by filter */}
          <FormField
            control={form.control}
            name="studentId"
            render={({ field }) => (
              <FormItem>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={filter.isPending}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          filter.isPending
                            ? "Loading…"
                            : filter.filteredStudents.length === 0
                            ? "No students found"
                            : "Choose a student…"
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {filter.filteredStudents.length === 0 ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        No students match the selected filter.
                      </div>
                    ) : (
                      filter.filteredStudents.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          <div className="flex items-center gap-2 min-w-0">
                            <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate">
                              {s.name} {s.surname}
                            </span>
                            {s.rollNumber && (
                              <span className="text-xs text-muted-foreground shrink-0">
                                #{s.rollNumber}
                              </span>
                            )}
                            {s.className && (
                              <Badge
                                variant="outline"
                                className="text-[10px] h-4 shrink-0"
                              >
                                {s.className}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Confirmation chip after student selected */}
          {selectedStudent && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              <UserCheck className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium">
                {selectedStudent.name} {selectedStudent.surname}
              </span>
              {selectedStudent.className && (
                <span className="text-emerald-600">
                  · {selectedStudent.className}
                </span>
              )}
              {selectedStudent.academicYear && (
                <span className="ml-auto text-emerald-600">
                  {selectedStudent.academicYear}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ③ Meal type card picker ────────────────────────────────────── */}
        <FormField
          control={form.control}
          name="mealTypeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Meal type</FormLabel>
              {mealTypes.length === 0 ? (
                <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-4 text-center">
                  No active meal types. Add one in the Meal types tab.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {mealTypes.map((meal) => {
                    const isSelected = field.value === meal.id;
                    const displayRate = isGuest && meal.guestRate
                      ? Number(meal.guestRate)
                      : Number(meal.rate);
                    return (
                      <button
                        key={meal.id}
                        type="button"
                        onClick={() => field.onChange(meal.id)}
                        className={cn(
                          "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all",
                          isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border hover:border-primary/50 hover:bg-accent"
                        )}
                      >
                        <span className="text-sm font-medium">{meal.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ৳{displayRate.toFixed(2)}
                        </span>
                        {meal.guestRate && (
                          <span className="text-[10px] text-muted-foreground">
                            Guest: ৳{Number(meal.guestRate).toFixed(2)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* ④ Guest toggle + Quantity ──────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex items-center gap-3 rounded-lg border p-3 flex-1">
            <Switch
              id="guest-toggle"
              checked={isGuest}
              onCheckedChange={(v) => {
                setIsGuest(v);
                form.setValue("isGuest", v);
              }}
            />
            <div>
              <Label
                htmlFor="guest-toggle"
                className="text-sm font-medium cursor-pointer"
              >
                Guest meal
              </Label>
              <p className="text-xs text-muted-foreground">
                {selectedMealType?.guestRate
                  ? `Guest rate: ৳${Number(selectedMealType.guestRate).toFixed(2)}`
                  : "No separate guest rate set"}
              </p>
            </div>
          </div>

       <FormField
  control={form.control}
  name="quantity"
  render={({ field }) => (
    <FormItem className="min-w-[110px]">
      <FormLabel>Quantity</FormLabel>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() =>
            field.onChange(Math.max(1, Number(field.value) - 1))
          }
        >
          −
        </Button>

        <div className="flex h-9 min-w-[48px] items-center justify-center rounded-md border bg-background px-3 text-sm font-medium tabular-nums">
          {field.value}
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() =>
            field.onChange(Math.min(10, Number(field.value) + 1))
          }
        >
          +
        </Button>
      </div>

      <FormMessage />
    </FormItem>
  )}
/>
        </div>

        {/* ⑤ Status ──────────────────────────────────────────────────── */}
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <div className="grid grid-cols-3 gap-2">
                {STATUS_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = field.value === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => field.onChange(opt.value)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all",
                        isSelected
                          ? `${opt.bg} ${opt.color}`
                          : "border-border text-muted-foreground hover:bg-accent"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator />

        {/* Live charge preview */}
        {selectedMealType && (
          <div className="rounded-lg bg-muted/50 p-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {selectedMealType.name}
              {isGuest && " (guest)"} × {form.watch("quantity")}
            </span>
            <span className="font-semibold">
              ৳{(computedRate * form.watch("quantity")).toFixed(2)}
            </span>
          </div>
        )}

        {watchedStatus === "WASTED" && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            ⚠️ Wasted meals may be subject to a fine as per school policy.
          </p>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Save meal entry
        </Button>
      </form>
    </Form>
  );
}