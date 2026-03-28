// src/components/Fee/StudentFeeHistory.tsx
// Embed this in the student detail page

"use client";

import { getStudentPaymentHistory } from "@/Actions/Feeactions/Feeactions";
import { useState, useEffect } from "react";


type Payment = {
  id: number;
  invoiceNumber: string;
  feeTypeName: string;
  amountPaid: number;
  paymentMethod: string;
  academicYear: string;
  monthLabel: string | null;
  paidAt: string;
  collectedBy: string;
  remarks: string | null;
};

export default function StudentFeeHistory({ studentId }: { studentId: string }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [invoiceModal, setInvoiceModal] = useState<Payment | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await getStudentPaymentHistory(studentId, selectedYear || undefined);
      if (res.success) setPayments(res.data as Payment[]);
      setLoading(false);
    })();
  }, [studentId, selectedYear]);

  // Collect all distinct years from data
  const years = [...new Set(payments.map((p) => p.academicYear))].sort().reverse();

  const totalPaid = payments.reduce((sum, p) => sum + p.amountPaid, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-gray-700">💳 Fee Payment History</h3>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none bg-white"
        >
          <option value="">All Years</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-6 text-gray-400 text-sm">Loading…</div>
      ) : payments.length === 0 ? (
        <div className="text-center py-6 text-gray-400 text-sm bg-gray-50 rounded-xl">
          No payment records found.
        </div>
      ) : (
        <>
          <div className="text-right text-sm text-gray-500">
            Total paid: <strong className="text-emerald-600">৳{totalPaid.toLocaleString()}</strong>
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Invoice</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Fee Type</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Date</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p, idx) => (
                  <tr key={p.id} className={`border-b border-gray-50 last:border-0 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}>
                    <td className="px-3 py-2">
                      <span className="font-mono text-xs text-indigo-600">{p.invoiceNumber}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {p.feeTypeName}
                      {p.monthLabel && <span className="text-xs text-gray-400 ml-1">({p.monthLabel})</span>}
                    </td>
                    <td className="px-3 py-2 font-semibold text-gray-800">৳{p.amountPaid.toLocaleString()}</td>
                    <td className="px-3 py-2 text-gray-500 text-xs hidden md:table-cell">
                      {new Date(p.paidAt).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-3 py-2">
                      <a
                        href={`/list/fees/invoice/${encodeURIComponent(p.invoiceNumber)}/pdf`}
                        target="_blank"
                        className="text-xs bg-indigo-100 text-indigo-600 hover:bg-indigo-200 px-2 py-1 rounded-lg transition-colors"
                      >
                        📄 PDF
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}