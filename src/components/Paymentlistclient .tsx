"use client";

import { useState, useEffect, useCallback } from "react";

import { generateInvoicePDF, type InvoiceData } from "@/lib/generateInvoicePDF";
import { getAllPayments } from "@/Actions/Feeactions/Feeactions";

type ClassItem = { id: number; name: string };
type PaymentRow = {
  id: number;
  invoiceNumber: string;
  studentId: string;
  studentName: string;
  className: string;
  feeTypeName: string;
  amountPaid: number;
  paymentMethod: string;
  academicYear: string;
  monthLabel: string | null;
  paidAt: string;
  collectedBy: string;
  remarks: string | null;
};

const METHOD_LABEL: Record<string, string> = {
  CASH: "Cash", MOBILE_BANKING: "Mobile Banking", BANK_TRANSFER: "Bank Transfer",
};
const METHOD_COLOR: Record<string, string> = {
  CASH: "bg-emerald-100 text-emerald-700",
  MOBILE_BANKING: "bg-blue-100 text-blue-700",
  BANK_TRANSFER: "bg-purple-100 text-purple-700",
};

export default function PaymentListClient({
  classes,
  academicYears,
  schoolInfo,
}: {
  classes: ClassItem[];
  academicYears: string[];
  schoolInfo: { name: string; address: string; phone: string; email: string; establishedYear: string; eiinNumber: string; academicSession: string }
}) {
  // ── Filters ────────────────────────────────────────────────────────────
  const currentYear = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
  const [filterName,    setFilterName]    = useState("");
  const [filterClass,   setFilterClass]   = useState<number | "">("");
  const [filterYear,    setFilterYear]    = useState(academicYears[0] ?? currentYear);
  const [filterMethod,  setFilterMethod]  = useState("");
  const [filterFrom,    setFilterFrom]    = useState("");
  const [filterTo,      setFilterTo]      = useState("");

  // ── Data ───────────────────────────────────────────────────────────────
  const [payments,     setPayments]     = useState<PaymentRow[]>([]);
  const [totalAmount,  setTotalAmount]  = useState(0);
  const [totalCount,   setTotalCount]   = useState(0);
  const [loading,      setLoading]      = useState(true);

  // ── Pagination ─────────────────────────────────────────────────────────
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);

