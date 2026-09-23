"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ApplicationStatusBadge,
  PaymentStatusBadge,
} from "@/components/admission/StatusBadges";
import type {
  AdmissionApplicationStatus,
  AdmissionPaymentStatus,
} from "@prisma/client";

type ApplicationRow = {
  id: number;
  applicationNumber: string;
  studentName: string;
  contactMobile: string;
  applicationStatus: AdmissionApplicationStatus;
  paymentStatus: AdmissionPaymentStatus;
  createdAt: string | Date;
  className: string;
};

type Props = {
  items: ApplicationRow[];
  total: number;
  page: number;
  totalPages: number;
  sessions: { id: number; name: string }[];
  classes: { id: number; name: string }[];
  filters: Record<string, string | undefined>;
};

export default function AdmissionApplicationsTable({
  items,
  total,
  page,
  totalPages,
  sessions,
  classes,
  filters,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") params.set(key, value);
    else params.delete(key);
    params.delete("page");
    startTransition(() => router.push(`/list/admission?${params.toString()}`));
  };

  const goPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    startTransition(() => router.push(`/list/admission?${params.toString()}`));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Applications ({total})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <Input
            placeholder="Search app no / name / mobile"
            defaultValue={filters.search ?? ""}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                updateFilter("search", (e.target as HTMLInputElement).value);
              }
            }}
          />
          <Select
            value={filters.sessionId ?? "all"}
            onValueChange={(v) => updateFilter("sessionId", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Session" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sessions</SelectItem>
              {sessions.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.classId ?? "all"}
            onValueChange={(v) => updateFilter("classId", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.applicationStatus ?? "all"}
            onValueChange={(v) => updateFilter("applicationStatus", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="App Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {[
                "SUBMITTED",
                "PAYMENT_PENDING",
                "PAYMENT_VERIFIED",
                "UNDER_REVIEW",
                "APPROVED",
                "CONFIRMED",
                "APPLICATION_REJECTED",
                "PAYMENT_REJECTED",
              ].map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.paymentStatus ?? "all"}
            onValueChange={(v) => updateFilter("paymentStatus", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Payment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="VERIFIED">Verified</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            defaultValue={filters.dateFrom ?? ""}
            onChange={(e) => updateFilter("dateFrom", e.target.value)}
          />
          <Input
            type="date"
            defaultValue={filters.dateTo ?? ""}
            onChange={(e) => updateFilter("dateTo", e.target.value)}
          />
        </div>

        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Application No</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No applications found.
                  </TableCell>
                </TableRow>
              )}
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.applicationNumber}</TableCell>
                  <TableCell>{item.studentName}</TableCell>
                  <TableCell>{item.className}</TableCell>
                  <TableCell>{item.contactMobile}</TableCell>
                  <TableCell>
                    <PaymentStatusBadge status={item.paymentStatus} />
                  </TableCell>
                  <TableCell>
                    <ApplicationStatusBadge status={item.applicationStatus} />
                  </TableCell>
                  <TableCell>
                    {new Date(item.createdAt).toLocaleDateString("en-GB")}
                  </TableCell>
                  <TableCell>
                    <Link href={`/list/admission/applications/${item.id}`}>
                      <Button size="sm" variant="outline">
                        View
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => goPage(page - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => goPage(page + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
