"use client";

// src/components/Salary/SalaryPaymentListClient.tsx

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getAllSalaryPayments, getFullSalaryInvoiceForPDF } from "@/Actions/Salaryactions/Salaryactions";
import { generateSalaryPDF, type SalaryInvoiceData } from "@/lib/Generatesalarypdf";
import { generateSalaryReportPDF, type SalaryReportPayment } from "@/lib/generateSalaryReportPDF";
import Pagination from "@/components/Pagination";
import { itemPerPage } from "@/lib/setting";

type SalaryTypeFilter = { id: number; name: string };

type PaymentRow = {
  id:             number;
  invoiceNumber:  string;
  teacherId:      string;
  employeeName:    string;
  teacherImg:     string | null;
  salaryTypeName: string;
  amountPaid:     number;
  paymentMethod:  string;
  academicYear:   string;
  monthLabel:     string | null;
  paidAt:         string;
  processedBy:    string;
  remarks:        string | null;
};

const METHOD_LABEL: Record<string, string> = {
  CASH: "Cash", MOBILE_BANKING: "Mobile Banking", BANK_TRANSFER: "Bank Transfer",
};
const METHOD_PILL: Record<string, string> = {
  CASH:           "bg-emerald-100 text-emerald-700",
  MOBILE_BANKING: "bg-blue-100 text-blue-700",
  BANK_TRANSFER:  "bg-purple-100 text-purple-700",
};

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export default function SalaryPaymentListClient({
  salaryTypes,
  academicYears,
  schoolInfo,
  loginusername
}: {
  salaryTypes:   SalaryTypeFilter[];
  academicYears: string[];
  
  loginusername: string;
    schoolInfo: any

  
}) {
  // ── FIX: mounted gate ─────────────────────────────────────────────────────
  // Server renders a skeleton. Client takes over after mount.
  // This eliminates ALL hydration mismatches caused by:
  //   - useSearchParams() reading URL params that differ server vs client
  //   - new Date() producing different values server vs client
  //   - window.location access during render
  //   - itemPerPage reading that may differ
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const router       = useRouter();
  const searchParams = useSearchParams();
  const currentYear  = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

  // ── Filters ─────────────────────────────────────────────────────────────────
  const [filterName,    setFilterName]    = useState("");
  const [filterTypeId,  setFilterTypeId]  = useState<number | "">("");
  const [filterYear,    setFilterYear]    = useState(academicYears[0] ?? currentYear);
  const [filterMethod,  setFilterMethod]  = useState("");
  const [filterMonth,   setFilterMonth]   = useState("");
  const [filterFrom,    setFilterFrom]    = useState("");
  const [filterTo,      setFilterTo]      = useState("");

  // ── Data ──────────────────────────────────────────────────────────────────
  const [payments,     setPayments]     = useState<PaymentRow[]>([]);
  const [totalAmount,  setTotalAmount]  = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [page,         setPage]         = useState(1);

  // ── Download state ────────────────────────────────────────────────────────
  const [downloading,      setDownloading]      = useState<string | null>(null);
  const [reportGenerating, setReportGenerating] = useState(false);

  // ── Fetch from server action ──────────────────────────────────────────────
const fetchData = useCallback(async () => {
  setLoading(true);

  const res = await getAllSalaryPayments({
    teacherName: filterName || undefined,
    salaryTypeId: filterTypeId ? Number(filterTypeId) : undefined,
    academicYear: filterYear || undefined,
    paymentMethod: filterMethod || undefined,
    fromDate: filterFrom || undefined,
    toDate: filterTo || undefined,


  });

  if (res.success) {
    const formatted: PaymentRow[] = res.data.map((item) => ({
      ...item,
      teacherId: item.employeeId,
      teacherImg: item.employeeImg,
      amountPaid: Number(item.amountPaid),
      monthLabel: MONTHS[new Date(item.paidAt).getMonth()],

    }));

    setPayments(formatted);
    setTotalAmount(res.totalAmount);
  }

  setPage(1);
  setLoading(false);
}, [filterName, filterTypeId, filterYear, filterMethod, filterFrom, filterTo]);

  // ── Only fetch AFTER mount — never during SSR ─────────────────────────────
  useEffect(() => {
    if (mounted) { fetchData(); }
  }, [mounted]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Page navigation (safe: only called from event handlers) ───────────────
  const pushPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`?${params.toString()}`, { scroll: false });
    setPage(p);
  };

  // ── Month filter (client-side on loaded data) ─────────────────────────────
  const displayPayments = filterMonth
    ? payments.filter(p => p.monthLabel === filterMonth)
    : payments;

  const displayTotal = displayPayments.reduce((s, p) => s + Number(p.amountPaid), 0);

  // ── Pagination slice ──────────────────────────────────────────────────────
  const perPage   = itemPerPage || 20;
  const pageSlice = displayPayments.slice((page - 1) * perPage, page * perPage);

  // ── Individual invoice PDF ────────────────────────────────────────────────
