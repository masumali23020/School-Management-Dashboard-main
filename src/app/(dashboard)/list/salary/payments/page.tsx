// src/components/Salarypaymentlistclient.tsx
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { getAllSalaryPayments } from "@/Actions/Salaryactions/Salaryactions";
import { generateSalaryPDF } from "@/lib/Generatesalarypdf";

type SalaryType = {
  id: number;
  name: string;
  isRecurring: boolean;
};

type Payment = {
  id: number;
  invoiceNumber: string;
  employeeId: string;
  employeeName: string;
  employeeImg: string | null;
  salaryTypeName: string;
  amountPaid: number;
  paymentMethod: string;
  academicYear: string;
  monthLabel: string | null;
  paidAt: string;
  processedBy: string;
  remarks: string | null;
};

type RecentPayment = {
  id: number;
  invoiceNumber: string;
  employeeName: string;
  employeeImg: string | null;
  salaryTypeName: string;
  amountPaid: number;
  paymentMethod: string;
  academicYear: string;
  monthLabel: string | null;
  paidAt: string;
  processedBy: string;
};

type Props = {
  salaryTypes: SalaryType[];
  academicYears: string[];
  schoolId: number;
  userRole: string;
  recentPayments: RecentPayment[];
  totalAmount: number;
  totalCount: number;
};

const METHOD_LABEL: Record<string, string> = {
  CASH: "💰 Cash",
  MOBILE_BANKING: "📱 Mobile Banking",
  BANK_TRANSFER: "🏦 Bank Transfer",
};

const METHOD_COLORS: Record<string, string> = {
  CASH: "bg-green-100 text-green-700",
  MOBILE_BANKING: "bg-blue-100 text-blue-700",
  BANK_TRANSFER: "bg-purple-100 text-purple-700",
};

