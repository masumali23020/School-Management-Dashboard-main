// src/lib/generateFinanceReportPDF.ts
// Full A4 Finance Report — Income vs Expense
// Shows: summary cards, category breakdown, month-by-month table, full transactions

import { FinanceSummary, FinanceTransaction } from "@/Actions/financeActions/financeActions";
import jsPDF from "jspdf";

export type FinanceReportOptions = {
  transactions:  FinanceTransaction[];
  summary:       FinanceSummary;
  filterMonth?:  string;
  filterYear?:   string;
  filterType?:   string;
  fromDate?:     string;
  toDate?:       string;
  schoolName?:   string;
  schoolAddress?: string;
  schoolPhone?:  string;
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
  if (n < 20)  return ones[n];
  if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? " " + ones[n%10] : "");
  if (n < 1000) return ones[Math.floor(n/100)] + " Hundred" + (n%100 ? " " + amountInWords(n%100) : "");
  if (n < 100000) return amountInWords(Math.floor(n/1000)) + " Thousand" + (n%1000 ? " " + amountInWords(n%1000) : "");
  if (n < 10000000) return amountInWords(Math.floor(n/100000)) + " Lakh" + (n%100000 ? " " + amountInWords(n%100000) : "");
  return amountInWords(Math.floor(n/10000000)) + " Crore" + (n%10000000 ? " " + amountInWords(n%10000000) : "");
}

