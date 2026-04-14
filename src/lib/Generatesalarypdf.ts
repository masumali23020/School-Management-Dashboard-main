// src/lib/generateSalaryPDF.ts
// Teacher salary receipt — School Wise with proper school information

import jsPDF from "jspdf";

export type SalaryInvoiceData = {
  invoiceNumber:  string;
  employeeId:     string;
  employeeName:   string;
  employeePhone?: string | null;
  employeeEmail?: string | null;
  employeeImg?:   string | null;
  salaryTypeName: string;
  isRecurring:    boolean;
  amountPaid:     number;
  paymentMethod:  string;
  monthLabel?:    string | null;
  academicYear:   string;
  paidAt:         string;
  processedBy:    string;
  processedById:  string;
  remarks?:       string | null;
  schoolName:     string;
  schoolAddress:  string;
  schoolPhone:    string;
  schoolEmail?:   string;
  schoolLogo?:    string;
};

const METHOD_LABEL: Record<string, string> = {
  CASH: "Cash", 
  MOBILE_BANKING: "Mobile Banking", 
  BANK_TRANSFER: "Bank Transfer",
};

function amountInWords(n: number): string {
  const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine",
    "Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  if (n === 0) return "Zero";
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? " " + ones[n%10] : "");
  if (n < 1000) return ones[Math.floor(n/100)] + " Hundred" + (n%100 ? " " + amountInWords(n%100) : "");
  if (n < 100000) return amountInWords(Math.floor(n/1000)) + " Thousand" + (n%1000 ? " " + amountInWords(n%1000) : "");
  if (n < 10000000) return amountInWords(Math.floor(n/100000)) + " Lakh" + (n%100000 ? " " + amountInWords(n%100000) : "");
  return amountInWords(Math.floor(n/10000000)) + " Crore" + (n%10000000 ? " " + amountInWords(n%10000000) : "");
}

