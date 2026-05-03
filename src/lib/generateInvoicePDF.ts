// src/lib/generateInvoicePDF.ts
// Invoice PDF — National University style, two copies on A4
// Student's Copy (top) + School's Copy (bottom)

import jsPDF from "jspdf";

export type InvoiceData = {
  invoiceNumber:   string;
  studentName:     string;
  studentId:       string;
  className:       string;
  gradeLevel?:     number | null;
  rollNumber?:     number | null;
  fatherName?:     string | null;   // ← shown if available
  feeTypeName:     string;
  amountPaid:      number;
  paymentMethod:   string;
  monthLabel?:     string | null;
  academicYear:    string;
  paidAt:          string;
  collectedByName: string;          // ← always use this field
  remarks?:        string | null;
  schoolName?:     string;
  schoolAddress?:  string;
  schoolPhone?:    string;
  schoolEmail?:    string;
  establishedYear?: string;
  eiinNumber?:      string;
  academicSession?: string;
  collectedBy?: string;      // Keep for backward compatibility

};

const METHOD_LABEL: Record<string, string> = {
  CASH: "Cash", MOBILE_BANKING: "Mobile Banking", BANK_TRANSFER: "Bank Transfer",
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
export function generateInvoicePDF(inv: InvoiceData): void {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const PW = 210;
  const PH = 297;

  const schoolName    = inv.schoolName    ?? "Your School Name";
  const schoolAddress = inv.schoolAddress ?? "School Address, City";
  const schoolPhone   = inv.schoolPhone   ?? "01XXXXXXXXX";
  const schoolEmail   = inv.schoolEmail   ?? "";

  const paidDate     = new Date(inv.paidAt).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
  const paidDateLong = new Date(inv.paidAt).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const words        = amountInWords(Math.round(Number(inv.amountPaid))) + " Taka Only";
  const methodStr    = METHOD_LABEL[inv.paymentMethod] ?? inv.paymentMethod;

  // ── Resolve collectedByName safely ──────────────────────────────────────
  // Support both field names coming from different parts of the codebase
  const collectedByDisplay =
    inv.collectedByName ||
    (inv as any).collectedBy ||
    "Admin";

  // ── Resolve fatherName — show only if available ──────────────────────────
  const fatherNameDisplay = inv.fatherName
    ? inv.fatherName.trim()
    : null;

  const drawCopy = (yStart: number, copyLabel: string) => {
    const ML = 15;
    const MR = 15;
    const CW = PW - ML - MR;
    const x  = ML;
    let y    = yStart + 6;

    // Header
    doc.setDrawColor(100, 100, 200);
    doc.setLineWidth(0.5);
    doc.circle(x + 10, y + 6, 10);
    doc.setFontSize(6);
    doc.setTextColor(80, 80, 180);
    doc.setFont("helvetica", "bold");
    doc.text("LOGO", x + 10, y + 7, { align: "center" });
    doc.circle(x + CW - 10, y + 6, 10);
    doc.text("LOGO", x + CW - 10, y + 7, { align: "center" });

    doc.setFontSize(15);
    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "bold");
    doc.text(schoolName, PW / 2, y + 3, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text(schoolAddress, PW / 2, y + 9, { align: "center" });
    if (schoolPhone) {
      doc.text(
        `Phone: ${schoolPhone}${schoolEmail ? "  |  Email: " + schoolEmail : ""}`,
        PW / 2, y + 14, { align: "center" }
      );
    }

    y += 20;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 20);
    const titleText = "Fee Payment Receipt";
    const titleW    = doc.getTextWidth(titleText);
    doc.text(titleText, PW / 2, y, { align: "center" });
    doc.setDrawColor(20, 20, 20);
    doc.setLineWidth(0.3);
    doc.line(PW / 2 - titleW / 2, y + 0.8, PW / 2 + titleW / 2, y + 0.8);

    y += 5;

    // Copy label bar
    const isStudent = copyLabel === "Student's Copy";
    doc.setFillColor(isStudent ? 70 : 30, isStudent ? 130 : 100, isStudent ? 180 : 60);
    doc.rect(x, y, CW, 7, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(copyLabel, PW / 2, y + 5, { align: "center" });

    y += 9;

    doc.setLineWidth(0.2);
    doc.setDrawColor(180, 180, 180);
    const rowH = 8;

    const drawRow = (
      label1: string, val1: string,
      label2?: string, val2?: string,
      highlight?: boolean
    ) => {
      if (highlight) { doc.setFillColor(240, 240, 255); doc.rect(x, y, CW, rowH, "F"); }
      doc.rect(x, y, CW, rowH);

      if (label2 !== undefined && val2 !== undefined) {
        const half = CW * 0.5;
        doc.line(x + half, y, x + half, y + rowH);
        doc.line(x + half * 0.42, y, x + half * 0.42, y + rowH);
        doc.line(x + half + half * 0.42, y, x + half + half * 0.42, y + rowH);

        doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(80, 80, 80);
        doc.text(label1, x + 2, y + 5.5);
        doc.setFont("helvetica", "normal"); doc.setTextColor(20, 20, 20);
        doc.text(String(val1 ?? ""), x + half * 0.44, y + 5.5);

        doc.setFont("helvetica", "bold"); doc.setTextColor(80, 80, 80);
        doc.text(label2, x + half + 2, y + 5.5);
        doc.setFont("helvetica", "normal"); doc.setTextColor(20, 20, 20);
        doc.text(String(val2 ?? ""), x + half + half * 0.44, y + 5.5);
      } else {
        const labelColW = CW * 0.35;
        doc.line(x + labelColW, y, x + labelColW, y + rowH);
        doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(80, 80, 80);
        doc.text(label1, x + 2, y + 5.5);
        doc.setFont("helvetica", "normal"); doc.setTextColor(20, 20, 20);
        const maxW = CW - labelColW - 4;
        const lines = doc.splitTextToSize(String(val1 ?? ""), maxW);
        doc.text(lines[0], x + labelColW + 2, y + 5.5);
      }
      y += rowH;
    };

    // ── Student info ──────────────────────────────────────────────────────
    drawRow("Student's Name:", inv.studentName);

    // Father's name row — only show if value exists
    if (fatherNameDisplay) {
      drawRow("Father's Name:", fatherNameDisplay);
    }

    drawRow("Student ID:", inv.studentId, "Academic Year:", inv.academicYear);
    drawRow(
      "Class:",     inv.className + (inv.gradeLevel ? ` (Grade ${inv.gradeLevel})` : ""),
      "Roll No:",   inv.rollNumber ? String(inv.rollNumber) : "N/A"
    );

    // ── Payment info ──────────────────────────────────────────────────────
    drawRow("Invoice No:", inv.invoiceNumber,                    "Date:",   paidDate,    true);
    drawRow("Fee Type:",   inv.feeTypeName,                      "Month:",  inv.monthLabel ?? "—", true);
    drawRow("Amount:",     `${Number(inv.amountPaid).toLocaleString()}/=`, "Method:", methodStr, true);
    drawRow("In Words:",   words,                                undefined, undefined,   true);
    if (inv.remarks) drawRow("Remarks:", inv.remarks);
    drawRow("Collected By:", collectedByDisplay,                 "Status:", "PAID ✓",   true);

    y += 4;

    // Declaration (school copy only)
    if (!isStudent) {
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50, 50, 50);
      const declaration =
        `This is to certify that the above mentioned student has paid the fee as stated. ` +
        `This receipt is valid subject to realization of payment. ` +
        `If any information provided is found to be incorrect, the school authority reserves the right to take appropriate action.`;
      const lines = doc.splitTextToSize(declaration, CW);
      doc.text(lines, x, y);
      y += lines.length * 4 + 2;
    }

    // Signature lines
    const sigY = y + 8;
    doc.setDrawColor(80, 80, 80); doc.setLineWidth(0.3);
    doc.line(x, sigY, x + 55, sigY);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(80, 80, 80);
    doc.text(`Date: ${paidDateLong}`, x, sigY + 4);
    doc.line(x + CW - 60, sigY, x + CW, sigY);
    doc.text("Signature & Seal of Principal", x + CW - 60, sigY + 4);

    doc.setDrawColor(100, 100, 100); doc.setLineWidth(0.5);
    doc.rect(ML - 3, yStart, CW + 6, sigY + 10 - yStart);
  };

  drawCopy(8, "Student's Copy");

  const midY = PH / 2 - 2;
  doc.setDrawColor(150, 150, 150); doc.setLineWidth(0.3); doc.setLineDashPattern([2, 2], 0);
  doc.line(12, midY, PW - 12, midY);
  doc.setLineDashPattern([], 0);
  doc.setFontSize(7); doc.setTextColor(130, 130, 130);
  doc.text("✂ - - - - - - - - - - - - - - - cut here - - - - - - - - - - - - - - - - ✂", PW / 2, midY - 1, { align: "center" });

  drawCopy(midY + 4, "School's Copy");

  doc.save(`${inv.invoiceNumber}.pdf`);
}