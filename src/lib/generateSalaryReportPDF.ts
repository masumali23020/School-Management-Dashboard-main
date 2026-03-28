// src/lib/generateSalaryReportPDF.ts
// Generates a full A4 monthly salary payment report PDF
// Shows: school header, report period, filter summary, payment table,
//        teacher-wise subtotals, method breakdown, grand total, signatures
// Install: npm install jspdf (already installed)

import jsPDF from "jspdf";

export type SalaryReportPayment = {
  invoiceNumber:  string;
  teacherName:    string;
  salaryTypeName: string;
  monthLabel:     string | null;
  amountPaid:     number;
  paymentMethod:  string;
  academicYear:   string;
  paidAt:         string;
  collectedBy:    string;
  remarks:        string | null;
};

export type SalaryReportOptions = {
  payments:      SalaryReportPayment[];
  // Filter context — shown in report header
  filterMonth?:  string;           // e.g. "March"
  filterYear?:   string;           // e.g. "2025-2026"
  filterTeacher?: string;          // e.g. "Karim Ali"
  filterType?:   string;           // e.g. "Monthly Salary"
  filterMethod?: string;           // e.g. "Cash"
  fromDate?:     string;
  toDate?:       string;
  // School info
  schoolName?:   string;
  schoolAddress?: string;
  schoolPhone?:  string;
  // Who generated
  generatedBy?:  string;
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

export function generateSalaryReportPDF(opts: SalaryReportOptions): void {
  const {
    payments,
    filterMonth, filterYear, filterTeacher, filterType, filterMethod,
    fromDate, toDate,
    schoolName    = "Your School Name",
    schoolAddress = "School Address, City",
    schoolPhone   = "01XXXXXXXXX",
    generatedBy   = "Admin",
  } = opts;

  const doc  = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const PW   = 210;
  const ML   = 12;
  const MR   = 12;
  const CW   = PW - ML - MR;   // 186mm usable width
  const now  = new Date();
  const generatedAt = now.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) +
                      "  " + now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  // ── Totals ──────────────────────────────────────────────────────────────────
  const grandTotal   = payments.reduce((s, p) => s + Number(p.amountPaid), 0);
  const cashTotal    = payments.filter(p => p.paymentMethod === "CASH").reduce((s, p) => s + Number(p.amountPaid), 0);
  const mobileTotal  = payments.filter(p => p.paymentMethod === "MOBILE_BANKING").reduce((s, p) => s + Number(p.amountPaid), 0);
  const bankTotal    = payments.filter(p => p.paymentMethod === "BANK_TRANSFER").reduce((s, p) => s + Number(p.amountPaid), 0);

  // Teacher-wise breakdown
  const teacherMap: Record<string, number> = {};
  payments.forEach(p => {
    teacherMap[p.teacherName] = (teacherMap[p.teacherName] ?? 0) + Number(p.amountPaid);
  });
  const teacherBreakdown = Object.entries(teacherMap).sort((a, b) => a[0].localeCompare(b[0]));

  // Report title
  const parts: string[] = [];
  if (filterMonth)   parts.push(filterMonth);
  if (filterYear)    parts.push(filterYear);
  if (filterTeacher) parts.push(filterTeacher);
  if (filterType)    parts.push(filterType);
  const reportTitle = parts.length > 0 ? parts.join(" · ") : "All Payments";

  let y = 0;

  // ── Page helper: adds new page if near bottom ───────────────────────────────
  const checkPage = (needed: number) => {
    if (y + needed > 270) {
      doc.addPage();
      y = 15;
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 1 HEADER
  // ══════════════════════════════════════════════════════════════════════════

  // Green top bar
  doc.setFillColor(16, 185, 129);   // emerald-500
  doc.rect(0, 0, PW, 32, "F");

  // School name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(schoolName, PW / 2, 11, { align: "center" });

  // School address + phone
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(209, 250, 229);   // emerald-100
  doc.text(`${schoolAddress}   |   ${schoolPhone}`, PW / 2, 18, { align: "center" });

  // Report type label
  doc.setFontSize(8);
  doc.setTextColor(167, 243, 208);   // emerald-200
  doc.text("SALARY PAYMENT REPORT", PW / 2, 24, { align: "center" });

  // Period subtitle
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(reportTitle, PW / 2, 30, { align: "center" });

  y = 38;

  // ── Info strip ──────────────────────────────────────────────────────────────
  doc.setFillColor(240, 253, 244);   // emerald-50
  doc.rect(ML, y, CW, 20, "F");
  doc.setDrawColor(167, 243, 208);
  doc.rect(ML, y, CW, 20, "S");

  const col1 = ML + 4;
  const col2 = ML + CW * 0.35;
  const col3 = ML + CW * 0.68;

  const infoLine = (x: number, label: string, value: string, row: number) => {
    const ly = y + 6 + row * 7;
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(100, 116, 139);
    doc.text(label, x, ly);
    doc.setFont("helvetica", "normal"); doc.setTextColor(15, 23, 42);
    doc.text(value, x + doc.getTextWidth(label) + 1.5, ly);
  };

  infoLine(col1, "Period:  ", filterMonth ? `${filterMonth}${filterYear ? ", " + filterYear : ""}` : (filterYear ?? "All"), 0);
  infoLine(col2, "Type:  ",   filterType    ?? "All Salary Types", 0);
  infoLine(col3, "Method:  ", filterMethod ? METHOD_LABEL[filterMethod] ?? filterMethod : "All", 0);
  infoLine(col1, "Teacher:  ", filterTeacher ?? "All Teachers", 1);
  if (fromDate || toDate) {
    infoLine(col2, "From:  ", fromDate ?? "—", 1);
    infoLine(col3, "To:  ", toDate ?? "—", 1);
  }

  y += 24;


  // Transactions count
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(100,116,139);
  doc.text(`${payments.length} transaction${payments.length !== 1 ? "s" : ""} found`, ML, y);
  doc.text(`Generated: ${generatedAt}  |  By: ${generatedBy}`, PW - MR, y, { align: "right" });

  y += 7;

  // ══════════════════════════════════════════════════════════════════════════
  // PAYMENT TABLE
  // ══════════════════════════════════════════════════════════════════════════

  // Column widths (total = CW = 186)
  const COL = {
    no:      8,
    invoice: 28,
    teacher: 38,
    type:    28,
    month:   18,
    amount:  22,
    method:  22,
    date:    22,
  };

  const drawTableHeader = () => {
    doc.setFillColor(6, 95, 70);   // emerald-900
    doc.rect(ML, y, CW, 8, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(255,255,255);

    let cx = ML + 1.5;
    const headers = [
      ["#",           COL.no],
      ["Invoice No",  COL.invoice],
      ["Teacher",     COL.teacher],
      ["Salary Type", COL.type],
      ["Month",       COL.month],
      ["Amount (৳)",  COL.amount],
      ["Method",      COL.method],
      ["Date",        COL.date],
    ] as [string, number][];

    headers.forEach(([label, w]) => {
      doc.text(label, cx, y + 5.5);
      cx += w;
    });
    y += 8;
  };

  drawTableHeader();

  payments.forEach((p, idx) => {
    checkPage(8);

    // Re-draw header at top of new page
    if (y <= 17 && idx > 0) drawTableHeader();

    const isEven = idx % 2 === 0;
    doc.setFillColor(isEven ? 255 : 240, isEven ? 255 : 253, isEven ? 255 : 244);
    doc.rect(ML, y, CW, 7.5, "F");

    // Row border
    doc.setDrawColor(220, 252, 231);
    doc.setLineWidth(0.1);
    doc.line(ML, y + 7.5, ML + CW, y + 7.5);

    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(30, 41, 59);

    let cx = ML + 1.5;
    const cell = (text: string, w: number, bold = false) => {
      if (bold) doc.setFont("helvetica", "bold");
      const maxW = w - 2;
      const truncated = doc.splitTextToSize(text, maxW)[0];
      doc.text(truncated, cx, y + 5);
      if (bold) doc.setFont("helvetica", "normal");
      cx += w;
    };

    cell(String(idx + 1), COL.no);
    cell(p.invoiceNumber, COL.invoice, true);
    cell(p.teacherName,   COL.teacher);
    cell(p.salaryTypeName, COL.type);
    cell(p.monthLabel ?? "—", COL.month);

    // Amount — right-aligned
    doc.setFont("helvetica", "bold");
    doc.setTextColor(6, 95, 70);
    doc.text(`tk${Number(p.amountPaid)}`, ML + COL.no + COL.invoice + COL.teacher + COL.type + COL.month + COL.amount - 2, y + 5, { align: "right" });
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "normal");
    cx = ML + COL.no + COL.invoice + COL.teacher + COL.type + COL.month + COL.amount;

    cell(METHOD_LABEL[p.paymentMethod] ?? p.paymentMethod, COL.method);
    cell(new Date(p.paidAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }), COL.date);

    y += 7.5;
  });

  // ── Table total footer ──────────────────────────────────────────────────────
  checkPage(10);
  doc.setFillColor(6, 78, 59);   // emerald-950
  doc.rect(ML, y, CW, 9, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(255,255,255);
  doc.text(`TOTAL  (${payments.length} payments)`, ML + 2, y + 6);
  doc.text(`tk${grandTotal}`, ML + COL.no + COL.invoice + COL.teacher + COL.type + COL.month + COL.amount - 2, y + 6, { align: "right" });
  y += 14;

  checkPage(14);
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(ML, y, CW, 12, 2, 2, "F");
  doc.setDrawColor(167, 243, 208); doc.setLineWidth(0.3);
  doc.roundedRect(ML, y, CW, 12, 2, 2, "S");
  doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(100, 116, 139);
  doc.text("Total in Words:", ML + 3, y + 5);
  doc.setFont("helvetica", "normal"); doc.setTextColor(6, 78, 59);
  const words = amountInWords(Math.round(grandTotal)) + " Taka Only";
  const wordLines = doc.splitTextToSize(words, CW - 40);
  doc.text(wordLines, ML + 35, y + 5);
  y += 17;

  // ══════════════════════════════════════════════════════════════════════════
  // SIGNATURE SECTION
  // ══════════════════════════════════════════════════════════════════════════

  checkPage(30);

  const sigDate = `Date: ${now.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}`;

  doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.3);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(ML, y, ML + CW, y);
  doc.setLineDashPattern([], 0);

  y += 10;

  // Three signature boxes
  const sigW  = (CW - 8) / 3;
  const sigs  = ["Prepared By", "Checked By", "Approved By"];

  sigs.forEach((label, i) => {
    const sx = ML + i * (sigW + 4);
    doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3);
    doc.line(sx, y + 16, sx + sigW, y + 16);
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(100, 116, 139);
    doc.text(label, sx + sigW / 2, y + 20, { align: "center" });
    if (i === 0) {
      doc.setFont("helvetica", "normal"); doc.setFontSize(7);
      doc.text(generatedBy, sx + sigW / 2, y + 10, { align: "center" });
    }
  });

  y += 26;
  doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(150, 150, 150);
  doc.text(sigDate, ML, y);
  doc.text(`${schoolName} — Confidential`, PW - MR, y, { align: "right" });

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE NUMBERS
  // ══════════════════════════════════════════════════════════════════════════

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, PW / 2, 292, { align: "center" });
  }

  // ── File name ──────────────────────────────────────────────────────────────
  const fileParts = ["Salary_Report"];
  if (filterMonth)   fileParts.push(filterMonth.replace(/\s+/g, "_"));
  if (filterYear)    fileParts.push(filterYear.replace(/[^0-9]/g, "-"));
  if (filterTeacher) fileParts.push(filterTeacher.split(" ")[0]);

  doc.save(fileParts.join("_") + ".pdf");
}