export default function SalaryPaymentListClient({
  salaryTypes,
  academicYears,
  schoolId,
  userRole,
  recentPayments: initialRecentPayments,
  totalAmount: initialTotalAmount,
  totalCount: initialTotalCount,
}: Props) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({
    teacherName: "",
    salaryTypeId: "",
    academicYear: academicYears[0] || "",
    fromDate: "",
    toDate: "",
    paymentMethod: "",
  });
  const [summary, setSummary] = useState({
    totalAmount: initialTotalAmount,
    count: initialTotalCount,
  });

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const result = await getAllSalaryPayments({
        teacherName: filters.teacherName || undefined,
        salaryTypeId: filters.salaryTypeId ? parseInt(filters.salaryTypeId) : undefined,
        academicYear: filters.academicYear || undefined,
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
        paymentMethod: filters.paymentMethod || undefined,
      });

      if (result.success && result.data) {
        setPayments(result.data as Payment[]);
        setSummary({
          totalAmount: result.totalAmount || 0,
          count: result.count || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [filters.academicYear]);

  const handleFilter = () => {
    fetchPayments();
  };

  const handleReset = () => {
    setFilters({
      teacherName: "",
      salaryTypeId: "",
      academicYear: academicYears[0] || "",
      fromDate: "",
      toDate: "",
      paymentMethod: "",
    });
    setTimeout(() => fetchPayments(), 100);
  };

  const handleViewPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowModal(true);
  };

  const handleDownloadPDF = async (payment: Payment) => {
    try {
      const pdfBlob = await generateSalaryPDF({
        invoiceNumber: payment.invoiceNumber,
        employeeId: payment.employeeId,
        employeeName: payment.employeeName,
        employeePhone: null,
        employeeEmail: null,
        employeeImg: payment.employeeImg,
        salaryTypeName: payment.salaryTypeName,
        isRecurring: false,
        amountPaid: payment.amountPaid,
        paymentMethod: payment.paymentMethod,
        monthLabel: payment.monthLabel,
        academicYear: payment.academicYear,
        paidAt: payment.paidAt,
        processedBy: payment.processedBy,
        processedById: "admin-id",
        remarks: payment.remarks,
        schoolName: "Your School Name",
        schoolAddress: "School Address, City",
        schoolPhone: "01XXXXXXXXX",
      });

      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `salary_${payment.invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  const getPaymentMethodBadge = (method: string) => {
    return (
      <span className={`text-xs px-2 py-1 rounded-full ${METHOD_COLORS[method] || "bg-gray-100 text-gray-600"}`}>
        {METHOD_LABEL[method] || method}
      </span>
    );
  };

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">📋 Salary Payment History</h1>
              <p className="text-sm text-gray-500 mt-1">
                View and manage all salary payments
              </p>
            </div>
            {userRole === "ADMIN" && (
              <a
                href="/list/salary"
                className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors"
              >
                ⚙️ Manage Salary Structures
              </a>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-5 text-white">
            <p className="text-emerald-100 text-sm">Total Paid Amount</p>
            <p className="text-3xl font-bold mt-1">৳{summary.totalAmount.toLocaleString()}</p>
          </div>
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-5 text-white">
            <p className="text-blue-100 text-sm">Total Transactions</p>
            <p className="text-3xl font-bold mt-1">{summary.count}</p>
          </div>
          <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl p-5 text-white">
            <p className="text-purple-100 text-sm">Academic Year</p>
            <p className="text-xl font-bold mt-1">{filters.academicYear || "—"}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-4">
            🔍 Filter Payments
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <input
              type="text"
              placeholder="Teacher name..."
              value={filters.teacherName}
              onChange={(e) => setFilters({ ...filters, teacherName: e.target.value })}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <select
              value={filters.salaryTypeId}
              onChange={(e) => setFilters({ ...filters, salaryTypeId: e.target.value })}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="">All Salary Types</option>
              {salaryTypes.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
            <select
              value={filters.academicYear}
              onChange={(e) => setFilters({ ...filters, academicYear: e.target.value })}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              {academicYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <input
              type="date"
              placeholder="From Date"
              value={filters.fromDate}
              onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <input
              type="date"
              placeholder="To Date"
              value={filters.toDate}
              onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <select
              value={filters.paymentMethod}
              onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="">All Methods</option>
              <option value="CASH">Cash</option>
              <option value="MOBILE_BANKING">Mobile Banking</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
            </select>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleFilter}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors"
            >
              🔍 Apply Filters
            </button>
            <button
              onClick={handleReset}
              className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-medium transition-colors"
            >
              🔄 Reset
            </button>
          </div>
        </div>

        {/* Recent Payments Preview */}
        {initialRecentPayments.length > 0 && payments.length === 0 && !loading && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-gray-50 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
                📊 Recent Payments
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Invoice</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Teacher</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Salary Type</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500">Amount</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Method</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Date</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {initialRecentPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <span className="text-sm font-mono text-gray-600">{payment.invoiceNumber}</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-emerald-400 to-teal-500">
                            {payment.employeeImg ? (
                              <Image src={payment.employeeImg} alt="" fill className="object-cover" />
                            ) : (
                              <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
                                {payment.employeeName[0]}
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-gray-700">{payment.employeeName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600">{payment.salaryTypeName}</td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-sm font-semibold text-emerald-600">
                          ৳{payment.amountPaid.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-5 py-3">{getPaymentMethodBadge(payment.paymentMethod)}</td>
                      <td className="px-5 py-3 text-sm text-gray-500">
                        {new Date(payment.paidAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <button
                          onClick={() => handleViewPayment(payment as Payment)}
                          className="text-blue-500 hover:text-blue-700 text-sm mr-2"
                        >
                          👁 View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payments Table */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
              💰 All Payments {loading && <span className="ml-2 text-gray-400">(Loading...)</span>}
            </h3>
          </div>
          
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
              <p className="text-gray-400 text-sm mt-3">Loading payments...</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-400 text-sm">No payments found for the selected filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Invoice</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Teacher</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Salary Type</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Method</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Month</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Processed By</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <span className="text-sm font-mono text-gray-600">{payment.invoiceNumber}</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-emerald-400 to-teal-500">
                            {payment.employeeImg ? (
                              <Image src={payment.employeeImg} alt="" fill className="object-cover" />
                            ) : (
                              <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
                                {payment.employeeName[0]}
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-gray-700">{payment.employeeName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm text-gray-600">{payment.salaryTypeName}</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-sm font-semibold text-emerald-600">
                          ৳{payment.amountPaid.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-5 py-3">{getPaymentMethodBadge(payment.paymentMethod)}</td>
                      <td className="px-5 py-3">
                        <span className="text-sm text-gray-500">{payment.monthLabel || "—"}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm text-gray-500">
                          {new Date(payment.paidAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm text-gray-500">{payment.processedBy}</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewPayment(payment)}
                            className="text-blue-500 hover:text-blue-700 text-sm"
                            title="View Details"
                          >
                            👁
                          </button>
                          <button
                            onClick={() => handleDownloadPDF(payment)}
                            className="text-emerald-500 hover:text-emerald-700 text-sm"
                            title="Download PDF"
                          >
                            📄
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td colSpan={3} className="px-5 py-3 text-right font-semibold text-gray-700">
                      Total:
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-emerald-600">
                      ৳{summary.totalAmount.toLocaleString()}
                    </td>
                    <td colSpan={5}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Payment Details Modal */}
      {showModal && selectedPayment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-5">
              <h3 className="text-white text-xl font-bold">Payment Details</h3>
              <p className="text-emerald-100 text-sm mt-1">{selectedPayment.invoiceNumber}</p>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Teacher</span>
                <span className="font-semibold">{selectedPayment.employeeName}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Salary Type</span>
                <span>{selectedPayment.salaryTypeName}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Amount</span>
                <span className="font-bold text-emerald-600 text-lg">৳{selectedPayment.amountPaid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Payment Method</span>
                <span>{METHOD_LABEL[selectedPayment.paymentMethod]}</span>
              </div>
              {selectedPayment.monthLabel && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Month</span>
                  <span>{selectedPayment.monthLabel}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Academic Year</span>
                <span>{selectedPayment.academicYear}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Payment Date</span>
                <span>{new Date(selectedPayment.paidAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500">Processed By</span>
                <span>{selectedPayment.processedBy}</span>
              </div>
              {selectedPayment.remarks && (
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">Remarks</span>
                  <span className="text-sm">{selectedPayment.remarks}</span>
                </div>
              )}
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleDownloadPDF(selectedPayment);
                  setShowModal(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
              >
                📄 Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}