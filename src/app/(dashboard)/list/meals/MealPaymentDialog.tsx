// src/components/meals/MealPaymentDialog.tsx
"use client";

import { useState, useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input }     from "@/components/ui/input";
import { Textarea }  from "@/components/ui/textarea";
import { Button }    from "@/components/ui/button";
import { Badge }     from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  Loader2, Wallet, Receipt, AlertTriangle, CheckCircle2,
  FileText, ChevronDown, ChevronUp,
} from "lucide-react";
import { RecordPaymentInput, RecordPaymentSchema, UnpaidMealSummary } from "@/Actions/meals/meal-types";
import { getStudentUnpaidSummary, recordMealPaymentAndGetInvoice } from "@/Actions/meals/mealPayment.actions";
import { generateMealInvoice } from "./generateMealInvoice";


// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const PAYMENT_METHODS = [
  { value: "CASH",           label: "Cash" },
  { value: "BANK_TRANSFER",  label: "Bank Transfer" },
  { value: "MOBILE_BANKING", label: "Mobile Banking (bKash / Nagad)" },
  { value: "CHEQUE",         label: "Cheque" },
  { value: "ONLINE",         label: "Online Payment" },
] as const;

const NOW_YEAR  = new Date().getFullYear();
const NOW_MONTH = new Date().getMonth() + 1;

// ─── Types ────────────────────────────────────────────────────────────────────

interface StudentOption {
  id: string;
  name: string;
  rollNumber?: string | null;
}

interface Props {
  students: StudentOption[]
  school: {
    id: number;
    schoolName: string;
    shortName: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    academicSession: string | null;
    logoUrl: string | null;
    establishedYear: number | null;

    };
  }



// ─── Component ────────────────────────────────────────────────────────────────