export function generateSalaryPDF(inv: SalaryInvoiceData): void {
  const safeInv = {
    ...inv,
    employeeName: inv.employeeName?.trim() || "Unknown Teacher",
    employeeId: inv.employeeId?.trim() || "N/A",
    processedBy: inv.processedBy?.trim() || "System",
    salaryTypeName: inv.salaryTypeName?.trim() || "Salary",
    amountPaid: inv.amountPaid || 0,
    paymentMethod: inv.paymentMethod || "CASH",
    academicYear: inv.academicYear || "N/A",
    monthLabel: inv.monthLabel || "N/A",
    employeePhone: inv.employeePhone || "N/A",
    employeeEmail: inv.employeeEmail || "N/A",
    schoolName: inv.schoolName?.trim() || "Your School Name",
    schoolAddress: inv.schoolAddress?.trim() || "School Address, City",
    schoolPhone: inv.schoolPhone?.trim() || "01XXXXXXXXX",
    schoolEmail: inv.schoolEmail?.trim() || "info@school.com",
  };
  
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const PW = 210;
  const PH = 297;

  const paidDate = new Date(safeInv.paidAt).toLocaleDateString("en-GB", { 
    day: "2-digit", 
    month: "2-digit", 
    year: "numeric" 
  });
  
  const paidDateLong = new Date(safeInv.paidAt).toLocaleDateString("en-GB", { 
    day: "2-digit", 
    month: "long", 
    year: "numeric" 
  });
  
  const words = amountInWords(Math.round(safeInv.amountPaid)) + " Taka Only";
  const methodStr = METHOD_LABEL[safeInv.paymentMethod] ?? safeInv.paymentMethod;

  const drawCopy = (yStart: number, copyLabel: string, copyType: "teacher" | "school") => {
    const ML = 12;
    const MR = 12;
    const x = ML;
    const boxTop = yStart;
    const boxHeight = 136;
    const CW = PW - ML - MR;
    let y = boxTop + 7;

    doc.setDrawColor(70, 70, 70);
    doc.setLineWidth(0.3);
    doc.rect(x, boxTop, CW, boxHeight);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(20, 20, 20);
    doc.text(safeInv.schoolName, PW / 2, y, { align: "center" });
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    doc.text(`${safeInv.schoolAddress} | Phone: ${safeInv.schoolPhone} | Email: ${safeInv.schoolEmail}`, PW / 2, y, { align: "center" });
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(0, 0, 0);
    doc.text(copyType === "teacher" ? "TEACHER'S COPY - SALARY RECEIPT" : "SCHOOL'S COPY - SALARY RECEIPT", PW / 2, y, { align: "center" });
    y += 5;

    doc.setFillColor(240, 240, 240);
    doc.rect(x + 1, y, CW - 2, 6, "F");
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.text(copyLabel, PW / 2, y + 4.2, { align: "center" });
    y += 8;

    const rowH = 7;
    const colLabel = 32;
    const colVal = 61;
    const colLabel2 = 32;
    const colVal2 = CW - colLabel - colVal - colLabel2;

    const drawTwo = (l1: string, v1: string, l2: string, v2: string) => {
      doc.setDrawColor(180, 180, 180);
      doc.rect(x + 1, y, CW - 2, rowH);
      let cx = x + 1;
      doc.line(cx + colLabel, y, cx + colLabel, y + rowH);
      doc.line(cx + colLabel + colVal, y, cx + colLabel + colVal, y + rowH);
      doc.line(cx + colLabel + colVal + colLabel2, y, cx + colLabel + colVal + colLabel2, y + rowH);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(70, 70, 70);
      doc.text(l1, cx + 1.5, y + 4.6);
      doc.text(l2, cx + colLabel + colVal + 1.5, y + 4.6);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(20, 20, 20);
      doc.text(doc.splitTextToSize(v1, colVal - 2)[0], cx + colLabel + 1.5, y + 4.6);
      doc.text(doc.splitTextToSize(v2, colVal2 - 2)[0], cx + colLabel + colVal + colLabel2 + 1.5, y + 4.6);
      y += rowH;
    };

    const drawOne = (l1: string, v1: string) => {
      doc.setDrawColor(180, 180, 180);
      doc.rect(x + 1, y, CW - 2, rowH);
      doc.line(x + 1 + colLabel, y, x + 1 + colLabel, y + rowH);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(70, 70, 70);
      doc.text(l1, x + 2.5, y + 4.6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(20, 20, 20);
      doc.text(doc.splitTextToSize(v1, CW - colLabel - 5)[0], x + colLabel + 2.5, y + 4.6);
      y += rowH;
    };

    drawTwo("Invoice No", safeInv.invoiceNumber, "Date", paidDate);
    drawTwo("Teacher Name", safeInv.employeeName, "Teacher ID", safeInv.employeeId);
    drawTwo("Salary Type", safeInv.salaryTypeName, "Session", safeInv.academicYear);
    drawTwo("Month", safeInv.monthLabel ?? "N/A", "Method", methodStr);
    drawTwo("Amount", `Tk ${safeInv.amountPaid.toLocaleString()}`, "Status", "PAID");
    drawOne("Paid By", safeInv.processedBy);
    drawOne("In Words", words);

    if (safeInv.remarks && safeInv.remarks.trim()) {
      drawOne("Remarks", safeInv.remarks);
    }

    y += 7;
    doc.setDrawColor(90, 90, 90);
    doc.setLineWidth(0.2);
    doc.line(x + 5, y + 8, x + 60, y + 8);
    doc.line(x + CW - 60, y + 8, x + CW - 5, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(70, 70, 70);
    doc.text(`Date: ${paidDateLong}`, x + 5, y + 12);
    doc.text("Authorized Signature", x + CW - 60, y + 12);

    doc.setFontSize(6.5);
    doc.setTextColor(130, 130, 130);
    doc.text(`Generated: ${new Date().toLocaleString()} | Invoice: ${safeInv.invoiceNumber}`, PW / 2, boxTop + boxHeight - 2.5, { align: "center" });
  };

  // ── Teacher's Copy (top half) ───────────────────────────────────────────
  drawCopy(8, "Teacher Copy - Keep for your records", "teacher");

  // ── Cut line ────────────────────────────────────────────────────────────
  const midY = PH / 2;
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(10, midY, PW - 10, midY);
  doc.setLineDashPattern([], 0);
  doc.setFontSize(6.5);
  doc.setTextColor(130, 130, 130);
  doc.text("-------------------------------------------------- CUT HERE --------------------------------------------------", PW / 2, midY - 1.5, { align: "center" });

  // ── School's Copy (bottom half) ─────────────────────────────────────────
  drawCopy(midY + 4, "School Copy - Official record", "school");

  // Save PDF with school prefix
  const fileName = `${safeInv.schoolName.replace(/\s/g, '_')}_${safeInv.invoiceNumber}.pdf`;
  doc.save(fileName);
}