export function generateFinanceReportPDF(opts: FinanceReportOptions): void {
  const {
    transactions, summary,
    filterMonth, filterYear, filterType,
    fromDate, toDate,
    schoolName    = "Your School Name",
    schoolAddress = "School Address, City",
    schoolPhone   = "01XXXXXXXXX",
    generatedBy   = "Admin",
  } = opts;

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const PW  = 210;
  const ML  = 12;
  const MR  = 12;
  const CW  = PW - ML - MR;

  const now          = new Date();
  const generatedAt  = now.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
                     + "  " + now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  // Period label
  const parts: string[] = [];
  if (filterMonth) parts.push(filterMonth);
  if (filterYear)  parts.push(filterYear);
  if (filterType)  parts.push(filterType);
  const periodLabel = parts.length > 0 ? parts.join(" · ") : "All Periods";

  let y = 0;

  const checkPage = (needed: number) => {
    if (y + needed > 272) { doc.addPage(); y = 14; }
  };

  // ── HEADER ──────────────────────────────────────────────────────────────────
  // Background gradient band
  doc.setFillColor(15, 23, 42);       // slate-900
  doc.rect(0, 0, PW, 36, "F");

  // Accent line
  doc.setFillColor(99, 102, 241);     // indigo-500
  doc.rect(0, 34, PW, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(schoolName, PW / 2, 11, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);    // slate-400
  doc.text(`${schoolAddress}   |   ${schoolPhone}`, PW / 2, 18, { align: "center" });

  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("FINANCIAL STATEMENT", PW / 2, 24, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(224, 231, 255);    // indigo-100
  doc.text(periodLabel, PW / 2, 31, { align: "center" });

  y = 42;

  // ── META STRIP ───────────────────────────────────────────────────────────────
  doc.setFillColor(248, 250, 252);
  doc.rect(ML, y, CW, 14, "F");
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.rect(ML, y, CW, 14, "S");

  const meta = [
    ["Period:",     filterMonth ? `${filterMonth}${filterYear ? ", " + filterYear : ""}` : (filterYear ?? "All")],
    ["Type:",       filterType ?? "Income & Expense"],
    ["From:",       fromDate ?? "—"],
    ["To:",         toDate   ?? "—"],
    ["Generated:",  generatedAt],
    ["By:",         generatedBy],
  ];

  const colW = CW / 3;
  meta.forEach(([label, value], i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x   = ML + col * colW + 3;
    const ly  = y + 5 + row * 6;
    doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(100, 116, 139);
    doc.text(label, x, ly);
    doc.setFont("helvetica", "normal"); doc.setTextColor(15, 23, 42);
    doc.text(value, x + doc.getTextWidth(label) + 1.5, ly);
  });

  y += 19;

  // ── SUMMARY CARDS ────────────────────────────────────────────────────────────
  const cardW = (CW - 6) / 3;

  const cards = [
    {
      label:   "Total Income",
      value:   `৳${summary.totalIncome.toLocaleString()}`,
      sub:     `${summary.incomeCount} transactions`,
      bg:      [5, 150, 105]  as [number,number,number],    // emerald-600
      light:   [209, 250, 229] as [number,number,number],   // emerald-100
    },
    {
      label:   "Total Expense",
      value:   `৳${summary.totalExpense.toLocaleString()}`,
      sub:     `${summary.expenseCount} transactions`,
      bg:      [220, 38, 38]  as [number,number,number],    // red-600
      light:   [254, 226, 226] as [number,number,number],   // red-100
    },
    {
      label:   summary.netBalance >= 0 ? "Net Surplus" : "Net Deficit",
      value:   `৳${Math.abs(summary.netBalance).toLocaleString()}`,
      sub:     summary.netBalance >= 0 ? "In surplus" : "In deficit",
      bg:      summary.netBalance >= 0
        ? [37, 99, 235]   as [number,number,number]         // blue-600
        : [234, 88, 12]   as [number,number,number],        // orange-600
      light:   summary.netBalance >= 0
        ? [219, 234, 254] as [number,number,number]         // blue-100
        : [255, 237, 213] as [number,number,number],        // orange-100
    },
  ];

  cards.forEach((card, i) => {
    const cx = ML + i * (cardW + 3);
    doc.setFillColor(...card.bg);
    doc.roundedRect(cx, y, cardW, 22, 2, 2, "F");

    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(255,255,255);
    doc.text(card.label, cx + 3, y + 6);

    doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(255,255,255);
    doc.text(card.value, cx + 3, y + 15);

    doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.setTextColor(255,255,255);
    doc.text(card.sub, cx + 3, y + 20);
  });

  y += 27;

  // ── MONTHLY BREAKDOWN TABLE ───────────────────────────────────────────────
  if (summary.monthly.length > 0) {
    checkPage(14 + summary.monthly.length * 7.5);

    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
    doc.text("Monthly Breakdown", ML, y);
    doc.setDrawColor(99, 102, 241); doc.setLineWidth(0.4);
    doc.line(ML, y + 1.5, ML + 50, y + 1.5);
    y += 6;

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(ML, y, CW, 7.5, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(255,255,255);
    doc.text("Month",           ML + 3,           y + 5);
    doc.text("Income (৳)",      ML + CW * 0.35,   y + 5);
    doc.text("Expense (৳)",     ML + CW * 0.55,   y + 5);
    doc.text("Net (৳)",         ML + CW * 0.75,   y + 5);
    doc.text("Balance",         ML + CW - 20,     y + 5);
    y += 7.5;

    let runningBalance = 0;
    summary.monthly.forEach((row, idx) => {
      const net     = row.income - row.expense;
      runningBalance += net;
      const isPos   = net >= 0;

      doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
      doc.rect(ML, y, CW, 7, "F");
      doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.1);
      doc.line(ML, y + 7, ML + CW, y + 7);

      doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(30, 41, 59);
      doc.text(row.month, ML + 3, y + 4.8);

      doc.setTextColor(5, 150, 105);
      doc.text(row.income.toLocaleString(), ML + CW * 0.35, y + 4.8);

      doc.setTextColor(220, 38, 38);
      doc.text(row.expense.toLocaleString(), ML + CW * 0.55, y + 4.8);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(isPos ? 5 : 220, isPos ? 150 : 38, isPos ? 105 : 38);
      doc.text(`${isPos ? "+" : "-"}${Math.abs(net).toLocaleString()}`, ML + CW * 0.75, y + 4.8);

      doc.setTextColor(30, 41, 59);
      doc.text(runningBalance.toLocaleString(), ML + CW - 20, y + 4.8);

      y += 7;
    });

    // Monthly total footer
    const totalNet = summary.totalIncome - summary.totalExpense;
    doc.setFillColor(15, 23, 42);
    doc.rect(ML, y, CW, 8, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(255,255,255);
    doc.text("TOTAL", ML + 3, y + 5.5);
    doc.setTextColor(110, 231, 183);
    doc.text(summary.totalIncome.toLocaleString(), ML + CW * 0.35, y + 5.5);
    doc.setTextColor(252, 165, 165);
    doc.text(summary.totalExpense.toLocaleString(), ML + CW * 0.55, y + 5.5);
    doc.setTextColor(totalNet >= 0 ? 110 : 252, totalNet >= 0 ? 231 : 165, totalNet >= 0 ? 183 : 165);
    doc.text(`${totalNet >= 0 ? "+" : "-"}${Math.abs(totalNet).toLocaleString()}`, ML + CW * 0.75, y + 5.5);
    y += 13;
  }

  // ── CATEGORY BREAKDOWN (side-by-side) ────────────────────────────────────
  if (summary.incomeByCategory.length > 0 || summary.expenseByCategory.length > 0) {
    const maxRows = Math.max(summary.incomeByCategory.length, summary.expenseByCategory.length);
    checkPage(14 + maxRows * 6.5 + 8);

    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
    doc.text("Category Breakdown", ML, y);
    doc.setDrawColor(99, 102, 241); doc.setLineWidth(0.4);
    doc.line(ML, y + 1.5, ML + 55, y + 1.5);
    y += 6;

    const halfW  = (CW - 4) / 2;

    // Income header
    doc.setFillColor(5, 150, 105);
    doc.rect(ML, y, halfW, 7, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(255,255,255);
    doc.text("📈 Income Category", ML + 2, y + 5);
    doc.text("Amount", ML + halfW - 22, y + 5);

    // Expense header
    const ex = ML + halfW + 4;
    doc.setFillColor(220, 38, 38);
    doc.rect(ex, y, halfW, 7, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(255,255,255);
    doc.text("📉 Expense Category", ex + 2, y + 5);
    doc.text("Amount", ex + halfW - 22, y + 5);

    y += 7;

    const catRows = Math.max(
      summary.incomeByCategory.length,
      summary.expenseByCategory.length
    );

    for (let i = 0; i < catRows; i++) {
      const inc = summary.incomeByCategory[i];
      const exp = summary.expenseByCategory[i];
      const isE = i % 2 !== 0;

      // Income side
      doc.setFillColor(isE ? 240 : 255, isE ? 253 : 255, isE ? 244 : 255);
      doc.rect(ML, y, halfW, 6.5, "F");
      doc.setDrawColor(209, 250, 229); doc.setLineWidth(0.1);
      doc.line(ML, y + 6.5, ML + halfW, y + 6.5);

      if (inc) {
        doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(30, 41, 59);
        doc.text(inc.category, ML + 2, y + 4.5);
        doc.setFont("helvetica", "bold"); doc.setTextColor(5, 150, 105);
        doc.text(`৳${inc.total.toLocaleString()}`, ML + halfW - 2, y + 4.5, { align: "right" });
      }

      // Expense side
      doc.setFillColor(isE ? 255 : 255, isE ? 241 : 255, isE ? 242 : 255);
      doc.rect(ex, y, halfW, 6.5, "F");
      doc.setDrawColor(254, 202, 202); doc.setLineWidth(0.1);
      doc.line(ex, y + 6.5, ex + halfW, y + 6.5);

      if (exp) {
        doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(30, 41, 59);
        doc.text(exp.category, ex + 2, y + 4.5);
        doc.setFont("helvetica", "bold"); doc.setTextColor(220, 38, 38);
        doc.text(`৳${exp.total.toLocaleString()}`, ex + halfW - 2, y + 4.5, { align: "right" });
      }

      y += 6.5;
    }

    y += 8;
  }

  // ── TRANSACTION DETAIL TABLE ─────────────────────────────────────────────
  checkPage(16);

  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
  doc.text(`Transaction Details  (${transactions.length} records)`, ML, y);
  doc.setDrawColor(99, 102, 241); doc.setLineWidth(0.4);
  doc.line(ML, y + 1.5, ML + 80, y + 1.5);
  y += 6;

  const COL = {
    no:      7,
    invoice: 26,
    type:    14,
    party:   34,
    cat:     28,
    month:   16,
    amount:  22,
    method:  22,
    date:    17,
  };

  const drawTxHeader = () => {
    doc.setFillColor(15, 23, 42);
    doc.rect(ML, y, CW, 7.5, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); doc.setTextColor(255,255,255);
    let cx = ML + 1.5;
    [
      ["#",        COL.no],
      ["Invoice",  COL.invoice],
      ["Type",     COL.type],
      ["Name",     COL.party],
      ["Category", COL.cat],
      ["Month",    COL.month],
      ["Amount ৳", COL.amount],
      ["Method",   COL.method],
      ["Date",     COL.date],
    ].forEach(([label, w]) => {
      doc.text(String(label), cx, y + 5);
      cx += Number(w);
    });
    y += 7.5;
  };

  drawTxHeader();

  transactions.forEach((t, idx) => {
    checkPage(7);
    if (y <= 16 && idx > 0) drawTxHeader();

    const isIncome = t.type === "INCOME";
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.rect(ML, y, CW, 7, "F");
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.1);
    doc.line(ML, y + 7, ML + CW, y + 7);

    doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.setTextColor(30, 41, 59);

    let cx = ML + 1.5;
    const cell = (text: string, w: number, color?: [number,number,number], bold = false) => {
      if (bold) doc.setFont("helvetica", "bold");
      if (color) doc.setTextColor(...color); else doc.setTextColor(30, 41, 59);
      const t2 = doc.splitTextToSize(text, w - 2)[0];
      doc.text(t2, cx, y + 4.8);
      if (bold) doc.setFont("helvetica", "normal");
      cx += w;
    };

    cell(String(idx + 1),  COL.no);
    cell(t.invoiceNumber,  COL.invoice, [99, 102, 241], true);
    cell(t.type,           COL.type,
      isIncome ? [5, 150, 105] : [220, 38, 38], true);
    cell(t.party,          COL.party);
    cell(t.category,       COL.cat);
    cell(t.monthLabel ?? "—", COL.month);

    // Amount right-aligned
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...(isIncome ? [5, 150, 105] : [220, 38, 38]) as [number,number,number]);
    const amtX = ML + COL.no + COL.invoice + COL.type + COL.party + COL.cat + COL.month + COL.amount - 2;
    doc.text(`${isIncome ? "+" : "-"}${t.amount.toLocaleString()}`, amtX, y + 4.8, { align: "right" });
    doc.setFont("helvetica", "normal");
    cx = ML + COL.no + COL.invoice + COL.type + COL.party + COL.cat + COL.month + COL.amount;

    cell(METHOD_LABEL[t.paymentMethod] ?? t.paymentMethod, COL.method);
    cell(new Date(t.paidAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }), COL.date);

    y += 7;
  });

  // Table footer totals
  checkPage(16);
  doc.setFillColor(15, 23, 42);
  doc.rect(ML, y, CW, 8, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(255,255,255);
  doc.text(`${transactions.length} transactions`, ML + 2, y + 5.5);

  // Show income / expense total in footer
  const incTotal = transactions.filter(t => t.type === "INCOME").reduce((s,t) => s + t.amount, 0);
  const expTotal = transactions.filter(t => t.type === "EXPENSE").reduce((s,t) => s + t.amount, 0);
  doc.setTextColor(110, 231, 183);
  doc.text(`+৳${incTotal.toLocaleString()}`, ML + CW * 0.45, y + 5.5);
  doc.setTextColor(252, 165, 165);
  doc.text(`-৳${expTotal.toLocaleString()}`, ML + CW * 0.65, y + 5.5);
  const net = incTotal - expTotal;
  doc.setTextColor(net >= 0 ? 110 : 252, net >= 0 ? 231 : 165, net >= 0 ? 183 : 165);
  doc.text(`Net: ${net >= 0 ? "+" : "-"}৳${Math.abs(net).toLocaleString()}`, ML + CW - 3, y + 5.5, { align: "right" });
  y += 13;

  // ── AMOUNT IN WORDS ───────────────────────────────────────────────────────
  checkPage(14);
  doc.setFillColor(238, 242, 255);
  doc.roundedRect(ML, y, CW, 12, 2, 2, "F");
  doc.setDrawColor(199, 210, 254); doc.setLineWidth(0.3);
  doc.roundedRect(ML, y, CW, 12, 2, 2, "S");
  doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(79, 70, 229);
  doc.text("Net Balance in Words:", ML + 3, y + 5);
  doc.setFont("helvetica", "normal"); doc.setTextColor(30, 41, 59);
  const balWords = (summary.netBalance >= 0 ? "Surplus of " : "Deficit of ")
                 + amountInWords(Math.round(Math.abs(summary.netBalance))) + " Taka Only";
  const wLines = doc.splitTextToSize(balWords, CW - 45);
  doc.text(wLines, ML + 42, y + 5);
  y += 17;

  // ── SIGNATURES ────────────────────────────────────────────────────────────
  checkPage(28);
  doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.3); doc.setLineDashPattern([1.5,1.5],0);
  doc.line(ML, y, ML + CW, y);
  doc.setLineDashPattern([],0);
  y += 10;

  const sigW = (CW - 8) / 3;
  ["Prepared By", "Verified By", "Approved By"].forEach((label, i) => {
    const sx = ML + i * (sigW + 4);
    doc.setDrawColor(100, 116, 139); doc.setLineWidth(0.4);
    doc.line(sx, y + 14, sx + sigW, y + 14);
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(100, 116, 139);
    doc.text(label, sx + sigW / 2, y + 18, { align: "center" });
    if (i === 0) {
      doc.setFont("helvetica", "normal"); doc.setFontSize(7);
      doc.text(generatedBy, sx + sigW / 2, y + 8, { align: "center" });
    }
  });

  y += 24;
  doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(148, 163, 184);
  doc.text(`Generated: ${generatedAt}`, ML, y);
  doc.text(`${schoolName} — Confidential`, PW - MR, y, { align: "right" });

  // ── PAGE NUMBERS ──────────────────────────────────────────────────────────
  const total = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${total}`, PW / 2, 292, { align: "center" });
  }

  // ── FILE NAME ─────────────────────────────────────────────────────────────
  const parts2 = ["Finance_Report"];
  if (filterMonth) parts2.push(filterMonth.replace(/\s/g, "_"));
  if (filterYear)  parts2.push(filterYear.replace(/[^0-9]/g, "-"));
  doc.save(parts2.join("_") + ".pdf");
}