const fetchData = useCallback(async () => {
  setLoading(true);
  try {
    const res = await getAllPayments({
      studentName:   filterName   || undefined,
      classId:       filterClass  ? Number(filterClass) : undefined,
      academicYear:  filterYear   || undefined,
      paymentMethod: filterMethod || undefined,
      fromDate:      filterFrom   || undefined,
      toDate:        filterTo     || undefined,
    });
    
    if (res.success) {
      setPayments(res.data as PaymentRow[]);
      setTotalAmount(res.totalAmount ?? 0);  // Use nullish coalescing
      setTotalCount(res.count ?? 0);         // Use nullish coalescing
    } else {
      // Handle error case
      setPayments([]);
      setTotalAmount(0);
      setTotalCount(0);
      console.error("Failed to fetch payments:", res.error);
    }
  } catch (error) {
    console.error("Error fetching payments:", error);
    setPayments([]);
    setTotalAmount(0);
    setTotalCount(0);
  } finally {
    setPage(1);
    setLoading(false);
  }
}, [filterName, filterClass, filterYear, filterMethod, filterFrom, filterTo]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearch = () => fetchData();
  const handleReset = () => {
    setFilterName(""); setFilterClass(""); setFilterYear(academicYears[0] ?? currentYear);
    setFilterMethod(""); setFilterFrom(""); setFilterTo("");
  };

  // Paginated slice
  const paginated = payments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(payments.length / PAGE_SIZE));

  const handleDownloadPDF = (p: PaymentRow) => {
    generateInvoicePDF({
      invoiceNumber: p.invoiceNumber,
      studentName:   p.studentName,
      studentId:     p.studentId,
      className:     p.className,
      feeTypeName:   p.feeTypeName,
      amountPaid:    p.amountPaid,
      paymentMethod: p.paymentMethod,
      monthLabel:    p.monthLabel,
      academicYear:  p.academicYear,
      paidAt:        p.paidAt,
      collectedBy:   p.collectedBy,
      remarks:       p.remarks,
      schoolName:    schoolInfo.name,
      schoolAddress: schoolInfo.address,
      schoolPhone:   schoolInfo.phone,
      schoolEmail:   schoolInfo.email,
      establishedYear: schoolInfo.establishedYear,
      eiinNumber: schoolInfo.eiinNumber,
      academicSession: schoolInfo.academicSession,
    } as InvoiceData);
  };

  // Daily totals from filtered data
  const dailyMap: Record<string, number> = {};
  payments.forEach((p) => {
    const day = p.paidAt.slice(0, 10);
    dailyMap[day] = (dailyMap[day] ?? 0) + p.amountPaid;
  });
  const topDays = Object.entries(dailyMap)
    .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
    .slice(0, 7);

  return (
    <div className="bg-white p-4 rounded-xl flex-1 m-4 mt-0 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">📊 Student Payment Records</h1>
          <p className="text-sm text-gray-500">All student fee collection history</p>
        </div>
        <a href="/list/fees/cashier"
          className="text-sm bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-4 py-2 rounded-lg font-medium">
          + New Payment
        </a>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 text-white">
          <p className="text-xs text-indigo-200 font-medium uppercase tracking-wider">Total Collected</p>
          <p className="text-2xl font-bold mt-1">৳{totalAmount.toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-4 text-white">
          <p className="text-xs text-emerald-200 font-medium uppercase tracking-wider">Transactions</p>
          <p className="text-2xl font-bold mt-1">{totalCount}</p>
        </div>
        <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl p-4 text-white">
          <p className="text-xs text-sky-200 font-medium uppercase tracking-wider">Cash</p>
          <p className="text-2xl font-bold mt-1">
            ৳{payments.filter(p => p.paymentMethod === "CASH").reduce((s,p) => s + p.amountPaid, 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-4 text-white">
          <p className="text-xs text-amber-200 font-medium uppercase tracking-wider">Mobile / Bank</p>
          <p className="text-2xl font-bold mt-1">
            ৳{payments.filter(p => p.paymentMethod !== "CASH").reduce((s,p) => s + p.amountPaid, 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">🔍 Filters</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          <input type="text" placeholder="Student name…" value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white col-span-2 md:col-span-1" />

          <select value={filterClass} onChange={(e) => setFilterClass(e.target.value ? Number(e.target.value) : "")}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
            <option value="">All Classes</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
            <option value="">All Years</option>
            {academicYears.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>

          <select value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
            <option value="">All Methods</option>
            <option value="CASH">Cash</option>
            <option value="MOBILE_BANKING">Mobile Banking</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
          </select>

          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-gray-400 px-1">From date</label>
            <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
          </div>

          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-gray-400 px-1">To date</label>
            <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={handleSearch}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-5 py-2 rounded-lg font-medium transition-colors">
            Apply Filters
          </button>
          <button onClick={handleReset}
            className="bg-gray-200 hover:bg-gray-300 text-gray-600 text-sm px-4 py-2 rounded-lg font-medium transition-colors">
            Reset
          </button>
        </div>
      </div>

      {/* ── Daily summary strip ── */}
      {topDays.length > 0 && (
        <div className="space-y-1.5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent Daily Totals</h3>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {topDays.map(([day, amt]) => (
              <div key={day} className="flex-shrink-0 bg-indigo-50 rounded-lg px-3 py-2 text-center min-w-[90px]">
                <p className="text-xs text-indigo-400 font-medium">
                  {new Date(day).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                </p>
                <p className="text-sm font-bold text-indigo-700">৳{amt.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Payment table ── */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading payments…</div>
      ) : payments.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-gray-50 rounded-xl">No payments found.</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Invoice", "Student", "Class", "Fee Type", "Month", "Amount", "Method", "Date", "Collected By", "PDF"].map((h) => (
                    <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((p, idx) => (
                  <tr key={p.id} className={`border-b border-gray-50 last:border-0 hover:bg-indigo-50/30 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}>
                    <td className="px-3 py-3">
                      <span className="font-mono text-xs text-indigo-600 whitespace-nowrap">{p.invoiceNumber}</span>
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-gray-800 whitespace-nowrap">{p.studentName}</p>
                      <p className="text-xs text-gray-400">{p.studentId.slice(0, 12)}…</p>
                    </td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{p.className}</td>
                    <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{p.feeTypeName}</td>
                    <td className="px-3 py-3 text-gray-500 text-xs">{p.monthLabel ?? "—"}</td>
                    <td className="px-3 py-3 font-bold text-gray-900 whitespace-nowrap">৳{p.amountPaid.toLocaleString()}</td>
                    <td className="px-3 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${METHOD_COLOR[p.paymentMethod] ?? "bg-gray-100 text-gray-600"}`}>
                        {METHOD_LABEL[p.paymentMethod] ?? p.paymentMethod}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(p.paidAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      <span className="block text-gray-400">
                        {new Date(p.paidAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-xs">{p.collectedBy}</td>
                    <td className="px-3 py-3">
                      <button onClick={() => handleDownloadPDF(p)}
                        className="text-xs bg-indigo-100 text-indigo-600 hover:bg-indigo-200 px-2 py-1 rounded-lg transition-colors whitespace-nowrap">
                        ⬇ PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Footer total row */}
              <tfoot>
                <tr className="bg-indigo-50 border-t-2 border-indigo-200">
                  <td colSpan={5} className="px-3 py-3 text-sm font-bold text-indigo-700">
                    Showing {paginated.length} of {totalCount} payments
                  </td>
                  <td className="px-3 py-3 text-sm font-bold text-indigo-800">
                    ৳{paginated.reduce((s, p) => s + p.amountPaid, 0).toLocaleString()}
                    <span className="block text-xs font-normal text-indigo-500">this page</span>
                  </td>
                  <td colSpan={4} className="px-3 py-3 text-right">
                    <span className="text-sm font-bold text-indigo-700">
                      Total: ৳{totalAmount.toLocaleString()}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-1">
                <button onClick={() => setPage(1)} disabled={page === 1}
                  className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40">«</button>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="text-xs px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40">‹ Prev</button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pg = Math.min(Math.max(page - 2, 1) + i, totalPages);
                  return (
                    <button key={pg} onClick={() => setPage(pg)}
                      className={`text-xs px-3 py-1 rounded transition-colors ${pg === page ? "bg-indigo-600 text-white" : "bg-gray-100 hover:bg-gray-200"}`}>
                      {pg}
                    </button>
                  );
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="text-xs px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40">Next ›</button>
                <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                  className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40">»</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}