export function MealPaymentDialog({ students, school }: Props) {
  const [open,          setOpen]          = useState(false);
  const [summary,       setSummary]       = useState<UnpaidMealSummary | null>(null);
  const [showLogs,      setShowLogs]      = useState(false);
  const [lastPaymentId, setLastPaymentId] = useState<number | null>(null);
  const [isFetching,    startFetch]       = useTransition();

  const form = useForm<RecordPaymentInput>({
    resolver: zodResolver(RecordPaymentSchema),
    defaultValues: {
      studentId:       "",
      month:           NOW_MONTH,
      year:            NOW_YEAR,
      amountCollected: 0,
      paymentMethod:   "CASH",
      remarks:         "",
    },
  });

  const watchedStudentId = form.watch("studentId");
  const watchedMonth     = form.watch("month");
  const watchedYear      = form.watch("year");
  const watchedAmount    = form.watch("amountCollected") ?? 0;

  // ── Auto-fetch bill summary ───────────────────────────────────────────────
  useEffect(() => {
    if (!watchedStudentId) { setSummary(null); return; }

    startFetch(async () => {
      const res = await getStudentUnpaidSummary({
        studentId: watchedStudentId,
        month:     watchedMonth,
        year:      watchedYear,
      });
      if (res.success) {
        setSummary(res.data);
        form.setValue("amountCollected", Math.max(0, Number(res.data.netDue.toFixed(2))));
      } else {
        setSummary(null);
        toast.error(res.error ?? "Could not load bill");
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedStudentId, watchedMonth, watchedYear]);

  // ── Submit ────────────────────────────────────────────────────────────────
// MealPaymentDialog.tsx এর ভেতরে নিচের কোডটুকু আপডেট করুন

// onSubmit ফাংশনের ভেতরে, generateMealInvoice কল করার আগে:

const onSubmit = async (values: RecordPaymentInput) => {
  if (!summary || summary.netDue <= 0) {
    toast.info("No outstanding balance.");
    return;
  }

  const res = await recordMealPaymentAndGetInvoice(values);

  if (res.success) {
    const { invoiceId, monthLabel } = res.data;
    
    const student = students.find(s => s.id === values.studentId);

    // সঠিকভাবে ইনভয়েস জেনারেট করা
    generateMealInvoice({
      schoolName: school?.schoolName || "Your School Name",
      shortName: school?.shortName || school?.schoolName || "Your School",
      schoolAddress: school?.address || "School Address",
      schoolPhone: school?.phone || "N/A",
      academicSession: school?.academicSession || "Current Session",
      establishedYear: school?.establishedYear || new Date().getFullYear(),
      studentName: student?.name || "Student",
      rollNumber: student?.rollNumber || "",
      monthLabel: monthLabel,
      amountPaid: values.amountCollected,
      paymentMethod: values.paymentMethod,
      invoiceId: invoiceId,
      breakdown: summary.breakdown,
      netDue: Math.max(0, summary.netDue - values.amountCollected),
    });

    toast.success(`৳${values.amountCollected.toFixed(2)} recorded & invoice downloaded.`);
    
    form.reset({
      studentId: "",
      month: NOW_MONTH,
      year: NOW_YEAR,
      amountCollected: 0,
      paymentMethod: "CASH",
      remarks: "",
    });
    setSummary(null);
    handleOpenChange(false);
  } else {
    toast.error(res.error ?? "Payment failed");
  }
};

  // ── Dialog close ──────────────────────────────────────────────────────────
  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) { form.reset(); setSummary(null); setLastPaymentId(null); setShowLogs(false); }
  };

  const overPaying = Boolean(summary && watchedAmount > summary.netDue);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Wallet className="h-4 w-4" /> Record payment
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-400">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Receipt className="h-5 w-5 text-muted-foreground" />
            Meal payment &amp; invoice
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">

            {/* Student */}
            <FormField control={form.control} name="studentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Student</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select student…" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {students.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                          {s.rollNumber && (
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              #{s.rollNumber}
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Month + Year */}
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Month</FormLabel>
                    <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {MONTHS.map((m, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {[NOW_YEAR - 1, NOW_YEAR, NOW_YEAR + 1].map((y) => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Loading */}
            {isFetching && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Calculating bill…
              </div>
            )}

            {/* Bill summary */}
            {summary && !isFetching && (
              <div className="space-y-3 rounded-xl border p-4 bg-muted/20">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <MetricPill label="Gross total"  value={`৳${summary.totalConsumed.toFixed(2)}`} color="default" />
                  <MetricPill label="Already paid" value={`৳${summary.totalPaid.toFixed(2)}`}    color="green" />
                  <MetricPill
                    label="Advance used"
                    value={`৳${summary.advanceUsed.toFixed(2)}`}
                    sub={`Left: ৳${(summary.advance - summary.advanceUsed).toFixed(2)}`}
                    color="amber"
                  />
                  <MetricPill
                    label="Net due"
                    value={`৳${summary.netDue.toFixed(2)}`}
                    color={summary.netDue > 0 ? "red" : "green"}
                  />
                </div>

                {summary.netDue <= 0 && (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    No outstanding balance for {summary.monthLabel}.
                  </div>
                )}

                {summary.breakdown.length > 0 && (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Meal type</TableHead>
                          <TableHead className="text-center">Count</TableHead>
                          <TableHead className="text-right">Rate</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {summary.breakdown.map((b) => (
                          <TableRow key={b.mealTypeName}>
                            <TableCell className="font-medium">{b.mealTypeName}</TableCell>
                            <TableCell className="text-center">×{b.count}</TableCell>
                            <TableCell className="text-right text-muted-foreground">৳{b.rate.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-semibold">৳{b.total.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {summary.unpaidLogs.length > 0 && (
                  <>
                    <Button type="button" variant="ghost" size="sm"
                      className="h-7 w-full justify-start gap-1.5 text-xs"
                      onClick={() => setShowLogs((p) => !p)}>
                      {showLogs ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      {showLogs ? "Hide" : "Show"} daily log ({summary.unpaidLogs.length} entries)
                    </Button>
                    {showLogs && (
                      <div className="rounded-lg border overflow-hidden max-h-52 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead><TableHead>Meal</TableHead>
                              <TableHead className="text-center">Qty</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {summary.unpaidLogs.map((log) => (
                              <TableRow key={log.id}>
                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                  {new Date(log.date).toLocaleDateString("en-US", { day: "2-digit", month: "short" })}
                                </TableCell>
                                <TableCell className="text-sm">{log.mealTypeName}</TableCell>
                                <TableCell className="text-center text-xs">×{log.quantity}</TableCell>
                                <TableCell className="text-right text-sm">৳{log.lineTotal.toFixed(2)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <Separator />

            {/* Payment fields */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField control={form.control} name="amountCollected"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount collected (৳)</FormLabel>
                    <FormControl>
                      <Input
                        type="number" step="0.01" min="0.01" placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        className={cn(overPaying && "border-amber-400 focus-visible:ring-amber-300")}
                      />
                    </FormControl>
                    {overPaying && (
                      <p className="flex items-center gap-1 text-xs text-amber-600 mt-1">
                        <AlertTriangle className="h-3 w-3" />
                        Exceeds net due — surplus credited to advance
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {PAYMENT_METHODS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField control={form.control} name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Remarks <Badge variant="outline" className="text-[10px] ml-1">optional</Badge>
                  </FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any notes…" className="resize-none" rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

   

            {/* Submit */}
            <Button type="submit" className="w-full gap-2"
              disabled={form.formState.isSubmitting || isFetching || !summary || summary.netDue <= 0}>
              {form.formState.isSubmitting
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Receipt className="h-4 w-4" />}
              {summary && summary.netDue > 0
                ? `Collect ৳${watchedAmount.toFixed(2)} & print invoice`
                : "No outstanding balance"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── MetricPill ───────────────────────────────────────────────────────────────

function MetricPill({ label, value, sub, color = "default" }: {
  label: string; value: string; sub?: string;
  color?: "default" | "green" | "amber" | "red";
}) {
  const p: Record<string, string> = {
    default: "bg-muted/60 text-foreground",
    green:   "bg-emerald-50 text-emerald-800 border border-emerald-200",
    amber:   "bg-amber-50   text-amber-800   border border-amber-200",
    red:     "bg-red-50     text-red-800     border border-red-200",
  };
  return (
    <div className={cn("rounded-lg p-3 space-y-0.5", p[color])}>
      <p className="text-[10px] opacity-60 uppercase tracking-wide">{label}</p>
      <p className="text-[15px] font-bold leading-tight">{value}</p>
      {sub && <p className="text-[10px] opacity-50">{sub}</p>}
    </div>
  );
}