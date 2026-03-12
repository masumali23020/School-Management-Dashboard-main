// src/lib/generateInvoicePDF.ts
// Invoice PDF — styled like National University exam form
// Two copies on one A4 page: Student's Copy (top) + College Copy (bottom)
// Install: npm install jspdf

import jsPDF from "jspdf";

export type InvoiceData = {
  invoiceNumber: string;
  studentName: string;
  studentId: string;
  className: string;
  gradeLevel?: number | null;
  rollNumber?: number | null;
  fatherName?: string | null;
  feeTypeName: string;
  amountPaid: number;
  paymentMethod: string;
  monthLabel?: string | null;
  academicYear: string;
  paidAt: string;
  collectedBy: string;
  remarks?: string | null;
  // School info
  schoolName?: string;
  schoolAddress?: string;
  schoolPhone?: string;
  schoolEmail?: string;
};

const METHOD_LABEL: Record<string, string> = {
  CASH: "Cash",
  MOBILE_BANKING: "Mobile Banking",
  BANK_TRANSFER: "Bank Transfer",
};

// ── number to words (simple, for Bangladeshi amounts) ──────────────────────
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
  const PW = 210; // A4 width
  const PH = 297; // A4 height

  const schoolName    = inv.schoolName    ?? "Your School Name";
  const schoolAddress = inv.schoolAddress ?? "School Address, City";
  const schoolPhone   = inv.schoolPhone   ?? "01XXXXXXXXX";
  const schoolEmail   = inv.schoolEmail   ?? "";

  const paidDate = new Date(inv.paidAt).toLocaleDateString("en-GB", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
  const paidDateLong = new Date(inv.paidAt).toLocaleDateString("en-GB", {
    day: "2-digit", month: "long", year: "numeric",
  });

  const words = amountInWords(Math.round(inv.amountPaid)) + " Taka Only";
  const methodStr = METHOD_LABEL[inv.paymentMethod] ?? inv.paymentMethod;

  // ═══════════════════════════════════════════════════════════════
  // Helper: draw one copy block
  // yStart = top of the block, height = block height
  // copyLabel = "Student's Copy" | "College Copy"
  // ═══════════════════════════════════════════════════════════════
  const drawCopy = (yStart: number, copyLabel: string) => {
    const ML = 15;   // margin left
    const MR = 15;   // margin right
    const CW = PW - ML - MR; // content width = 180
    const x  = ML;
    let y    = yStart + 6;

    // ── School header ─────────────────────────────────────────────
    // Left logo placeholder circle
    doc.setDrawColor(100, 100, 200);
    doc.setLineWidth(0.5);
    doc.circle(x + 10, y + 6, 10);
    doc.setFontSize(6);
    doc.setTextColor(80, 80, 180);
    doc.setFont("helvetica", "bold");
    doc.text("LOGO", x + 10, y + 7, { align: "center" });

    // Right logo placeholder circle
    doc.circle(x + CW - 10, y + 6, 10);
    doc.text("LOGO", x + CW - 10, y + 7, { align: "center" });

    // School name center
    doc.setFontSize(15);
    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "bold");
    doc.text(schoolName, PW / 2, y + 3, { align: "center" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text(schoolAddress, PW / 2, y + 9, { align: "center" });
    if (schoolPhone) doc.text(`Phone: ${schoolPhone}${schoolEmail ? "  |  Email: " + schoolEmail : ""}`, PW / 2, y + 14, { align: "center" });

    y += 20;

    // Underlined title
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 20);
    const titleText = "Fee Payment Receipt";
    const titleW = doc.getTextWidth(titleText);
    doc.text(titleText, PW / 2, y, { align: "center" });
    doc.setDrawColor(20, 20, 20);
    doc.setLineWidth(0.3);
    doc.line(PW / 2 - titleW / 2, y + 0.8, PW / 2 + titleW / 2, y + 0.8);

    y += 5;

    // ── Colored copy label header ─────────────────────────────────
    const isStudent = copyLabel === "Student's Copy";
    doc.setFillColor(isStudent ? 70 : 30, isStudent ? 130 : 100, isStudent ? 180 : 60);
    doc.rect(x, y, CW, 7, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(copyLabel, PW / 2, y + 5, { align: "center" });

    y += 9;

    // ── Table rows helper ─────────────────────────────────────────
    doc.setLineWidth(0.2);
    doc.setDrawColor(180, 180, 180);

    const rowH = 8;

    const drawTableRow = (
      label1: string, val1: string,
      label2?: string, val2?: string,
      highlight?: boolean
    ) => {
      if (highlight) {
        doc.setFillColor(240, 240, 255);
        doc.rect(x, y, CW, rowH, "F");
      }
      doc.rect(x, y, CW, rowH);

      // ── Row with 2 columns ──
      if (label2 !== undefined && val2 !== undefined) {
        const col1W = CW * 0.5;
        const col2W = CW * 0.5;

        // divider
        doc.line(x + col1W, y, x + col1W, y + rowH);
        // inner col label/value divider col1
        doc.line(x + col1W * 0.42, y, x + col1W * 0.42, y + rowH);
        // inner col label/value divider col2
        doc.line(x + col1W + col2W * 0.42, y, x + col1W + col2W * 0.42, y + rowH);

        // Col1 label
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        doc.text(label1, x + 2, y + 5.5);

        // Col1 value
        doc.setFont("helvetica", "normal");
        doc.setTextColor(20, 20, 20);
        doc.text(val1, x + col1W * 0.44, y + 5.5);

        // Col2 label
        doc.setFont("helvetica", "bold");
        doc.setTextColor(80, 80, 80);
        doc.text(label2, x + col1W + 2, y + 5.5);

        // Col2 value
        doc.setFont("helvetica", "normal");
        doc.setTextColor(20, 20, 20);
        doc.text(val2, x + col1W + col2W * 0.44, y + 5.5);
      } else {
        // Full-width row
        const labelColW = CW * 0.35;
        doc.line(x + labelColW, y, x + labelColW, y + rowH);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        doc.text(label1, x + 2, y + 5.5);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(20, 20, 20);
        const maxW = CW - labelColW - 4;
        const lines = doc.splitTextToSize(val1, maxW);
        doc.text(lines[0], x + labelColW + 2, y + 5.5);
      }
      y += rowH;
    };

    // ── Student info rows ─────────────────────────────────────────
    drawTableRow("Student's Name:", inv.studentName);
    drawTableRow("Father's Name:", inv.fatherName ?? "—");
    drawTableRow(
      "Student ID:", inv.studentId,
      "Academic Year:", inv.academicYear
    );
    drawTableRow(
      "Class:", inv.className + (inv.gradeLevel ? ` (Grade ${inv.gradeLevel})` : ""),
      "Roll No:", inv.rollNumber ? String(inv.rollNumber) : "N/A"
    );

    // ── Payment info rows ─────────────────────────────────────────
    drawTableRow("Invoice No:", inv.invoiceNumber, "Date:", paidDate, true);
    drawTableRow(
      "Fee Type:", inv.feeTypeName,
      "Month:", inv.monthLabel ?? "—",
      true
    );
    drawTableRow("Amount:", `${inv.amountPaid.toLocaleString()}/=`, "Method:", methodStr, true);
    drawTableRow("In Words:", words, undefined, undefined, true);
    if (inv.remarks) drawTableRow("Remarks:", inv.remarks);
    drawTableRow("Collected By:", inv.collectedBy, "Status:", "PAID ✓", true);

    y += 4;

    // ── Declaration text (College Copy only) ──────────────────────
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

    // ── Signature area ────────────────────────────────────────────
    const sigY = y + 8;
    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.3);
    // Left signature
    doc.line(x, sigY, x + 55, sigY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);
    doc.text(`Date: ${paidDateLong}`, x, sigY + 4);

    // Right signature
    doc.line(x + CW - 60, sigY, x + CW, sigY);
    doc.text("Signature & Seal of Principal", x + CW - 60, sigY + 4);

    // ── Outer border around entire copy block ─────────────────────
    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.5);
    doc.rect(ML - 3, yStart, CW + 6, sigY + 10 - yStart);
  };

  // ═══════════════════════════════════════════════════════════════
  // Draw Student's Copy (top half)
  // ═══════════════════════════════════════════════════════════════
  drawCopy(8, "Student's Copy");

  // ── Scissor / cut line ────────────────────────────────────────
  const midY = PH / 2 - 2;
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(12, midY, PW - 12, midY);
  doc.setLineDashPattern([], 0);
  doc.setFontSize(7);
  doc.setTextColor(130, 130, 130);
  doc.text("✂ - - - - - - - - - - - - - - - cut here - - - - - - - - - - - - - - - - ✂", PW / 2, midY - 1, { align: "center" });

  // ═══════════════════════════════════════════════════════════════
  // Draw College Copy (bottom half)
  // ═══════════════════════════════════════════════════════════════
  drawCopy(midY + 4, "College Copy");

  // ── Save ──────────────────────────────────────────────────────
  doc.save(`${inv.invoiceNumber}.pdf`);
}