// src/app/(dashboard)/list/fees/invoice/[invoiceNumber]/pdf/route.ts
// Returns a PDF receipt for the given invoice number

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserRoleAuth } from "@/lib/logsessition";

export async function GET(
  req: NextRequest,
  { params }: { params: { invoiceNumber: string } }
) {
  try {
    const { role } = await getUserRoleAuth();
    if (!["admin", "cashier", "teacher"].includes(role)) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    const invoiceNumber = decodeURIComponent(params.invoiceNumber);

    const payment = await prisma.feePayment.findUnique({
      where: { invoiceNumber },
      include: {
        student: {
          include: {
            class: { include: { grade: true } },
            parent: true,
          },
        },
        classFeeStructure: { include: { feeType: true } },
      },
    });

    if (!payment) {
      return new NextResponse("Invoice not found", { status: 404 });
    }

    const history = await prisma.studentClassHistory.findFirst({
      where: {
        studentId: payment.studentId,
        academicYear: payment.academicYear,
      },
      select: { rollNumber: true },
    });

    const rollNumber = history?.rollNumber ?? "N/A";
    const fatherName = payment.student.parent
      ? `${payment.student.parent.name} ${payment.student.parent.surname ?? ""}`.trim()
      : "N/A";
    const paidDate = payment.paidAt.toLocaleDateString("en-BD", {
      day: "numeric", month: "long", year: "numeric",
    });
    const methodLabel = payment.paymentMethod.replace("_", " ");

    // Generate HTML that looks like a receipt, browser prints to PDF
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt — ${invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: #f5f5f5;
      display: flex;
      justify-content: center;
      padding: 20px;
    }
    .receipt {
      background: white;
      width: 400px;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      color: white;
      text-align: center;
      padding: 24px 20px;
    }
    .header .school-name {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .header .school-address {
      font-size: 11px;
      opacity: 0.8;
      margin-top: 4px;
    }
    .header .receipt-label {
      font-size: 10px;
      letter-spacing: 3px;
      text-transform: uppercase;
      opacity: 0.7;
      margin-top: 16px;
    }
    .header .invoice-number {
      font-size: 22px;
      font-weight: 800;
      margin-top: 4px;
      letter-spacing: 1px;
    }
    .body { padding: 20px; }
    .section-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #6b7280;
      margin-bottom: 10px;
      padding-bottom: 6px;
      border-bottom: 1px solid #e5e7eb;
    }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 7px 0;
      border-bottom: 1px solid #f9fafb;
    }
    .row:last-child { border-bottom: none; }
    .row .label {
      font-size: 11px;
      color: #9ca3af;
      font-weight: 500;
    }
    .row .value {
      font-size: 12px;
      color: #111827;
      font-weight: 600;
      text-align: right;
      max-width: 60%;
    }
    .amount-box {
      background: linear-gradient(135deg, #ecfdf5, #d1fae5);
      border: 1px solid #a7f3d0;
      border-radius: 10px;
      padding: 14px;
      text-align: center;
      margin: 16px 0;
    }
    .amount-box .amount-label {
      font-size: 10px;
      color: #059669;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .amount-box .amount-value {
      font-size: 28px;
      font-weight: 800;
      color: #065f46;
      margin-top: 4px;
    }
    .footer {
      background: #f9fafb;
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-top: 1px dashed #e5e7eb;
    }
    .sig-box {
      text-align: center;
    }
    .sig-line {
      width: 100px;
      height: 1px;
      background: #374151;
      margin-bottom: 4px;
    }
    .sig-label {
      font-size: 10px;
      color: #6b7280;
    }
    .status-badge {
      background: #d1fae5;
      color: #065f46;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 20px;
      display: inline-block;
    }
    @media print {
      body { background: white; padding: 0; }
      .receipt { box-shadow: none; border-radius: 0; width: 100%; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <!-- School Header -->
    <div class="header">
      <div class="school-name">Your School Name</div>
      <div class="school-address">School Address, City — Phone: 01XXXXXXXXX</div>
      <div class="receipt-label">Payment Receipt</div>
      <div class="invoice-number">${invoiceNumber}</div>
    </div>

    <div class="body">
      <!-- Amount highlight -->
      <div class="amount-box">
        <div class="amount-label">Amount Paid</div>
        <div class="amount-value">৳${payment.amountPaid.toLocaleString()}</div>
      </div>

      <!-- Student Info -->
      <div class="section-title">Student Information</div>
      <div class="row">
        <span class="label">Student Name</span>
        <span class="value">${payment.student.name} ${payment.student.surname}</span>
      </div>
      <div class="row">
        <span class="label">Father Name</span>
        <span class="value">${fatherName}</span>
      </div>
      <div class="row">
        <span class="label">Class</span>
        <span class="value">${payment.student.class?.name ?? "N/A"}</span>
      </div>
      <div class="row">
        <span class="label">Roll Number</span>
        <span class="value">${rollNumber}</span>
      </div>
      <div class="row">
        <span class="label">Student ID</span>
        <span class="value">${payment.student.id}</span>
      </div>

      <!-- Payment Info -->
      <div class="section-title" style="margin-top:16px">Payment Information</div>
      <div class="row">
        <span class="label">Fee Type</span>
        <span class="value">${payment.classFeeStructure.feeType.name}</span>
      </div>
      ${payment.monthLabel ? `<div class="row"><span class="label">Month</span><span class="value">${payment.monthLabel}</span></div>` : ""}
      <div class="row">
        <span class="label">Academic Year</span>
        <span class="value">${payment.academicYear}</span>
      </div>
      <div class="row">
        <span class="label">Payment Method</span>
        <span class="value">${methodLabel}</span>
      </div>
      <div class="row">
        <span class="label">Payment Date</span>
        <span class="value">${paidDate}</span>
      </div>
      <div class="row">
        <span class="label">Collected By</span>
        <span class="value">${payment.collectedBy}</span>
      </div>
      ${payment.remarks ? `<div class="row"><span class="label">Remarks</span><span class="value">${payment.remarks}</span></div>` : ""}

      <div style="text-align:center; margin-top:12px">
        <span class="status-badge">✅ PAID</span>
      </div>
    </div>

    <!-- Footer with signature -->
    <div class="footer">
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-label">Cashier Signature</div>
      </div>
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-label">School Seal</div>
      </div>
    </div>
  </div>

  <script>
    window.onload = () => window.print();
  </script>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (err) {
    console.error("PDF route error:", err);
    return new NextResponse("Internal server error", { status: 500 });
  }
}