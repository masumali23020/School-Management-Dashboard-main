// src/lib/generateSalaryPDF.ts
// Teacher salary receipt — same National University 2-copy style as student invoice

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
  processedBy:    string;  // This should contain the user's name
  processedById:  string;  // This is the user ID (not shown in PDF)
  remarks?:       string | null;
  schoolName:     string;
  schoolAddress:  string;
  schoolPhone:    string;
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
    processedBy: inv.processedBy?.trim() || "System",  // Show user name, not ID
    salaryTypeName: inv.salaryTypeName?.trim() || "Salary",
    amountPaid: inv.amountPaid || 0,
    paymentMethod: inv.paymentMethod || "CASH",
    academicYear: inv.academicYear || "N/A",
    monthLabel: inv.monthLabel || "N/A",
    employeePhone: inv.employeePhone || "N/A",
    employeeEmail: inv.employeeEmail || "N/A",
  };
  
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const PW = 210;
  const PH = 297;

  const schoolName    = safeInv.schoolName    ?? "Your School Name";
  const schoolAddress = safeInv.schoolAddress ?? "School Address, City";
  const schoolPhone   = safeInv.schoolPhone   ?? "01XXXXXXXXX";

  const paidDate     = new Date(safeInv.paidAt).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
  const paidDateLong = new Date(safeInv.paidAt).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const words        = amountInWords(Math.round(safeInv.amountPaid)) + " Taka Only";
  const methodStr    = METHOD_LABEL[safeInv.paymentMethod] ?? safeInv.paymentMethod;

  const drawCopy = (yStart: number, copyLabel: string) => {
    const ML = 15; const MR = 15;
    const CW = PW - ML - MR;
    const x  = ML;
    let y    = yStart + 6;

    // ── Header ──────────────────────────────────────────────────────────
    doc.setDrawColor(100, 160, 100);
    doc.setLineWidth(0.5);
    doc.circle(x + 10, y + 6, 10);
    doc.setFontSize(6);
    doc.setTextColor(60, 120, 60);
    doc.setFont("helvetica", "bold");
    doc.text("LOGO", x + 10, y + 7, { align: "center" });

    doc.circle(x + CW - 10, y + 6, 10);
    doc.text("LOGO", x + CW - 10, y + 7, { align: "center" });

    doc.setFontSize(15);
    doc.setTextColor(20, 20, 20);
    doc.text(schoolName, PW / 2, y + 3, { align: "center" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text(schoolAddress, PW / 2, y + 9, { align: "center" });
    doc.text(`Phone: ${schoolPhone}`, PW / 2, y + 14, { align: "center" });

    y += 20;

    // Underlined subtitle
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 20);
    const title = "Teacher Salary / Payment Receipt";
    const titleW = doc.getTextWidth(title);
    doc.text(title, PW / 2, y, { align: "center" });
    doc.setDrawColor(20, 20, 20);
    doc.setLineWidth(0.3);
    doc.line(PW / 2 - titleW / 2, y + 0.8, PW / 2 + titleW / 2, y + 0.8);

    y += 5;

    // Copy label header
    const isTeacher = copyLabel === "Teacher's Copy";
    doc.setFillColor(isTeacher ? 22 : 16, isTeacher ? 163 : 128, isTeacher ? 74 : 50);
    doc.rect(x, y, CW, 7, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(copyLabel, PW / 2, y + 5, { align: "center" });

    y += 9;

    // ── Row helpers ──────────────────────────────────────────────────────
    doc.setLineWidth(0.2);
    doc.setDrawColor(180, 180, 180);
    const rowH = 8;

    const drawRow = (label1: string, val1: string, label2?: string, val2?: string, highlight?: boolean) => {
      if (highlight) { doc.setFillColor(240, 255, 245); doc.rect(x, y, CW, rowH, "F"); }
      doc.rect(x, y, CW, rowH);

      if (label2 !== undefined && val2 !== undefined) {
        const half = CW * 0.5;
        doc.line(x + half, y, x + half, y + rowH);
        doc.line(x + half * 0.42, y, x + half * 0.42, y + rowH);
        doc.line(x + half + half * 0.42, y, x + half + half * 0.42, y + rowH);

        doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(80,80,80);
        doc.text(label1, x + 2, y + 5.5);
        doc.setFont("helvetica", "normal"); doc.setTextColor(20,20,20);
        doc.text(doc.splitTextToSize(val1, half * 0.55)[0], x + half * 0.44, y + 5.5);

        doc.setFont("helvetica", "bold"); doc.setTextColor(80,80,80);
        doc.text(label2, x + half + 2, y + 5.5);
        doc.setFont("helvetica", "normal"); doc.setTextColor(20,20,20);
        doc.text(doc.splitTextToSize(val2, half * 0.55)[0], x + half + half * 0.44, y + 5.5);
      } else {
        const labelW = CW * 0.35;
        doc.line(x + labelW, y, x + labelW, y + rowH);
        doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(80,80,80);
        doc.text(label1, x + 2, y + 5.5);
        doc.setFont("helvetica", "normal"); doc.setTextColor(20,20,20);
        const val = doc.splitTextToSize(val1, CW - labelW - 4)[0];
        doc.text(val, x + labelW + 2, y + 5.5);
      }
      y += rowH;
    };

    // ── Teacher info ─────────────────────────────────────────────────────
    drawRow("Teacher Name:", safeInv.employeeName);
    drawRow("Teacher ID:",   safeInv.employeeId);
    if (safeInv.employeePhone && safeInv.employeePhone !== "N/A") {
      drawRow("Phone:", safeInv.employeePhone);
    }

    // ── Payment info ─────────────────────────────────────────────────────
    drawRow("Invoice No:",    safeInv.invoiceNumber, "Date:", paidDate, true);
    drawRow("Salary Type:",   safeInv.salaryTypeName, "Academic Year:", safeInv.academicYear, true);
    if (safeInv.monthLabel && safeInv.monthLabel !== "N/A") {
      drawRow("Month:", safeInv.monthLabel, undefined, undefined, true);
    }
    drawRow("Amount:",        `${safeInv.amountPaid.toLocaleString()}/=`, "Method:", methodStr, true);
    drawRow("In Words:",      words, undefined, undefined, true);
    if (safeInv.remarks) drawRow("Remarks:", safeInv.remarks);
    
    // IMPORTANT: Show the user NAME, not the ID
    drawRow("Paid By:",       safeInv.processedBy, "Status:", "PAID ✓", true);

    y += 4;

    // Declaration (school copy only)
    if (!isTeacher) {
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50, 50, 50);
      const lines = doc.splitTextToSize(
        `This is to certify that the above-mentioned teacher has received the salary/payment as stated. ` +
        `This record is maintained for official accounting purposes.`,
        CW
      );
      doc.text(lines, x, y);
      y += lines.length * 4 + 2;
    }

    // Signature lines
    const sigY = y + 8;
    doc.setDrawColor(80, 80, 80); doc.setLineWidth(0.3);
    doc.line(x, sigY, x + 55, sigY);
    doc.line(x + CW - 60, sigY, x + CW, sigY);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(80, 80, 80);
    doc.text(`Date: ${paidDateLong}`, x, sigY + 4);
    doc.text("Cashier Signature", x + CW - 55, sigY + 4);

    // Outer border
    doc.setDrawColor(100, 100, 100); doc.setLineWidth(0.5);
    doc.rect(ML - 3, yStart, CW + 6, sigY + 10 - yStart);
  };

  // ── Teacher's Copy (top) ─────────────────────────────────────────────
  drawCopy(8, "Teacher's Copy");

  // ── Cut line ─────────────────────────────────────────────────────────
  const midY = PH / 2 - 2;
  doc.setDrawColor(150, 150, 150); doc.setLineWidth(0.3); doc.setLineDashPattern([2, 2], 0);
  doc.line(12, midY, PW - 12, midY);
  doc.setLineDashPattern([], 0);
  doc.setFontSize(7); doc.setTextColor(130, 130, 130);
  doc.text("✂ - - - - - - - - - - - - - - - cut here - - - - - - - - - - - - - - - - ✂", PW / 2, midY - 1, { align: "center" });

  // ── School's Copy (bottom) ───────────────────────────────────────────
  drawCopy(midY + 4, "School's Copy");

  doc.save(`${safeInv.invoiceNumber}.pdf`);
}