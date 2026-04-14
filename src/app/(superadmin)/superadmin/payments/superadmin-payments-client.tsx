"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { recordSubscriptionPaymentBySuperAdmin } from "@/Actions/school/superadmin-payment.action";

type SchoolOption = {
  id: number;
  schoolName: string;
  slug: string;
  expiredAt: Date | null;
  plan: { name: string };
};

type PaymentItem = {
  id: number;
  amount: { toString: () => string } | number | string;
  paymentMethod: string;
  status: string;
  transactionId: string | null;
  invoiceNo: string | null;
  note: string | null;
  paidAt: Date;
  school: { schoolName: string; slug: string };
};

type Props = {
  schools: SchoolOption[];
  payments: PaymentItem[];
};

type PaymentMethod = "CASH" | "MOBILE_BANKING" | "BANK_TRANSFER";

export default function SuperAdminPaymentsClient({ schools, payments }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    schoolId: schools[0]?.id ?? 0,
    amount: "",
    paymentMethod: "CASH" as PaymentMethod,
    transactionId: "",
    invoiceNo: "",
    note: "",
    extendDays: "365",
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      const result = await recordSubscriptionPaymentBySuperAdmin({
        schoolId: Number(form.schoolId),
        amount: Number(form.amount),
        paymentMethod: form.paymentMethod,
        transactionId: form.transactionId,
        invoiceNo: form.invoiceNo,
        note: form.note,
        extendDays: Number(form.extendDays),
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setForm((prev) => ({ ...prev, amount: "", transactionId: "", invoiceNo: "", note: "" }));
      router.refresh();
    });
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <div className="lg:col-span-2 rounded-xl border border-[#1f2130] bg-[#0f1117] p-4">
        <h2 className="mb-4 text-lg font-semibold">Record Payment + Renewal</h2>
        <form onSubmit={onSubmit} className="space-y-3">
          <Field label="School">
            <select
              value={form.schoolId}
              onChange={(e) => setForm((p) => ({ ...p, schoolId: Number(e.target.value) }))}
              className="w-full rounded-lg border border-[#2a2d3a] bg-[#0a0c10] px-3 py-2 text-sm"
            >
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.schoolName} (/{school.slug}) - {school.plan.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Amount">
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
              className="w-full rounded-lg border border-[#2a2d3a] bg-[#0a0c10] px-3 py-2 text-sm"
              placeholder="2500"
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Payment Method">
              <select
                value={form.paymentMethod}
                onChange={(e) => setForm((p) => ({ ...p, paymentMethod: e.target.value as PaymentMethod }))}
                className="w-full rounded-lg border border-[#2a2d3a] bg-[#0a0c10] px-3 py-2 text-sm"
              >
                <option value="CASH">CASH</option>
                <option value="MOBILE_BANKING">MOBILE_BANKING</option>
                <option value="BANK_TRANSFER">BANK_TRANSFER</option>
              </select>
            </Field>

            <Field label="Extend Days">
              <input
                type="number"
                value={form.extendDays}
                onChange={(e) => setForm((p) => ({ ...p, extendDays: e.target.value }))}
                className="w-full rounded-lg border border-[#2a2d3a] bg-[#0a0c10] px-3 py-2 text-sm"
                required
              />
            </Field>
          </div>

          <Field label="Transaction ID (Optional)">
            <input
              value={form.transactionId}
              onChange={(e) => setForm((p) => ({ ...p, transactionId: e.target.value }))}
              className="w-full rounded-lg border border-[#2a2d3a] bg-[#0a0c10] px-3 py-2 text-sm"
            />
          </Field>

          <Field label="Invoice No (Optional)">
            <input
              value={form.invoiceNo}
              onChange={(e) => setForm((p) => ({ ...p, invoiceNo: e.target.value }))}
              className="w-full rounded-lg border border-[#2a2d3a] bg-[#0a0c10] px-3 py-2 text-sm"
            />
          </Field>

          <Field label="Note (Optional)">
            <textarea
              rows={3}
              value={form.note}
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
              className="w-full rounded-lg border border-[#2a2d3a] bg-[#0a0c10] px-3 py-2 text-sm"
            />
          </Field>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-[#2563eb] px-4 py-2 text-sm hover:bg-[#1d4ed8] disabled:opacity-50"
          >
            {isPending ? "Processing..." : "Confirm Payment & Renew"}
          </button>
        </form>
      </div>

      <div className="lg:col-span-3 rounded-xl border border-[#1f2130] bg-[#0f1117] p-4">
        <h2 className="mb-4 text-lg font-semibold">Payment History (Latest 50)</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="text-left text-[#6b7280]">
              <tr className="border-b border-[#1f2130]">
                <th className="py-2">School</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Method</th>
                <th className="py-2">Status</th>
                <th className="py-2">Invoice</th>
                <th className="py-2">Paid At</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((item) => (
                <tr key={item.id} className="border-b border-[#11131a]">
                  <td className="py-3">
                    <p className="font-medium">{item.school.schoolName}</p>
                    <p className="text-xs text-[#6b7280]">/{item.school.slug}</p>
                  </td>
                  <td className="py-3">৳{String(item.amount)}</td>
                  <td className="py-3">{item.paymentMethod}</td>
                  <td className="py-3">{item.status}</td>
                  <td className="py-3">{item.invoiceNo ?? "N/A"}</td>
                  <td className="py-3">{new Date(item.paidAt).toLocaleDateString("en-BD")}</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-5 text-center text-[#6b7280]">
                    No payment history found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-[#9ca3af]">{label}</label>
      {children}
    </div>
  );
}
