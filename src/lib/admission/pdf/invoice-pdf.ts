import type jsPDF from "jspdf";
import { formatDateEnGB } from "@/lib/admission/age";
import { generateBarcodeDataUrl, loadSchoolLogoDataUrl } from "./pdf-assets";
import {
  createA4Pdf,
  drawFooterNote,
  drawInfoGridWithPhoto,
  drawPaidSeal,
  drawPremiumHeader,
  drawResultSignatures,
  drawResultSubtitle,
  drawResultTable,
  drawStampArea,
  drawSummaryBox,
  formatCurrencyBdt,
  PDF_CONTENT_WIDTH,
  PDF_MARGIN,
  PDF_PAGE_WIDTH,
  pdfToBuffer,
  type SchoolPdfInfo,
} from "./pdf-base";

export type PaymentInvoicePdfData = {
  school: SchoolPdfInfo;
  invoiceNumber: string;
  invoiceDate: Date | string;
  applicationNumber: string;
  admissionSession: string;
  paymentStatus: string;
  student: {
    name: string;
    applyingClass: string;
    guardianName: string;
    mobile: string;
  };
  payment: {
    description: string;
    amount: number;
    method: string;
    senderMobile: string;
    transactionId: string;
    paymentDate: Date | string;
    verifiedDate?: Date | string | null;
  };
  verificationUrl?: string;
};

async function renderPaymentInvoiceContent(doc: jsPDF, data: PaymentInvoicePdfData): Promise<void> {
  const [logoDataUrl, barcodeDataUrl] = await Promise.all([
    loadSchoolLogoDataUrl(data.school.logoUrl),
    generateBarcodeDataUrl(data.applicationNumber),
  ]);

  let y = drawPremiumHeader(
    doc,
    data.school,
    `Payment Invoice — Session ${data.admissionSession}`,
    logoDataUrl
  );

  drawPaidSeal(doc, PDF_PAGE_WIDTH - PDF_MARGIN - 14, y - 2);

  y = drawResultSubtitle(doc, y, "Admission Fee Receipt / পেমেন্ট ইনভয়েস");

  y = drawInfoGridWithPhoto(
    doc,
    [
      ["Invoice Number", data.invoiceNumber],
      ["Invoice Date", formatDateEnGB(data.invoiceDate)],
      ["Application No", data.applicationNumber],
      ["Student Name", data.student.name],
      ["Applying Class", data.student.applyingClass],
      ["Guardian Name", data.student.guardianName],
      ["Mobile Number", data.student.mobile],
      ["Payment Status", data.paymentStatus],
    ],
    y,
    null,
    barcodeDataUrl,
    data.applicationNumber
  );

  y = drawResultTable(
    doc,
    ["Description / বিবরণ", "Amount (BDT)", "Status"],
    [
      [data.payment.description, formatCurrencyBdt(data.payment.amount), "Paid"],
      ["Total Paid", formatCurrencyBdt(data.payment.amount), "Verified"],
    ],
    y,
    [88, 40, PDF_CONTENT_WIDTH - 128]
  );

  y = drawSummaryBox(doc, y, [
    { label: "Invoice No", value: data.invoiceNumber },
    { label: "Amount", value: formatCurrencyBdt(data.payment.amount) },
    { label: "Status", value: "PAID", highlight: true },
    { label: "Method", value: data.payment.method.slice(0, 12) },
  ]);

  y = drawResultTable(
    doc,
    ["Payment Field", "Details"],
    [
      ["Payment Method", data.payment.method],
      ["Sender Mobile", data.payment.senderMobile],
      ["Transaction ID", data.payment.transactionId],
      ["Payment Date", formatDateEnGB(data.payment.paymentDate)],
      ["Verified Date", data.payment.verifiedDate ? formatDateEnGB(data.payment.verifiedDate) : "—"],
    ],
    y,
    [62, PDF_CONTENT_WIDTH - 62]
  );

  y = drawStampArea(doc, y, "Official Seal / PAID Verified");
  y = drawResultSignatures(doc, y, ["Cashier", "Accountant", "Principal"]);

  if (barcodeDataUrl) {
    try {
      doc.addImage(barcodeDataUrl, "PNG", PDF_MARGIN, y, 48, 10);
      y += 12;
    } catch {
      // skip
    }
  }

  drawFooterNote(
    doc,
    y,
    `Invoice: ${data.invoiceNumber} | Application: ${data.applicationNumber} | Issued: ${new Date().toLocaleDateString("en-GB")}`
  );
}

export async function renderPaymentInvoicePdf(data: PaymentInvoicePdfData): Promise<Buffer> {
  const doc = createA4Pdf();
  await renderPaymentInvoiceContent(doc, data);
  return pdfToBuffer(doc);
}
