"use client";

// src/components/Salary/SalaryCashierClient.tsx
// Cashier pays teacher salary — mirrors CashierClient for students exactly

import { useState } from "react";
import Image from "next/image";
import {
  getTeacherSalaryStatus,
  recordSalaryPayment,
} from "@/Actions/Salaryactions/Salaryactions";
import { generateSalaryPDF, SalaryInvoiceData } from "@/lib/Generatesalarypdf";

type SalaryTypeItem = { id: number; name: string; isRecurring: boolean };
type SalaryStructureItem = {
  id: number;
  salaryTypeId: number;
  salaryTypeName: string;
  isRecurring: boolean;
  amount: number;
};
type TeacherItem = {
  id: string;
  name: string;
  surname: string;
  img: string | null;
  phone: string | null;
  subjects: string[];
  salaryStructures: SalaryStructureItem[];
};

type SalaryStatusItem = {
  structureId: number;
  salaryTypeId: number;
  salaryTypeName: string;
  isRecurring: boolean;
  amount: number;
  totalPaid: number;
  payments: {
    id: number;
    invoiceNumber: string;
    amountPaid: number;
    paymentMethod: string;
    monthLabel: string | null;
    paidAt: string;
    collectedBy: string;
  }[];
};

type Invoice = {
  id: number;
  invoiceNumber: string;
  teacherName: string;
  teacherId: string;
  salaryTypeName: string;
  amountPaid: number;
  paymentMethod: string;
  monthLabel: string | null;
  academicYear: string;
  paidAt: string;
  collectedBy: string;
};

const METHOD_LABEL: Record<string, string> = {
  CASH: "Cash",
  MOBILE_BANKING: "Mobile Banking",
  BANK_TRANSFER: "Bank Transfer",
};
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function SalaryCashierClient({
  salaryTypes,
  teachers,
  schoolInfo
}: {
  salaryTypes: SalaryTypeItem[];
  teachers: TeacherItem[];
  schoolInfo: {
    name: string;
    address: string;
    phone: string;
    shortName: string | null;
    email: string;
    logoUrl: string | null;
    academicSession: string;

  };

}) {
  const currentYear = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

  // Search / filter
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TeacherItem[]>(teachers);
  const [hasSearched, setHasSearched] = useState(false);

  // Selected teacher + status
  const [selected, setSelected] = useState<TeacherItem | null>(null);
  const [salaryStatus, setSalaryStatus] = useState<{
    salaryStatus: SalaryStatusItem[];
    totalConfigured: number;
    totalPaid: number;
    academicYear: string;
  } | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // Month filter state
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // Payment form
  const [selStructureId, setSelStructureId] = useState<number | "">("");
  const [selSalaryTypeId, setSelSalaryTypeId] = useState<number | "">("");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<
    "CASH" | "MOBILE_BANKING" | "BANK_TRANSFER"
  >("CASH");
  const [payMonth, setPayMonth] = useState("");
  const [payRemarks, setPayRemarks] = useState("");
  const [payError, setPayError] = useState("");
  const [payLoading, setPayLoading] = useState(false);

  // Invoice modal
  const [lastInvoice, setLastInvoice] = useState<Invoice | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);

  // ── Search (client-side filter since teachers are loaded) ──────────────
  const handleSearch = () => {
    setHasSearched(true);
    if (!query.trim()) {
      setSearchResults(teachers);
      return;
    }
    const q = query.toLowerCase();
    setSearchResults(
      teachers.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.surname.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          t.subjects.some((s) => s.toLowerCase().includes(q)),
      ),
    );
  };

  // ── Select teacher → load status ───────────────────────────────────────
  const handleSelect = async (teacher: TeacherItem) => {
    setSelected(teacher);
    setSalaryStatus(null);
    setStatusLoading(true);
    setSelStructureId("");
    setSelSalaryTypeId("");
    setPayAmount("");
    setLastInvoice(null);
    setShowInvoice(false);
    setSelectedMonth(null); // Reset month filter when changing teacher

    const res = await getTeacherSalaryStatus(teacher.id, currentYear);
    setStatusLoading(false);
    if (res.success && res.data) setSalaryStatus(res.data as any);
  };

  // When selecting a configured structure
  const handleSelectStructure = (structureId: number) => {
    setSelStructureId(structureId);
    const item = salaryStatus?.salaryStatus.find(
      (s) => s.structureId === structureId,
    );
    if (item) {
      setSelSalaryTypeId(item.salaryTypeId);
      setPayAmount(String(item.amount));
    }
    setPayError("");
  };

  // When selecting an ad-hoc salary type (not from structure)
  const handleSelectAdHoc = (salaryTypeId: number) => {
    setSelSalaryTypeId(salaryTypeId);
    setSelStructureId("");
    setPayAmount("");
    setPayError("");
  };

  // ── Record payment ──────────────────────────────────────────────────────
  const handlePay = async () => {
    if (!selected || !selSalaryTypeId || !payAmount) {
      setPayError("Please select a salary type and enter an amount.");
      return;
    }
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) {
      setPayError("Enter a valid amount.");
      return;
    }

    setPayError("");
    setPayLoading(true);

    const res = await recordSalaryPayment({
      employeeId: selected.id,
      salaryTypeId: Number(selSalaryTypeId),
      salaryStructureId: selStructureId ? Number(selStructureId) : undefined,
      amountPaid: amount,
      paymentMethod: payMethod,
      academicYear: currentYear,
      monthLabel: payMonth || undefined,
      
    });

    setPayLoading(false);

    if (res.success && res.data) {
      const rawData = res.data as any;

      const mappedInvoice: Invoice = {
        id: rawData.id,
        invoiceNumber: rawData.invoiceNumber,
        teacherName: `${rawData.employee?.name || ""} ${rawData.employee?.surname || ""}`,
        teacherId: rawData.employeeId,
        salaryTypeName: rawData.salaryType?.name || "N/A",
        amountPaid: Number(rawData.amountPaid),
        paymentMethod: rawData.paymentMethod,
        monthLabel: rawData.monthLabel,
        academicYear: rawData.academicYear,
        paidAt: rawData.paidAt,
        collectedBy: rawData.processedById || "System",
      };

      setLastInvoice(mappedInvoice);
      setShowInvoice(true);
      setSelStructureId("");
      setSelSalaryTypeId("");
      setPayAmount("");
      setPayMonth("");
      setPayRemarks("");
      handleSelect(selected);
    } else {
      setPayError(res.error ?? "Payment failed.");
    }
  };

  // ── Download PDF ────────────────────────────────────────────────────────
