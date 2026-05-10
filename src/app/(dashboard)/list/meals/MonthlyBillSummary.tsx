// src/components/meals/MonthlyBillSummary.tsx
"use client";

import { useState, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  Loader2,
  TrendingUp,
  Wallet,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Search,
  Receipt,
} from "lucide-react";
import { getStudentMonthlyBill, MonthlyBillResult } from "@/Actions/meals/meal.actions";
import Link from "next/link";


interface Student {
  id: string;
  name: string;
  rollNumber?: string | null;
  classSection?: string | null;
}

interface Props {
  students: Student[];
}

const MONTHS = [
  "January", "February", "March", "April",
  "May", "June", "July", "August",
  "September", "October", "November", "December",
];

const currentYear = new Date().getFullYear();
const YEARS = [currentYear - 1, currentYear, currentYear + 1];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    CONSUMED: { label: "Consumed", className: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
    CANCELED: { label: "Canceled", className: "bg-slate-50 text-slate-600 border-slate-200", icon: XCircle },
    WASTED:   { label: "Wasted",   className: "bg-amber-50 text-amber-700 border-amber-200",   icon: AlertCircle },
  };
  const config = map[status] ?? map.CONSUMED;
  const Icon = config.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", config.className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

function MetricCard({ label, value, sub, color = "default" }: {
  label: string;
  value: string;
  sub?: string;
  color?: "default" | "success" | "warning" | "destructive";
}) {
  const colors = {
    default: "text-foreground",
    success: "text-emerald-700",
    warning: "text-amber-700",
    destructive: "text-red-700",
  };
  return (
    <div className="rounded-lg bg-muted/50 p-4 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-semibold tracking-tight", colors[color])}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function MonthlyBillSummary({ students }: Props) {
  const [studentId, setStudentId] = useState("");
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(currentYear));
  const [result, setResult] = useState<MonthlyBillResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSearch = () => {
    if (!studentId || !month || !year) return;
    startTransition(async () => {
      const data = await getStudentMonthlyBill({
        studentId,
        month: Number(month),
        year: Number(year),
      });
      setResult(data);
    });
  };

  const balanceDue = result ? Number(result.balanceDue) : 0;

  return (
    <div className="space-y-6">
      {/* Search controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            Look up bill
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select student..." />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex items-center gap-2">
                      <span>{s.name}</span>
                      {s.rollNumber && (
                        <span className="text-xs text-muted-foreground">#{s.rollNumber}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={handleSearch}
              disabled={!studentId || isPending}
              className="gap-2"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
              View bill
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bill result */}
      {result && (
        <div className="space-y-4">
          {/* Student header */}
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {result.studentName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{result.studentName}</p>
              <p className="text-sm text-muted-foreground">
                Bill for {result.monthLabel}
              </p>
            </div>
 
<div className="ml-auto flex gap-2">
  
  {/* আপনার আগের Balance Due Badge */}
  {balanceDue > 0 ? (
    <Badge variant="destructive" className="gap-1">
      <AlertCircle className="h-3 w-3" />
      Balance due
    </Badge>
  ) : (
    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 gap-1">
      <CheckCircle2 className="h-3 w-3" />
      Paid
    </Badge>
  )}
</div>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard
              label="Gross bill"
              value={`৳${Number(result.grossTotal).toFixed(2)}`}
              sub={`${result.breakdown.reduce((s, b) => s + b.count, 0)} meals`}
            />
            <MetricCard
              label="Total paid"
              value={`৳${Number(result.totalPaid).toFixed(2)}`}
              color="success"
            />
            <MetricCard
              label="Balance due"
              value={`৳${Math.abs(balanceDue).toFixed(2)}`}
              color={balanceDue > 0 ? "destructive" : balanceDue < 0 ? "success" : "default"}
              sub={balanceDue < 0 ? "Advance credit" : undefined}
            />
            <MetricCard
              label="Meals logged"
              value={String(result.breakdown.reduce((s, b) => s + b.count, 0))}
              sub={`${result.breakdown.length} types`}
            />
          </div>

          {/* Breakdown table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Breakdown by meal type</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Meal</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.breakdown.map((b) => (
                    <TableRow key={b.mealTypeId}>
                      <TableCell className="font-medium">{b.mealTypeName}</TableCell>
                      <TableCell className="text-right text-muted-foreground">×{b.count}</TableCell>
                      <TableCell className="text-right font-medium">৳{Number(b.totalAmount).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 bg-muted/30">
                    <TableCell className="font-semibold">Total</TableCell>
                    <TableCell />
                    <TableCell className="text-right font-semibold">
                      ৳{Number(result.grossTotal).toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Recent logs */}
          {result.recentLogs.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Recent meal log</CardTitle>
                <CardDescription className="text-xs">Last 10 entries this month</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="max-h-72">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Meal</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.recentLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {new Date(log.date).toLocaleDateString("en-US", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            {log.mealTypeName}
                            {log.isGuest && (
                              <Badge variant="outline" className="ml-1 text-[10px] h-4">guest</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={log.status} />
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {log.status === "CANCELED"
                              ? <span className="text-muted-foreground">—</span>
                              : `৳${(Number(log.appliedRate) * log.quantity).toFixed(2)}`}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {result.recentLogs.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No meal records found for {result.monthLabel}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}