// src/lib/generateInvoice.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface MealBreakdownItem {
  mealTypeName: string;
  count: number;
  rate: number;
  total: number;
}

interface InvoiceData {
  schoolName: string;
  shortName: string | null;  // null হতে পারে
  schoolAddress: string | null;  // null হতে পারে
  schoolPhone: string | null;  // null হতে পারে
  academicSession: string | null;  // null হতে পারে
  establishedYear: number | null;  // null হতে পারে
  studentName: string;
  rollNumber?: string | null;  // null হতে পারে
  monthLabel: string;
  amountPaid: number;
  paymentMethod: string;
  invoiceId: string | number;
  breakdown: MealBreakdownItem[];
  netDue: number;
}

export const generateMealInvoice = (data: InvoiceData) => {
  const doc = new jsPDF();
  const dateStr = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });

  // School নাম null-check
  const schoolName = data.schoolName || "School Name";
  const shortName = data.shortName || schoolName;
  const schoolAddress = data.schoolAddress || "N/A";
  const schoolPhone = data.schoolPhone || "N/A";
  const academicSession = data.academicSession || "Current Session";
  const establishedYear = data.establishedYear || new Date().getFullYear();

  // --- Header Section with Logo Space ---
  doc.setFontSize(22);
  doc.setTextColor(41, 128, 185); // আকাশী নীল
  doc.setFont("helvetica", "bold");
  doc.text(shortName.toUpperCase(), 105, 20, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  doc.text(schoolAddress, 105, 28, { align: "center" });
  doc.text(`Est. ${establishedYear} | ${academicSession}`, 105, 34, { align: "center" });
  doc.text(`Tel: ${schoolPhone}`, 105, 40, { align: "center" });

  doc.setDrawColor(41, 128, 185);
  doc.setLineWidth(0.5);
  doc.line(14, 45, 196, 45);

  // --- Invoice Title ---
  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("MEAL PAYMENT RECEIPT", 105, 55, { align: "center" });

  doc.setDrawColor(200);
  doc.line(14, 60, 196, 60);

  // --- Invoice Info Box ---
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Invoice No:`, 14, 68);
  doc.text(`Date:`, 150, 68);
  
  doc.setFont("helvetica", "normal");
  doc.text(`#INV-${data.invoiceId}`, 45, 68);
  doc.text(dateStr, 175, 68);

  // --- Student & Payment Info with Box ---
  doc.setDrawColor(220, 220, 220);
  doc.setFillColor(248, 249, 250);
  doc.roundedRect(14, 75, 182, 45, 2, 2, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("STUDENT INFORMATION", 20, 85);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Name: ${data.studentName}`, 20, 95);
  doc.text(`Roll/ID: ${data.rollNumber || "N/A"}`, 20, 103);
  doc.text(`Class/Section: ${data.monthLabel.split(' ')[0] || "N/A"}`, 20, 111);
  
  doc.setFont("helvetica", "bold");
  doc.text("BILLING INFO", 130, 85);
  doc.setFont("helvetica", "normal");
  doc.text(`Month: ${data.monthLabel}`, 130, 95);
  doc.text(`Payment Method: ${data.paymentMethod}`, 130, 103);
  doc.text(`Status: ${data.netDue <= 0 ? "PAID" : "PARTIAL"}`, 130, 111);

  // --- Meal Breakdown Table ---
  const tableHeaders = [["Sl.", "Meal Type", "Quantity", "Rate (TK)", "Total (TK)"]];
  const tableBody = data.breakdown.map((item, index) => [
    (index + 1).toString(),
    item.mealTypeName,
    item.count.toString(),
    item.rate.toFixed(2),
    item.total.toFixed(2),
  ]);

  autoTable(doc, {
    startY: 130,
    head: tableHeaders,
    body: tableBody,
    theme: "grid",
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: "bold",
      halign: "center",
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 4,
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 15 },
      1: { cellWidth: 60 },
      2: { halign: "center", cellWidth: 25 },
      3: { halign: "right", cellWidth: 35 },
      4: { halign: "right", cellWidth: 40 },
    },
    margin: { left: 14, right: 14 },
  });

  // --- Summary Section ---
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  // Summary Box
  doc.setDrawColor(41, 128, 185);
  doc.setFillColor(245, 250, 255);
  doc.roundedRect(110, finalY, 86, 35, 2, 2, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("PAYMENT SUMMARY", 115, finalY + 8);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Gross Amount:", 115, finalY + 17);
  doc.text(`৳ ${data.breakdown.reduce((sum, i) => sum + i.total, 0).toFixed(2)}`, 175, finalY + 17, { align: "right" });
  
  doc.text("Amount Paid:", 115, finalY + 25);
  doc.text(`৳ ${data.amountPaid.toFixed(2)}`, 175, finalY + 25, { align: "right" });
  
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 185);
  doc.text("Remaining Due:", 115, finalY + 33);
  doc.text(`৳ ${data.netDue.toFixed(2)}`, 175, finalY + 33, { align: "right" });
  
  // If fully paid, show a badge
  if (data.netDue <= 0.01) {
    doc.setFontSize(14);
    doc.setTextColor(39, 174, 96);
    doc.setFont("helvetica", "bold");
    doc.text("✓ FULLY PAID", 60, finalY + 22);
  }

  // --- Footer Notes ---
  const footerY = finalY + 50;
  doc.setDrawColor(200);
  doc.line(14, footerY - 10, 196, footerY - 10);
  
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.setFont("helvetica", "italic");
  doc.text("This is a computer generated receipt. No signature required.", 105, footerY, { align: "center" });
  doc.text("Thank you for your payment!", 105, footerY + 6, { align: "center" });
  
  // --- QR Code-like barcode (optional decorative) ---
  doc.setFont("courier", "normal");
  doc.setFontSize(7);
  doc.setTextColor(150);
  const barcodeText = `*INV${data.invoiceId}${Date.now()}*`;
  doc.text(barcodeText, 105, footerY + 15, { align: "center" });

  // Download the PDF
  const fileName = `Invoice_${data.studentName.replace(/\s/g, '_')}_${data.monthLabel.replace(/\s/g, '_')}.pdf`;
  doc.save(fileName);
};