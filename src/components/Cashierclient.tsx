"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";

import { generateInvoicePDF, type InvoiceData } from "@/lib/generateInvoicePDF";
import { getFeeCollectionSessions, getStudentFeeStatus, recordPayment, searchStudents } from "@/Actions/Feeactions/Feeactions";

type ClassItem = { id: number; name: string; gradeLevel: number };
type StudentResult = {
  id: string; name: string; surname: string; img: string | null;
  className: string; gradeLevel: number; fatherName: string | null; rollNumber: number | null;
};
type FeeStatusItem = {
  structureId: number; feeTypeId: number; feeTypeName: string;
  amount: number; totalPaid: number;
  payments: { id: number; invoiceNumber: string; amountPaid: number; paymentMethod: string; monthLabel: string | null; paidAt: string; collectedBy: string; }[];
};
type Invoice = {
  id: number; invoiceNumber: string; studentName: string; className: string;
  feeTypeName: string; amountPaid: number; paymentMethod: string;
  monthLabel: string | null; paidAt: string; collectedBy: string; academicYear: string;
};

const METHOD_LABEL: Record<string, string> = {
  CASH: "Cash", MOBILE_BANKING: "Mobile Banking", BANK_TRANSFER: "Bank Transfer",
};
const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];

export default function CashierClient({ classes, defaultSession }: { classes: ClassItem[]; defaultSession: string }) {
  const [isPending, startTransition] = useTransition();
  const [selectedSession, setSelectedSession] = useState(defaultSession);
  const [availableSessions, setAvailableSessions] = useState<string[]>([defaultSession]);

  const [searchName, setSearchName]       = useState("");
  const [searchId, setSearchId]           = useState("");
  const [searchClassId, setSearchClassId] = useState<number | "">("");
  const [searchRoll, setSearchRoll]       = useState("");
  const [searchResults, setSearchResults] = useState<StudentResult[]>([]);
  const [searchError, setSearchError]     = useState("");
  const [hasSearched, setHasSearched]     = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentResult | null>(null);
  const [feeStatus, setFeeStatus] = useState<{ feeStatus: FeeStatusItem[]; totalDue: number; totalPaid: number; academicYear: string; } | null>(null);
  const [feeLoading, setFeeLoading]           = useState(false);
  const [selectedStructureId, setSelectedStructureId] = useState<number | "">("");
  const [payAmount, setPayAmount]   = useState("");
  const [payMethod, setPayMethod]   = useState<"CASH"|"MOBILE_BANKING"|"BANK_TRANSFER">("CASH");
  const [payMonth, setPayMonth]     = useState("");
  const [payRemarks, setPayRemarks] = useState("");
  const [payError, setPayError]     = useState("");
  const [payLoading, setPayLoading] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<Invoice | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);

  useEffect(() => {
    getFeeCollectionSessions().then((sessions) => {
      if (sessions.length > 0) {
        setAvailableSessions(sessions);
        setSelectedSession((prev) => (sessions.includes(prev) ? prev : sessions[0]));
      }
    });
  }, []);

  const handleSearch = async () => {
    setSearchError(""); setHasSearched(true);

    const res = await searchStudents({
      name: searchName || undefined, studentId: searchId || undefined,
      classId: searchClassId ? Number(searchClassId) : undefined,
      rollNumber: searchRoll ? parseInt(searchRoll) : undefined,
      academicYear: selectedSession || undefined,
    });
    if (res.success) setSearchResults(res.data as StudentResult[]);
    else setSearchError("Search failed.");
  };

  const handleSelectStudent = async (student: StudentResult) => {
    setSelectedStudent(student); setFeeStatus(null); setFeeLoading(true);
    setSelectedStructureId(""); setPayAmount(""); setLastInvoice(null); setShowInvoice(false);
    const res = await getStudentFeeStatus(student.id, selectedSession);
    setFeeLoading(false);
    if (res.success && res.data) setFeeStatus({
      feeStatus: res.data.feeStatus as FeeStatusItem[],
      totalDue: res.data.totalDue, totalPaid: res.data.totalPaid, academicYear: res.data.academicYear,
    });
  };

  const handleSelectStructure = (id: number) => {
    setSelectedStructureId(id);
    const fee = feeStatus?.feeStatus.find((f) => f.structureId === id);
    if (fee) setPayAmount(String(fee.amount));
    setPayError("");
  };

  const handlePay = async () => {
    if (!selectedStudent || !selectedStructureId || !payAmount) { setPayError("Please select a fee type and enter an amount."); return; }
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) { setPayError("Enter a valid amount."); return; }
    setPayError(""); setPayLoading(true);
    const res = await recordPayment({
      studentId: selectedStudent.id, classFeeStructureId: Number(selectedStructureId),
      amountPaid: amount, paymentMethod: payMethod, academicYear: selectedSession,
      monthLabel: payMonth || undefined, remarks: payRemarks || undefined,
    });
    setPayLoading(false);
    if (res.success && res.data) {
      setLastInvoice(res.data as Invoice); setShowInvoice(true);
      setSelectedStructureId(""); setPayAmount(""); setPayMonth(""); setPayRemarks("");
      handleSelectStudent(selectedStudent);
    } else {
      setPayError(res.error ?? "Payment failed.");
    }
  };

  const handleDownloadPDF = () => {
    if (!lastInvoice) return;
    generateInvoicePDF({
      invoiceNumber: lastInvoice.invoiceNumber,
      studentName:   lastInvoice.studentName,
      studentId:     selectedStudent?.id ?? "",
      className:     lastInvoice.className,
      rollNumber:    selectedStudent?.rollNumber,
      fatherName:    selectedStudent?.fatherName,
      feeTypeName:   lastInvoice.feeTypeName,
      amountPaid:    lastInvoice.amountPaid,
      paymentMethod: lastInvoice.paymentMethod,
      monthLabel:    lastInvoice.monthLabel,
      academicYear:  lastInvoice.academicYear,
      paidAt:        lastInvoice.paidAt,
      collectedBy:   lastInvoice.collectedBy,
      schoolName:    "Your School Name",
      schoolAddress: "School Address, City",
      schoolPhone:   "01XXXXXXXXX",
    } as InvoiceData);
  };

  return (
    <div className="bg-white p-4 rounded-xl flex-1 m-4 mt-0 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-800">🏦 Fee Collection</h1>
          <p className="text-sm text-gray-500">Academic Year: <strong>{selectedSession}</strong></p>
        </div>
        <a href="/list/fees/payments"
          className="text-sm bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-4 py-2 rounded-lg font-medium">
          📊 All Payments
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Search */}
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">🔍 Find Student</h2>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
            >
              {availableSessions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              {[
                { ph: "Student Name", val: searchName, set: setSearchName, type: "text" },
                { ph: "Student ID",   val: searchId,   set: setSearchId,   type: "text" },
              ].map(({ ph, val, set, type }) => (
                <input key={ph} type={type} placeholder={ph} value={val}
                  onChange={(e) => set(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              ))}
              <select value={searchClassId} onChange={(e) => setSearchClassId(e.target.value ? Number(e.target.value) : "")}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                <option value="">Any Class</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input type="number" placeholder="Roll Number" value={searchRoll}
                onChange={(e) => setSearchRoll(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <button onClick={handleSearch} disabled={isPending}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm py-2 rounded-lg font-medium disabled:opacity-50">
              Search
            </button>
            {searchError && <p className="text-red-500 text-xs">{searchError}</p>}
          </div>

          {hasSearched && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">{searchResults.length} student{searchResults.length !== 1 ? "s" : ""} found</p>
              {searchResults.length === 0
                ? <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl">No students found.</div>
                : searchResults.map((s) => (
                  <button key={s.id} onClick={() => handleSelectStudent(s)}
                    className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                      selectedStudent?.id === s.id ? "border-indigo-400 bg-indigo-50" : "border-gray-100 bg-white hover:bg-gray-50"
                    }`}>
                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-indigo-400 to-purple-500 flex-shrink-0">
                      {s.img ? <Image src={s.img} alt={s.name} fill className="object-cover" />
                        : <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">{s.name.charAt(0)}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{s.name} {s.surname}</p>
                      <p className="text-xs text-gray-500">{s.className} · ID: {s.id}{s.rollNumber ? ` · Roll: ${s.rollNumber}` : ""}</p>
                      {s.fatherName && <p className="text-xs text-gray-400">Father: {s.fatherName}</p>}
                    </div>
                    {selectedStudent?.id === s.id && <span className="text-indigo-500 font-bold">✓</span>}
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* Fee + Payment */}
        <div className="space-y-4">
          {!selectedStudent ? (
            <div className="flex flex-col items-center justify-center h-48 bg-gray-50 rounded-xl text-gray-400">
              <span className="text-4xl mb-2">👆</span>
              <span className="text-sm">Search and select a student</span>
            </div>
          ) : (
            <>
              <div className="bg-indigo-50 rounded-xl p-4 flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-indigo-400 to-purple-500 flex-shrink-0">
                  {selectedStudent.img ? <Image src={selectedStudent.img} alt={selectedStudent.name} fill className="object-cover" />
                    : <span className="absolute inset-0 flex items-center justify-center text-white font-bold">{selectedStudent.name.charAt(0)}</span>}
                </div>
                <div>
                  <p className="font-bold text-gray-800">{selectedStudent.name} {selectedStudent.surname}</p>
                  <p className="text-xs text-gray-600">{selectedStudent.className} · ID: {selectedStudent.id}{selectedStudent.rollNumber ? ` · Roll: ${selectedStudent.rollNumber}` : ""}</p>
                  {selectedStudent.fatherName && <p className="text-xs text-gray-500">Father: {selectedStudent.fatherName}</p>}
                </div>
              </div>

              {feeLoading ? <div className="text-center py-8 text-gray-400">Loading…</div> : feeStatus ? (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Total Due", val: feeStatus.totalDue,  color: "sky" },
                      { label: "Paid",      val: feeStatus.totalPaid, color: "emerald" },
                      { label: "Balance",   val: Math.max(0, feeStatus.totalDue - feeStatus.totalPaid), color: "red" },
                    ].map(({ label, val, color }) => (
                      <div key={label} className={`bg-${color}-50 rounded-lg p-2 text-center`}>
                        <p className={`text-xs text-${color}-400`}>{label}</p>
                        <p className={`font-bold text-${color}-700`}>৳{val.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl border border-gray-100 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead><tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Fee Type</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Status</th>
                      </tr></thead>
                      <tbody>
                        {feeStatus.feeStatus.map((f, idx) => (
                          <tr key={f.structureId} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"}>
                            <td className="px-3 py-2 font-medium text-gray-700">{f.feeTypeName}</td>
                            <td className="px-3 py-2 text-gray-600">৳{f.amount.toLocaleString()}</td>
                            <td className="px-3 py-2">
                              {f.totalPaid >= f.amount
                                ? <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">✅ Paid</span>
                                : f.totalPaid > 0
                                ? <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Partial ৳{f.totalPaid}</span>
                                : <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">❌ Unpaid</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">💳 Record Payment</h3>
                    <select value={selectedStructureId} onChange={(e) => handleSelectStructure(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                      <option value="">Select fee type…</option>
                      {feeStatus.feeStatus.map((f) => (
                        <option key={f.structureId} value={f.structureId}>{f.feeTypeName} — ৳{f.amount}</option>
                      ))}
                    </select>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-500 mb-0.5 block">Amount (৳)</label>
                        <input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-0.5 block">Method</label>
                        <select value={payMethod} onChange={(e) => setPayMethod(e.target.value as any)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                          <option value="CASH">Cash</option>
                          <option value="MOBILE_BANKING">Mobile Banking</option>
                          <option value="BANK_TRANSFER">Bank Transfer</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-0.5 block">Month</label>
                        <select value={payMonth} onChange={(e) => setPayMonth(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                          <option value="">—</option>
                          {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-0.5 block">Remarks</label>
                        <input type="text" placeholder="Optional" value={payRemarks}
                          onChange={(e) => setPayRemarks(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                      </div>
                    </div>
                    {payError && <p className="text-red-500 text-xs bg-red-50 p-2 rounded-lg">{payError}</p>}
                    <button onClick={handlePay} disabled={payLoading}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors">
                      {payLoading ? "Processing…" : "✅ Confirm & Record Payment"}
                    </button>
                  </div>
                </>
              ) : null}
            </>
          )}
        </div>
      </div>

      {/* Invoice Modal */}
      {showInvoice && lastInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowInvoice(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 text-center">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-white text-2xl">✓</span>
              </div>
              <p className="text-indigo-200 text-xs uppercase tracking-widest">Payment Successful</p>
              <p className="text-white text-lg font-bold mt-1">{lastInvoice.invoiceNumber}</p>
            </div>

            <div className="p-6 space-y-1.5">
              {([
                ["Student",       lastInvoice.studentName],
                ["Class",         lastInvoice.className],
                ["Fee Type",      lastInvoice.feeTypeName],
                ...(lastInvoice.monthLabel ? [["Month", lastInvoice.monthLabel]] : []),
                ["Amount",        `৳${lastInvoice.amountPaid.toLocaleString()}`],
                ["Method",        METHOD_LABEL[lastInvoice.paymentMethod] ?? lastInvoice.paymentMethod],
                ["Date",          new Date(lastInvoice.paidAt).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })],
                ["Collected By",  lastInvoice.collectedBy],
                ["Academic Year", lastInvoice.academicYear],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-400">{label}</span>
                  <span className="text-sm font-semibold text-gray-800">{value}</span>
                </div>
              ))}

              <div className="text-center pt-2 pb-1">
                <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-4 py-1 rounded-full">✅ PAID</span>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowInvoice(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium">
                  Close
                </button>
                <button onClick={handleDownloadPDF}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center justify-center gap-2">
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