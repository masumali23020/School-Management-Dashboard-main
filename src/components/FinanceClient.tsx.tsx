"use client";

// src/components/Finance/FinanceClient.tsx

import { useState, useEffect, useCallback } from "react";

import { generateFinanceReportPDF } from "@/lib/generateFinanceReportPDF";
import { FinanceSummary, FinanceTransaction, getFinanceData } from "@/Actions/financeActions/financeActions";

// ── Constants ──────────────────────────────────────────────────────────────
const METHOD_LABEL: Record<string, string> = {
  CASH: "Cash", MOBILE_BANKING: "Mobile Banking", BANK_TRANSFER: "Bank Transfer",
};
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const TYPE_PILL: Record<string, string> = {
  INCOME:  "bg-emerald-100 text-emerald-700",
  EXPENSE: "bg-red-100 text-red-600",
};

const PAGE_SIZE = 25;

// ── Mini bar chart ─────────────────────────────────────────────────────────
function MiniBarChart({ data }: { data: { month: string; income: number; expense: number }[] }) {
  if (data.length === 0) return null;
  const maxVal = Math.max(...data.flatMap(d => [d.income, d.expense]), 1);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> Income</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block" /> Expense</span>
      </div>
      <div className="flex items-end gap-1.5 h-28 overflow-x-auto pb-1">
        {data.map(d => {
          const incH = Math.round((d.income  / maxVal) * 96);
          const expH = Math.round((d.expense / maxVal) * 96);
          return (
            <div key={d.month} className="flex flex-col items-center gap-0.5 flex-shrink-0" style={{ minWidth: 32 }}>
              <div className="flex items-end gap-0.5 h-24">
                <div
                  title={`Income: ৳${d.income.toLocaleString()}`}
                  className="w-3.5 rounded-t bg-emerald-500 transition-all cursor-pointer hover:bg-emerald-600"
                  style={{ height: incH || 2 }}
                />
                <div
                  title={`Expense: ৳${d.expense.toLocaleString()}`}
                  className="w-3.5 rounded-t bg-red-400 transition-all cursor-pointer hover:bg-red-500"
                  style={{ height: expH || 2 }}
                />
              </div>
              <span className="text-xs text-gray-400" style={{ fontSize: 9 }}>{d.month.slice(0,3)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function FinanceClient({ academicYears }: { academicYears: string[] }) {
  const currentYear = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // ── Filters ────────────────────────────────────────────────────────────────
  const [filterYear,   setFilterYear]   = useState(academicYears[0] ?? currentYear);
  const [filterMonth,  setFilterMonth]  = useState("");
  const [filterType,   setFilterType]   = useState<"" | "INCOME" | "EXPENSE">("");
  const [filterFrom,   setFilterFrom]   = useState("");
  const [filterTo,     setFilterTo]     = useState("");

  // ── Data ───────────────────────────────────────────────────────────────────
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [summary,      setSummary]      = useState<FinanceSummary | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [page,         setPage]         = useState(1);
  const [pdfLoading,   setPdfLoading]   = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await getFinanceData({
      academicYear: filterYear   || undefined,
      month:        filterMonth  || undefined,
      fromDate:     filterFrom   || undefined,
      toDate:       filterTo     || undefined,
      type:         filterType   || undefined,
    });
    if (res.success) {
      setTransactions(res.transactions as FinanceTransaction[]);
      setSummary(res.summary as FinanceSummary);
    }
    setPage(1);
    setLoading(false);
  }, [filterYear, filterMonth, filterFrom, filterTo, filterType]);

  useEffect(() => { if (mounted) fetchData(); }, [mounted]); // eslint-disable-line

  // ── PDF ────────────────────────────────────────────────────────────────────
  const handleDownloadPDF = () => {
    if (!summary || transactions.length === 0) { alert("No data to export."); return; }
    setPdfLoading(true);
    try {
      generateFinanceReportPDF({
        transactions,
        summary,
        filterMonth:  filterMonth || undefined,
        filterYear:   filterYear  || undefined,
        filterType:   filterType  || undefined,
        fromDate:     filterFrom  || undefined,
        toDate:       filterTo    || undefined,
        schoolName:   "Your School Name",
        schoolAddress:"School Address, City",
        schoolPhone:  "01XXXXXXXXX",
        generatedBy:  "Admin",
      });
    } catch { alert("PDF generation failed."); }
    setPdfLoading(false);
  };

  // ── Pagination ─────────────────────────────────────────────────────────────
  const pageSlice  = transactions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));

  // ── Month summary for chips ────────────────────────────────────────────────
  const monthStats: Record<string, { income: number; expense: number }> = {};
  transactions.forEach(t => {
    const m = t.monthLabel ?? "—";
    if (!monthStats[m]) monthStats[m] = { income: 0, expense: 0 };
    if (t.type === "INCOME")  monthStats[m].income  += t.amount;
    if (t.type === "EXPENSE") monthStats[m].expense += t.amount;
  });

  // ── SSR skeleton ──────────────────────────────────────────────────────────
  if (!mounted) {
    return (
      <div className="bg-white p-4 rounded-xl flex-1 m-4 mt-0 space-y-4">
        <div className="h-7 w-56 bg-gray-100 rounded-lg animate-pulse" />
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
        <div className="h-36 bg-gray-50 rounded-xl animate-pulse" />
        <div className="h-64 bg-gray-50 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-xl flex-1 m-4 mt-0 space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">🏦 Finance Overview</h1>
          <p className="text-sm text-gray-500">Income & Expense — all transactions in one view</p>
        </div>
        <button
          onClick={handleDownloadPDF}
          disabled={pdfLoading || !summary || transactions.length === 0}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white text-sm px-5 py-2.5 rounded-lg font-semibold shadow-sm transition-all"
        >
          {pdfLoading ? <span className="animate-pulse">Generating…</span> : <>📄 Download Finance Report</>}
        </button>
      </div>

      {/* ── Summary cards ── */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Income */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">Total Income</p>
              <span className="text-xl">📈</span>
            </div>
            <p className="text-3xl font-bold">৳{summary.totalIncome.toLocaleString()}</p>
            <p className="text-xs text-emerald-200 mt-1">{summary.incomeCount} transactions</p>
            <div className="mt-3 space-y-1">
              {summary.incomeByCategory.slice(0, 3).map(c => (
                <div key={c.category} className="flex justify-between text-xs">
                  <span className="text-emerald-100 truncate max-w-[120px]">{c.category}</span>
                  <span className="text-white font-medium">৳{c.total.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Expense */}
          <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-5 text-white shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-red-100 uppercase tracking-wider">Total Expense</p>
              <span className="text-xl">📉</span>
            </div>
            <p className="text-3xl font-bold">৳{summary.totalExpense.toLocaleString()}</p>
            <p className="text-xs text-red-200 mt-1">{summary.expenseCount} transactions</p>
            <div className="mt-3 space-y-1">
              {summary.expenseByCategory.slice(0, 3).map(c => (
                <div key={c.category} className="flex justify-between text-xs">
                  <span className="text-red-100 truncate max-w-[120px]">{c.category}</span>
                  <span className="text-white font-medium">৳{c.total.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Net */}
          <div className={`rounded-2xl p-5 text-white shadow-sm bg-gradient-to-br ${
            summary.netBalance >= 0
              ? "from-blue-600 to-indigo-700"
              : "from-orange-500 to-amber-600"
          }`}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
                {summary.netBalance >= 0 ? "Net Surplus" : "Net Deficit"}
              </p>
              <span className="text-xl">{summary.netBalance >= 0 ? "✅" : "⚠️"}</span>
            </div>
            <p className="text-3xl font-bold">৳{Math.abs(summary.netBalance).toLocaleString()}</p>
            <p className="text-xs mt-1 opacity-70">
              {summary.netBalance >= 0
                ? `Income exceeds expense by ৳${summary.netBalance.toLocaleString()}`
                : `Expense exceeds income by ৳${Math.abs(summary.netBalance).toLocaleString()}`}
            </p>
            {/* Progress bar */}
            {summary.totalIncome > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1 opacity-70">
                  <span>Income used for expense</span>
                  <span>{Math.min(100, Math.round(summary.totalExpense / summary.totalIncome * 100))}%</span>
                </div>
                <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white/70 rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.round(summary.totalExpense / summary.totalIncome * 100))}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Chart ── */}
      {summary && summary.monthly.length > 0 && (
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">📊 Monthly Income vs Expense</h3>
          <MiniBarChart data={summary.monthly} />
        </div>
      )}

      {/* ── Filters ── */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">🔍 Filters</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
            <option value="">All Years</option>
            {academicYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          <select value={filterType} onChange={e => setFilterType(e.target.value as any)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
            <option value="">Income & Expense</option>
            <option value="INCOME">Income only</option>
            <option value="EXPENSE">Expense only</option>
          </select>

          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-gray-400 px-1">From date</label>
            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>

          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-gray-400 px-1">To date</label>
            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>

          <div className="flex items-end gap-2">
            <button onClick={fetchData}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors">
              Apply
            </button>
            <button onClick={() => {
              setFilterYear(academicYears[0] ?? currentYear);
              setFilterType(""); setFilterFrom(""); setFilterTo(""); setFilterMonth("");
            }}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-600 text-sm px-4 py-2 rounded-lg font-medium transition-colors">
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* ── Month chips ── */}
      {transactions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Filter by Month</h3>
            {filterMonth && (
              <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-medium">
                {filterMonth} selected
              </span>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => { setFilterMonth(""); setPage(1); }}
              className={`text-xs px-3 py-1.5 rounded-xl font-medium border transition-all ${
                !filterMonth
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
              }`}
            >
              All ({transactions.length})
            </button>

            {MONTHS.filter(m => monthStats[m]).map(month => {
              const stat   = monthStats[month];
              const isAct  = filterMonth === month;
              const net    = stat.income - stat.expense;
              return (
                <button key={month}
                  onClick={() => { setFilterMonth(isAct ? "" : month); setPage(1); }}
                  className={`flex flex-col items-center text-xs px-3 py-1.5 rounded-xl font-medium border transition-all min-w-[70px] ${
                    isAct
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                      : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50"
                  }`}
                >
                  <span className="font-semibold">{month.slice(0,3)}</span>
                  <span className={`text-xs mt-0.5 ${isAct ? "text-indigo-100" : "text-emerald-500"}`}>
                    +৳{stat.income.toLocaleString()}
                  </span>
                  <span className={`text-xs ${isAct ? "text-indigo-200" : "text-red-400"}`}>
                    -৳{stat.expense.toLocaleString()}
                  </span>
                  <span className={`text-xs font-bold ${
                    isAct ? "text-white" : net >= 0 ? "text-blue-600" : "text-orange-500"
                  }`}>
                    {net >= 0 ? "▲" : "▼"}৳{Math.abs(net).toLocaleString()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Transaction table ── */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-3xl mb-2">⏳</p>
          <p>Loading transactions…</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-gray-50 rounded-xl">
          <p className="text-3xl mb-2">📋</p>
          <p>No transactions found for the selected filters.</p>
        </div>
      ) : (
        <>
          {/* Active filter summary */}
          {filterMonth && (
            <div className="flex items-center gap-3 text-sm flex-wrap">
              <span className="font-semibold text-gray-700">{filterMonth}</span>
              <span className="text-emerald-600 font-medium">
                Income: ৳{transactions.filter(t => t.type === "INCOME").reduce((s,t) => s+t.amount, 0).toLocaleString()}
              </span>
              <span className="text-red-500 font-medium">
                Expense: ৳{transactions.filter(t => t.type === "EXPENSE").reduce((s,t) => s+t.amount, 0).toLocaleString()}
              </span>
              <span className={`font-bold ${(transactions.filter(t=>t.type==="INCOME").reduce((s,t)=>s+t.amount,0) - transactions.filter(t=>t.type==="EXPENSE").reduce((s,t)=>s+t.amount,0)) >= 0 ? "text-blue-600" : "text-orange-500"}`}>
                Net: ৳{(transactions.filter(t=>t.type==="INCOME").reduce((s,t)=>s+t.amount,0) - transactions.filter(t=>t.type==="EXPENSE").reduce((s,t)=>s+t.amount,0)).toLocaleString()}
              </span>
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["#","Invoice","Type","Name","Category","Month","Amount","Method","Date","By"].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageSlice.map((t, idx) => {
                  const isIncome = t.type === "INCOME";
                  return (
                    <tr key={`${t.type}-${t.id}`}
                      className={`border-b border-gray-50 last:border-0 transition-colors ${
                        isIncome ? "hover:bg-emerald-50/30" : "hover:bg-red-50/20"
                      } ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}>
                      <td className="px-3 py-2.5 text-xs text-gray-400">{(page-1)*PAGE_SIZE + idx + 1}</td>
                      <td className="px-3 py-2.5">
                        <span className="font-mono text-xs text-indigo-600 whitespace-nowrap">{t.invoiceNumber}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${TYPE_PILL[t.type]}`}>
                          {isIncome ? "📈 Income" : "📉 Expense"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-medium text-gray-800 whitespace-nowrap text-xs">{t.party}</td>
                      <td className="px-3 py-2.5 text-gray-600 text-xs">{t.category}</td>
                      <td className="px-3 py-2.5">
                        {t.monthLabel
                          ? <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{t.monthLabel}</span>
                          : <span className="text-xs text-gray-400">—</span>
                        }
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className={`font-bold text-sm ${isIncome ? "text-emerald-600" : "text-red-500"}`}>
                          {isIncome ? "+" : "-"}৳{t.amount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs text-gray-500">{METHOD_LABEL[t.paymentMethod] ?? t.paymentMethod}</span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="text-xs text-gray-600 block">
                          {new Date(t.paidAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(t.paidAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap">{t.collectedBy}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 border-t-2 border-slate-700">
                  <td colSpan={6} className="px-3 py-2.5 text-xs font-bold text-slate-300">
                    {transactions.length} total transactions
                    {filterMonth && <span className="ml-1 text-slate-400">({filterMonth})</span>}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="text-xs">
                      <span className="text-emerald-400 font-bold block">
                        +৳{transactions.filter(t=>t.type==="INCOME").reduce((s,t)=>s+t.amount,0).toLocaleString()}
                      </span>
                      <span className="text-red-400 font-bold block">
                        -৳{transactions.filter(t=>t.type==="EXPENSE").reduce((s,t)=>s+t.amount,0).toLocaleString()}
                      </span>
                    </div>
                  </td>
                  <td colSpan={2} />
                  <td className="px-3 py-2.5 text-right">
                    <button
                      onClick={handleDownloadPDF}
                      disabled={pdfLoading}
                      className="text-xs bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap"
                    >
                      📄 PDF
                    </button>
                  </td>
                </tr>
                <tr className="bg-slate-800">
                  <td colSpan={6} className="px-3 py-1.5 text-xs font-bold text-slate-300">Net Balance</td>
                  <td className="px-3 py-1.5">
                    {(() => {
                      const inc = transactions.filter(t=>t.type==="INCOME").reduce((s,t)=>s+t.amount,0);
                      const exp = transactions.filter(t=>t.type==="EXPENSE").reduce((s,t)=>s+t.amount,0);
                      const net = inc - exp;
                      return (
                        <span className={`font-bold text-sm ${net >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {net >= 0 ? "▲" : "▼"}৳{Math.abs(net).toLocaleString()}
                        </span>
                      );
                    })()}
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Page {page} of {totalPages} · showing {pageSlice.length} of {transactions.length}
              </p>
              <div className="flex gap-1">
                <button onClick={() => setPage(1)} disabled={page===1} className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40">«</button>
                <button onClick={() => setPage(p=>Math.max(1,p-1))} disabled={page===1} className="text-xs px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40">‹</button>
                {Array.from({length: Math.min(5, totalPages)}, (_,i) => {
                  const pg = Math.min(Math.max(page-2,1)+i, totalPages);
                  return <button key={pg} onClick={() => setPage(pg)}
                    className={`text-xs px-3 py-1 rounded transition-colors ${pg===page ? "bg-indigo-600 text-white" : "bg-gray-100 hover:bg-gray-200"}`}>{pg}</button>;
                })}
                <button onClick={() => setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} className="text-xs px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40">›</button>
                <button onClick={() => setPage(totalPages)} disabled={page===totalPages} className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40">»</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}