const convertDecimalsToNumbers = (data: any): SalaryInvoiceData => {
  return {
    ...data,
    amountPaid: data.amountPaid ? Number(data.amountPaid) : 0,
  
  };
};

const handleDownloadInvoice = async (p: PaymentRow) => {
  setDownloading(p.invoiceNumber);
  const res = await getFullSalaryInvoiceForPDF(p.invoiceNumber);
  
  if (res.success && res.data) {
    const pdfData = {
      ...convertDecimalsToNumbers(res.data),
      schoolName: schoolInfo.name || "Your School Name",
      schoolAddress: schoolInfo.address || "School Address, City",
      schoolPhone: schoolInfo.phone || "01XXXXXXXXX",
      loginusername: loginusername || "Unknown User",
    };
    
    generateSalaryPDF(pdfData);
  } else {
    alert("Failed: " + (res.error ?? "Unknown error"));
  }
  setDownloading(null);
};

  // ── Report PDF ────────────────────────────────────────────────────────────
  const handleGenerateReport = () => {
    if (displayPayments.length === 0) {
      alert("No payments to export.");
      return;
    }
    setReportGenerating(true);
    try {
      const filterTypeName = salaryTypes.find(s => s.id === Number(filterTypeId))?.name;
      generateSalaryReportPDF({
        payments: displayPayments.map(p => (
          // console.log("Payment for PDF:", p), 
          
          {
          invoiceNumber:  p.invoiceNumber,
          teacherName:    p.employeeName,
          salaryTypeName: p.salaryTypeName,
          monthLabel:     p.monthLabel,
          amountPaid:     p.amountPaid,
          paymentMethod:  p.paymentMethod,
          academicYear:   p.academicYear,
          paidAt:         p.paidAt,
          collectedBy:    p.processedBy,
          remarks:        p.remarks,
        } as SalaryReportPayment)),
        filterMonth:   filterMonth    || undefined,
        filterYear:    filterYear     || undefined,
        filterTeacher: filterName     || undefined,
        filterType:    filterTypeName || undefined,
        filterMethod:  filterMethod ? METHOD_LABEL[filterMethod] ?? filterMethod : undefined,
        fromDate:      filterFrom     || undefined,
        toDate:        filterTo       || undefined,
        schoolName:    schoolInfo.name || "Your School Name",
        schoolAddress: schoolInfo.address || "School Address, City",
        schoolPhone:   schoolInfo.phone || "01XXXXXXXXX",
        generatedBy:   loginusername || "Unknown User",
      });
    } catch {
      alert("PDF generation failed.");
    }
    setReportGenerating(false);
  };

  // ── Daily totals ──────────────────────────────────────────────────────────
  const dailyMap: Record<string, number> = {};
  displayPayments.forEach(p => {
    const day = p.paidAt.slice(0, 10);
    dailyMap[day] = (dailyMap[day] ?? 0) + Number(p.amountPaid);
  });
  const topDays = Object.entries(dailyMap)
    .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
    .slice(0, 7);

  // ── Month breakdown ───────────────────────────────────────────────────────
  const monthTotals: Record<string, number> = {};
  payments.forEach(p => {
    const k = p.monthLabel ?? "Unspecified";
    monthTotals[k] = (monthTotals[k] ?? 0) + Number(p.amountPaid);
  });

  // ── Stable SSR skeleton — prevents hydration mismatch ────────────────────
  if (!mounted) {
    return (
      <div className="bg-white p-4 rounded-xl flex-1 m-4 mt-0 space-y-4">
        <div className="h-7 w-64 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-4 w-44 bg-gray-100 rounded-lg animate-pulse" />
        <div className="grid grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
        <div className="h-32 bg-gray-50 rounded-xl animate-pulse" />
        <div className="h-64 bg-gray-50 rounded-xl animate-pulse" />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white p-4 rounded-xl flex-1 m-4 mt-0 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">📊Employee Salary Payment Records</h1>
          <p className="text-sm text-gray-500">All employee salary disbursements</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a href="/list/salary/cashier"
            className="text-sm bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-4 py-2 rounded-lg font-medium transition-colors">
            + Pay Salary
          </a>
          <button
            onClick={handleGenerateReport}
            disabled={reportGenerating || displayPayments.length === 0}
            className="flex items-center gap-2 text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-semibold shadow-sm transition-all"
          >
            {reportGenerating ? (
              <span className="animate-pulse">Generating…</span>
            ) : (
              <>
                <span>📄</span>
                <span>
                  Export PDF Report
                  {filterMonth && <span className="ml-1 text-emerald-200">· {filterMonth}</span>}
                  {displayPayments.length > 0 && (
                    <span className="ml-1.5 bg-white/20 text-xs px-1.5 py-0.5 rounded-full">
                      {displayPayments.length}
                    </span>
                  )}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-4 text-white">
          <p className="text-xs text-emerald-200 font-medium uppercase tracking-wider">Total Disbursed</p>
          <p className="text-2xl font-bold mt-1">৳{displayTotal.toLocaleString()}</p>
          {filterMonth && totalAmount !== displayTotal && (
            <p className="text-xs text-emerald-200 mt-0.5">of ৳{totalAmount.toLocaleString()} total</p>
          )}
        </div>
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 text-white">
          <p className="text-xs text-indigo-200 font-medium uppercase tracking-wider">Transactions</p>
          <p className="text-2xl font-bold mt-1">{displayPayments.length}</p>
        </div>
        <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl p-4 text-white">
          <p className="text-xs text-sky-200 font-medium uppercase tracking-wider">Cash</p>
          <p className="text-2xl font-bold mt-1">
            ৳{displayPayments.filter(p => p.paymentMethod === "CASH")
              .reduce((s, p) => s + Number(p.amountPaid), 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-4 text-white">
          <p className="text-xs text-amber-200 font-medium uppercase tracking-wider">Mobile / Bank</p>
          <p className="text-2xl font-bold mt-1">
            ৳{displayPayments.filter(p => p.paymentMethod !== "CASH")
              .reduce((s, p) => s + Number(p.amountPaid), 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">🔍 Filters</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          <input type="text" placeholder="Teacher name…" value={filterName}
            onChange={e => setFilterName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && fetchData()}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white col-span-2 md:col-span-1" />

          <select value={filterTypeId} onChange={e => setFilterTypeId(e.target.value ? Number(e.target.value) : "")}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300">
            <option value="">All Types</option>
            {salaryTypes.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
          </select>

          <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300">
            <option value="">All Years</option>
            {academicYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          <select value={filterMethod} onChange={e => setFilterMethod(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300">
            <option value="">All Methods</option>
            <option value="CASH">Cash</option>
            <option value="MOBILE_BANKING">Mobile Banking</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
          </select>

          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-gray-400 px-1">From date</label>
            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300" />
          </div>

          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-gray-400 px-1">To date</label>
            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300" />
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={fetchData}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-5 py-2 rounded-lg font-medium transition-colors">
            Apply
          </button>
          <button
            onClick={() => {
              setFilterName(""); setFilterTypeId("");
              setFilterYear(academicYears[0] ?? currentYear);
              setFilterMethod(""); setFilterFrom(""); setFilterTo(""); setFilterMonth("");
              pushPage(1);
            }}
            className="bg-gray-200 hover:bg-gray-300 text-gray-600 text-sm px-4 py-2 rounded-lg font-medium transition-colors">
            Reset
          </button>
        </div>
         {/* Daily totals strip */}
    
      </div>

      {/* Month filter chips */}
      {payments.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Filter by Month</h3>
            {filterMonth && (
              <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
                {filterMonth} — {displayPayments.length} payment{displayPayments.length !== 1 ? "s" : ""} · ৳{displayTotal.toLocaleString()}
              </span>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => { setFilterMonth(""); pushPage(1); }}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-medium transition-all border ${
                !filterMonth
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:text-emerald-600"
              }`}
            >
              All Months
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${!filterMonth ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                {payments.length}
              </span>
            </button>

            {MONTHS.filter(m => monthTotals[m] !== undefined).map(month => {
              const isActive   = filterMonth === month;
              const monthCount = payments.filter(p => p.monthLabel === month).length;
              const monthTotal = monthTotals[month] ?? 0;
              return (
                <button key={month}
                  onClick={() => { setFilterMonth(isActive ? "" : month); pushPage(1); }}
                  className={`flex flex-col items-center text-xs px-3 py-1.5 rounded-xl font-medium transition-all border min-w-[76px] ${
                    isActive
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                      : "bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50"
                  }`}
                >
                  <span className="font-semibold">{month.slice(0, 3)}</span>
                  <span className={`text-xs mt-0.5 ${isActive ? "text-emerald-100" : "text-gray-400"}`}>
                    ৳{monthTotal.toLocaleString()}
                  </span>
                  <span className={`text-xs ${isActive ? "text-emerald-200" : "text-gray-300"}`}>
                    {monthCount} paid
                  </span>
                </button>
              );
            })}

            {monthTotals["Unspecified"] && (
              <button
                onClick={() => { setFilterMonth(filterMonth === "Unspecified" ? "" : "Unspecified"); pushPage(1); }}
                className={`flex flex-col items-center text-xs px-3 py-1.5 rounded-xl font-medium transition-all border min-w-[76px] ${
                  filterMonth === "Unspecified"
                    ? "bg-gray-600 text-white border-gray-600 shadow-md"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                }`}
              >
                <span className="font-semibold">Other</span>
                <span className={`text-xs mt-0.5 ${filterMonth === "Unspecified" ? "text-gray-200" : "text-gray-400"}`}>
                  ৳{monthTotals["Unspecified"].toLocaleString()}
                </span>
              </button>
            )}
          </div>

          <p className="text-xs text-gray-400">
            💡 Select a month then click <strong>Export PDF Report</strong> to download that months salary report.
          </p>
        </div>
      )}

      {/* Daily totals strip */}
      {/* {topDays.length > 0 && (
        <div className="space-y-1.5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent Daily Totals</h3>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {topDays.map(([day, amt]) => (
              <div key={day} className="flex-shrink-0 bg-emerald-50 rounded-lg px-3 py-2 text-center min-w-[90px]">
                <p className="text-xs text-emerald-400 font-medium">
                  {new Date(day).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                </p>
                <p className="text-sm font-bold text-emerald-700">৳{amt.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )} */}
         <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
          <tr className="bg-emerald-50 border-t-2 border-emerald-200">
                  <td colSpan={4} className="px-3 py-2.5 text-xs font-bold text-emerald-700">
                    {displayPayments.length} payment{displayPayments.length !== 1 ? "s" : ""}
                    {filterMonth && <span className="ml-1 text-emerald-500">({filterMonth})</span>}
                  </td>
                  <td className="px-3 py-2.5 font-bold text-emerald-800 whitespace-nowrap">
                    ৳{pageSlice.reduce((s, p) => s + Number(p.amountPaid), 0).toLocaleString()}
                    <span className="block text-xs font-normal text-emerald-500">this page</span>
                  </td>
                  <td colSpan={3} />
                  <td className="px-3 py-2.5 text-right">
                    <button
                      onClick={handleGenerateReport}
                      disabled={reportGenerating}
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap">
                      📄 Report PDF
                    </button>
                  </td>
                </tr>
                </table>
                </div>

      {/* Payment table */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading payments…</div>
      ) : displayPayments.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-gray-50 rounded-xl">
          <p className="text-3xl mb-2">📋</p>
          <p>{filterMonth ? `No payments for ${filterMonth}.` : "No payments found."}</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Invoice","Teacher","Salary Type","Month","Amount","Method","Date","Paid By","PDF"].map(h => (
                    <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageSlice.map((p, idx) => (
                  <tr key={p.id}
                    className={`border-b border-gray-50 last:border-0 hover:bg-emerald-50/20 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}>
                    <td className="px-3 py-2.5">
                      <span className="font-mono text-xs text-emerald-600 whitespace-nowrap">{p.invoiceNumber}</span>
                    </td>
                    <td className="px-3 py-2.5 font-medium text-gray-800 whitespace-nowrap">{p.employeeName}</td>
                    <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">{p.salaryTypeName}</td>
                    <td className="px-3 py-2.5">
                      {p.monthLabel
                        ? <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{p.monthLabel}</span>
                        : <span className="text-xs text-gray-400">—</span>
                      }
                    </td>
                    <td className="px-3 py-2.5 font-bold text-gray-900 whitespace-nowrap">
                      ৳{Number(p.amountPaid).toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${METHOD_PILL[p.paymentMethod] ?? "bg-gray-100 text-gray-500"}`}>
                        {METHOD_LABEL[p.paymentMethod] ?? p.paymentMethod}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="text-xs text-gray-600 block">
                        {new Date(p.paidAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(p.paidAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-500">{p.processedBy}</td>
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => handleDownloadInvoice(p)}
                        disabled={downloading === p.invoiceNumber}
                        className="text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-50 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap">
                        {downloading === p.invoiceNumber ? "…" : "⬇ PDF"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            
         
            </table>
          </div>

          <Pagination page={page} count={displayPayments.length} />
        </>
      )}
    </div>
  );
}