const handleDownloadPDF = async (payment: SalaryStatusItem['payments'][0] & { 
  teacherName: string; 
  teacherPhone: string | null;
  salaryTypeName: string;
  amount: number;
  academicYear: string;
}) => {
  try {
    // School information from props
    const schoolData = {
      name: schoolInfo.name || "Your School Name",
      shortName: schoolInfo.shortName || "School",
      address: schoolInfo.address || "School Address, City",
      phone: schoolInfo.phone || "01XXXXXXXXX",
      email: schoolInfo.email || "info@school.com",
      academicSession: schoolInfo.academicSession || currentYear,
    };

    await generateSalaryPDF({
      invoiceNumber: payment.invoiceNumber,
      employeeId: selected?.id || '',
      employeeName: payment.teacherName,
      employeePhone: selected?.phone || null,
      employeeEmail: null,
      employeeImg: null,
      salaryTypeName: payment.salaryTypeName,
      isRecurring: false,
      amountPaid: payment.amountPaid,
      paymentMethod: payment.paymentMethod,
      monthLabel: payment.monthLabel || null,
      academicYear: payment.academicYear,
      paidAt: payment.paidAt,
      processedBy: payment.collectedBy,
      processedById: "admin-id",
      remarks: null,
      schoolName: schoolData.name,
      schoolAddress: schoolData.address,
      schoolPhone: schoolData.phone,
      schoolEmail: schoolData.email,
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    setPayError('Failed to generate PDF. Please try again.');
  }
};

  // Configured structures for selected teacher this year
  const configuredStatus = salaryStatus?.salaryStatus ?? [];
  
  // Get unique months for filter
  const uniqueMonths = Array.from(new Set(
    configuredStatus.flatMap(s => 
      s.payments.map(p => p.monthLabel).filter(Boolean)
    )
  ));

  // Get filtered payments based on selected month
  const getFilteredPayments = (payments: SalaryStatusItem['payments']) => {
    if (!selectedMonth) return payments;
    return payments.filter(p => p.monthLabel === selectedMonth);
  };

  return (
    <div className="bg-white p-4 rounded-xl flex-1 m-4 mt-0 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-800">💳 Salary Payment</h1>
          <p className="text-sm text-gray-500">
            Academic Year: <strong>{currentYear}</strong>
          </p>
        </div>
        <a
          href="/list/salary/payments"
          className="text-sm bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-4 py-2 rounded-lg font-medium"
        >
          📊 All Payments
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── LEFT: Search + Teacher List ── */}
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
              🔍 Find Teacher
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Name, ID or subject…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
              <button
                onClick={handleSearch}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg font-medium"
              >
                Search
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-gray-400">
              {searchResults.length} teacher
              {searchResults.length !== 1 ? "s" : ""}
            </p>
            {searchResults.length === 0 ? (
              <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl text-sm">
                No teachers found.
              </div>
            ) : (
              searchResults.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelect(t)}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                    selected?.id === t.id
                      ? "border-emerald-400 bg-emerald-50"
                      : "border-gray-100 bg-white hover:bg-gray-50"
                  }`}
                >
                  <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-green-400 to-teal-500 flex-shrink-0">
                    {t.img ? (
                      <Image
                        src={t.img}
                        alt={t.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">
                        {t.name[0]}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">
                      {t.name} {t.surname}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {t.subjects.slice(0, 3).join(", ") || "No subjects"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {t.salaryStructures.length} configured
                    </p>
                  </div>
                  {selected?.id === t.id && (
                    <span className="text-emerald-500 font-bold text-lg">
                      ✓
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── RIGHT: Salary Status + Payment Form ── */}
        <div className="space-y-4">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-48 bg-gray-50 rounded-xl text-gray-400">
              <span className="text-4xl mb-2">👆</span>
              <span className="text-sm">Select a teacher to pay salary</span>
            </div>
          ) : (
            <>
              {/* Teacher card */}
              <div className="bg-emerald-50 rounded-xl p-4 flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-green-400 to-teal-500 flex-shrink-0">
                  {selected.img ? (
                    <Image
                      src={selected.img}
                      alt={selected.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-white font-bold">
                      {selected.name[0]}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-bold text-gray-800">
                    {selected.name} {selected.surname}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selected.subjects.join(", ") || "—"}
                  </p>
                  {selected.phone && (
                    <p className="text-xs text-gray-400">📞 {selected.phone}</p>
                  )}
                </div>
              </div>

              {statusLoading ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Loading…
                </div>
              ) : (
                salaryStatus && (
                  <>
                    {/* Summary */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-sky-50 rounded-lg p-2 text-center">
                        <p className="text-xs text-sky-400">Configured</p>
                        <p className="font-bold text-sky-700">
                          ৳{salaryStatus.totalConfigured.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-emerald-50 rounded-lg p-2 text-center">
                        <p className="text-xs text-emerald-400">
                          Paid This Year
                        </p>
                        <p className="font-bold text-emerald-700">
                          ৳{salaryStatus.totalPaid.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Month Filter Bar */}
                    {uniqueMonths.length > 0 && (
                      <div className="bg-gray-50 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-gray-500 uppercase">
                            🔍 Filter by Month
                          </span>
                          {selectedMonth && (
                            <button
                              onClick={() => setSelectedMonth(null)}
                              className="text-xs text-emerald-600 hover:text-emerald-700"
                            >
                              Clear Filter
                            </button>
                          )}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {uniqueMonths.map((month) => (
                            <button
                              key={month}
                              onClick={() => setSelectedMonth(selectedMonth === month ? null : month)}
                              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                selectedMonth === month
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                              }`}
                            >
                              {month}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Configured salary status */}
                    {configuredStatus.length > 0 && (
                      <div className="rounded-xl border border-gray-100 overflow-hidden">
                        <div className="bg-gray-50 px-3 py-2 border-b border-gray-100">
                          <p className="text-xs font-semibold text-gray-500 uppercase">
                            Configured Salaries
                            {selectedMonth && (
                              <span className="ml-2 text-emerald-600">
                                - Showing: {selectedMonth}
                              </span>
                            )}
                          </p>
                        </div>
                        <table className="w-full text-sm">
                          <tbody>
                            {configuredStatus.map((s, idx) => {
                              const filteredPayments = getFilteredPayments(s.payments);
                              const selectedPayment = selectedMonth && filteredPayments.length > 0 
                                ? filteredPayments[0] 
                                : (s.payments.length > 0 ? s.payments[s.payments.length - 1] : null);
                              
                              return (
                                <div key={s.structureId}>
                                  <tr className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"}>
                                    <td className="px-3 py-2 font-medium text-gray-700">
                                      {s.salaryTypeName}
                                    </td>
                                    <td className="px-3 py-2 text-gray-500 text-xs">
                                      ৳{s.amount.toLocaleString()}
                                    </td>
                                    <td className="px-3 py-2">
                                      {s.totalPaid >= s.amount ? (
                                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                                          ✅ Paid
                                        </span>
                                      ) : s.totalPaid > 0 ? (
                                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                                          Partial ৳{s.totalPaid}
                                        </span>
                                      ) : (
                                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                                          ❌ Unpaid
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                  
                                  {/* Show payment months as clickable buttons */}
                                  {s.payments.length > 0 && (
                                    <tr className="bg-gray-50">
                                      <td colSpan={3} className="px-3 py-2">
                                        <div className="space-y-2">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-semibold text-gray-500">
                                              📅 Payments:
                                            </span>
                                            {s.payments.map((payment) => (
                                              <button
                                                key={payment.id}
                                                onClick={() => setSelectedMonth(
                                                  selectedMonth === payment.monthLabel ? null : payment.monthLabel
                                                )}
                                                className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                                                  selectedMonth === payment.monthLabel
                                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-emerald-50 hover:border-emerald-300'
                                                }`}
                                              >
                                                {payment.monthLabel || 'Ad-hoc'}
                                              </button>
                                            ))}
                                          </div>
                                          
                                          {/* Show selected payment details with download button */}
                                          {selectedPayment && (
                                            <div className="flex items-center justify-between bg-white rounded-lg p-2 text-xs border border-gray-100 mt-2">
                                              <div className="flex items-center gap-4">
                                                <span className="text-gray-600 font-medium">
                                                  {selectedMonth ? `${selectedMonth} Payment:` : 'Last Payment:'}
                                                </span>
                                                <span className="font-semibold text-emerald-600">
                                                  ৳{selectedPayment.amountPaid.toLocaleString()}
                                                </span>
                                                <span className="text-gray-500">
                                                  {new Date(selectedPayment.paidAt).toLocaleDateString()}
                                                </span>
                                                <span className="text-gray-400 text-xs">
                                                  {selectedPayment.invoiceNumber}
                                                </span>
                                              </div>
                                              <button
                                                onClick={() => handleDownloadPDF({
                                                  ...selectedPayment,
                                                  teacherName: `${selected?.name} ${selected?.surname}`,
                                                  teacherPhone: selected?.phone || null,
                                                  salaryTypeName: s.salaryTypeName,
                                                  amount: s.amount,
                                                  academicYear: salaryStatus?.academicYear || currentYear
                                                })}
                                                className="text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-2 py-1 rounded-full transition-colors flex items-center gap-1"
                                              >
                                                📄 Download PDF
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                  
                                  {/* Show message if no payments for selected month */}
                                  {selectedMonth && filteredPayments.length === 0 && s.payments.length > 0 && (
                                    <tr className="bg-gray-50">
                                      <td colSpan={3} className="px-3 py-2 text-center">
                                        <span className="text-xs text-gray-400">
                                          No payments found for {selectedMonth}
                                        </span>
                                      </td>
                                    </tr>
                                  )}
                                </div>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Payment form */}
                    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        💳 Record Payment
                      </h3>

                      {/* From configured structures */}
                      {configuredStatus.length > 0 && (
                        <div>
                          <label className="text-xs text-gray-500 font-medium block mb-1">
                            From Configured Salary
                          </label>
                          <select
                            value={selStructureId}
                            onChange={(e) =>
                              e.target.value
                                ? handleSelectStructure(Number(e.target.value))
                                : (setSelStructureId(""),
                                  setSelSalaryTypeId(""),
                                  setPayAmount(""))
                            }
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white"
                          >
                            <option value="">Select configured salary…</option>
                            {configuredStatus.map((s) => (
                              <option key={s.structureId} value={s.structureId}>
                                {s.salaryTypeName} — ৳
                                {s.amount.toLocaleString()}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Or ad-hoc type */}
                      <div>
                        <label className="text-xs text-gray-500 font-medium block mb-1">
                          Or Ad-hoc / Bonus Type
                        </label>
                        <select
                          value={!selStructureId ? selSalaryTypeId : ""}
                          onChange={(e) =>
                            e.target.value
                              ? handleSelectAdHoc(Number(e.target.value))
                              : (setSelSalaryTypeId(""), setPayAmount(""))
                          }
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white"
                        >
                          <option value="">
                            Select type for ad-hoc payment…
                          </option>
                          {salaryTypes.map((st) => (
                            <option key={st.id} value={st.id}>
                              {st.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-500 font-medium block mb-1">
                            Amount (৳)
                          </label>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={payAmount}
                            onChange={(e) => setPayAmount(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 font-medium block mb-1">
                            Method
                          </label>
                          <select
                            value={payMethod}
                            onChange={(e) =>
                              setPayMethod(e.target.value as any)
                            }
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white"
                          >
                            <option value="CASH">Cash</option>
                            <option value="MOBILE_BANKING">
                              Mobile Banking
                            </option>
                            <option value="BANK_TRANSFER">Bank Transfer</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 font-medium block mb-1">
                            Month
                          </label>
                          <select
                            value={payMonth}
                            onChange={(e) => setPayMonth(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white"
                          >
                            <option value="">—</option>
                            {MONTHS.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 font-medium block mb-1">
                            Remarks
                          </label>
                          <input
                            type="text"
                            placeholder="Optional"
                            value={payRemarks}
                            onChange={(e) => setPayRemarks(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                          />
                        </div>
                      </div>

                      {payError && (
                        <p className="text-red-500 text-xs bg-red-50 p-2 rounded-lg">
                          {payError}
                        </p>
                      )}

                      <button
                        onClick={handlePay}
                        disabled={payLoading}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors"
                      >
                        {payLoading
                          ? "Processing…"
                          : "✅ Confirm & Record Payment"}
                      </button>
                    </div>
                  </>
                )
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Invoice Modal ── */}
      {showInvoice && lastInvoice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowInvoice(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 text-center">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-white text-2xl">✓</span>
              </div>
              <p className="text-emerald-200 text-xs uppercase tracking-widest">
                Payment Successful
              </p>
              <p className="text-white text-lg font-bold mt-1">
                {lastInvoice.invoiceNumber}
              </p>
            </div>

            <div className="p-6 space-y-1.5">
              {(
                [
                  ["Teacher", lastInvoice.teacherName],
                  ["Salary Type", lastInvoice.salaryTypeName],
                  ...(lastInvoice.monthLabel
                    ? [["Month", lastInvoice.monthLabel]]
                    : []),
                  ["Amount", `৳${lastInvoice.amountPaid.toLocaleString()}`],
                  [
                    "Method",
                    METHOD_LABEL[lastInvoice.paymentMethod] ??
                      lastInvoice.paymentMethod,
                  ],
                  [
                    "Date",
                    new Date(lastInvoice.paidAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    }),
                  ],
                  ["Paid By", lastInvoice.collectedBy],
                  ["Academic Year", lastInvoice.academicYear],
                ] as [string, string][]
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0"
                >
                  <span className="text-xs text-gray-400">{label}</span>
                  <span className="text-sm font-semibold text-gray-800">
                    {value}
                  </span>
                </div>
              ))}
              <div className="text-center pt-2 pb-1">
                <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-4 py-1 rounded-full">
                  ✅ PAID
                </span>
              </div>
            
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowInvoice(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium"
                >
                  Close
                </button>
                <button
                  onClick={() => lastInvoice && handleDownloadPDF({
                    id: lastInvoice.id,
                    invoiceNumber: lastInvoice.invoiceNumber,
                    amountPaid: lastInvoice.amountPaid,
                    paymentMethod: lastInvoice.paymentMethod,
                    monthLabel: lastInvoice.monthLabel,
                    paidAt: lastInvoice.paidAt,
                    collectedBy: lastInvoice.collectedBy,
                    teacherName: lastInvoice.teacherName,
                    teacherPhone: selected?.phone || null,
                    salaryTypeName: lastInvoice.salaryTypeName,
                    amount: lastInvoice.amountPaid,
                    academicYear: lastInvoice.academicYear
                  })}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center justify-center gap-2"
                >
                  ⬇ Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}