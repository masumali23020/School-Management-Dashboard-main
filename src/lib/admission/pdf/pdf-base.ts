import jsPDF from "jspdf";

export type SchoolPdfInfo = {
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logoUrl?: string | null;
  establishedYear?: string | null;
  motto?: string | null;
};

export const PDF_MARGIN = 18;
export const PDF_PAGE_WIDTH = 210;
export const PDF_PAGE_HEIGHT = 297;
export const PDF_CONTENT_WIDTH = PDF_PAGE_WIDTH - PDF_MARGIN * 2;

/** Matches /result ResultSheet theme */
export const COLORS = {
  primary: [26, 58, 92] as [number, number, number],
  gold: [200, 168, 75] as [number, number, number],
  cream: [255, 253, 245] as [number, number, number],
  pageBg: [245, 240, 232] as [number, number, number],
  rowAlt: [249, 247, 242] as [number, number, number],
  text: [34, 34, 34] as [number, number, number],
  muted: [85, 85, 85] as [number, number, number],
  border: [200, 200, 200] as [number, number, number],
  success: [46, 125, 50] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

export function createA4Pdf(): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  doc.setFillColor(...COLORS.pageBg);
  doc.rect(0, 0, PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT, "F");
  return doc;
}

export function pdfToBuffer(doc: jsPDF): Buffer {
  return Buffer.from(doc.output("arraybuffer"));
}

export function drawResultSheetBorder(doc: jsPDF) {
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.9);
  doc.rect(12, 12, PDF_PAGE_WIDTH - 24, PDF_PAGE_HEIGHT - 24);
  doc.setLineWidth(0.25);
  doc.rect(14.5, 14.5, PDF_PAGE_WIDTH - 29, PDF_PAGE_HEIGHT - 29);
}

function drawGoldEmblem(doc: jsPDF, x: number, y: number, r = 6) {
  doc.setFillColor(...COLORS.primary);
  doc.circle(x, y, r, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.gold);
  doc.text("*", x, y + 1.2, { align: "center" });
}

export function drawResultSchoolHeader(
  doc: jsPDF,
  school: SchoolPdfInfo,
  logoDataUrl?: string | null
): number {
  let y = 20;
  const cx = PDF_PAGE_WIDTH / 2;

  drawGoldEmblem(doc, PDF_MARGIN + 8, y + 4);
  drawGoldEmblem(doc, PDF_PAGE_WIDTH - PDF_MARGIN - 8, y + 4);

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", cx - 6, y - 1, 12, 12);
    } catch {
      // skip
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.primary);
  doc.text(school.name.toUpperCase(), cx, y + 3, { align: "center" });

  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  const addressLine = [school.address, school.phone ? `Phone: ${school.phone}` : null]
    .filter(Boolean)
    .join(" | ");
  if (addressLine) {
    doc.text(addressLine, cx, y, { align: "center", maxWidth: PDF_CONTENT_WIDTH - 20 });
    y += 4;
  }
  if (school.motto || school.establishedYear) {
    doc.setTextColor(...COLORS.gold);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "italic");
    doc.text(
      school.motto ?? `Established ${school.establishedYear}`,
      cx,
      y,
      { align: "center", maxWidth: PDF_CONTENT_WIDTH - 20 }
    );
    y += 4;
  }

  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(PDF_MARGIN, y + 2, PDF_PAGE_WIDTH - PDF_MARGIN, y + 2);
  return y + 8;
}

export function drawResultBanner(doc: jsPDF, y: number, text: string): number {
  doc.setFillColor(...COLORS.primary);
  doc.rect(PDF_MARGIN, y, PDF_CONTENT_WIDTH, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...COLORS.white);
  doc.text(text.toUpperCase(), PDF_PAGE_WIDTH / 2, y + 5.2, { align: "center" });
  return y + 11;
}

export function drawResultSubtitle(doc: jsPDF, y: number, text: string): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.primary);
  const tw = doc.getTextWidth(text.toUpperCase());
  doc.text(text.toUpperCase(), PDF_PAGE_WIDTH / 2, y, { align: "center" });
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.25);
  doc.line(PDF_PAGE_WIDTH / 2 - tw / 2, y + 1.5, PDF_PAGE_WIDTH / 2 + tw / 2, y + 1.5);
  return y + 7;
}

export function drawInfoGridWithPhoto(
  doc: jsPDF,
  rows: Array<[string, string]>,
  startY: number,
  photoDataUrl: string | null,
  barcodeDataUrl?: string | null,
  applicationNumber?: string
): number {
  const photoW = 25;
  const photoH = 32;
  const photoX = PDF_PAGE_WIDTH - PDF_MARGIN - photoW;
  const gridW = photoX - PDF_MARGIN - 4;
  const cols = 2;
  const rowH = 5.2;
  const gridH = Math.ceil(rows.length / cols) * rowH + 8;

  doc.setFillColor(...COLORS.cream);
  doc.setDrawColor(...COLORS.gold);
  doc.setLineWidth(0.35);
  doc.rect(PDF_MARGIN, startY, gridW, gridH, "FD");

  let row = 0;
  let col = 0;
  rows.forEach(([label, value]) => {
    const x = PDF_MARGIN + 3 + col * (gridW / 2);
    const y = startY + 5 + row * rowH;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.primary);
    doc.text(`${label}:`, x, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.text);
    const lines = doc.splitTextToSize(value || "—", gridW / 2 - 28);
    doc.text(lines[0] ?? "—", x + 26, y);
    col += 1;
    if (col >= cols) {
      col = 0;
      row += 1;
    }
  });

  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.3);
  doc.rect(photoX, startY, photoW, photoH);
  if (photoDataUrl) {
    try {
      doc.addImage(photoDataUrl, "JPEG", photoX + 0.3, startY + 0.3, photoW - 0.6, photoH - 0.6);
    } catch {
      try {
        doc.addImage(photoDataUrl, "PNG", photoX + 0.3, startY + 0.3, photoW - 0.6, photoH - 0.6);
      } catch {
        drawPhotoPlaceholder(doc, photoX, startY, photoW, photoH);
      }
    }
  } else {
    drawPhotoPlaceholder(doc, photoX, startY, photoW, photoH);
  }

  if (barcodeDataUrl) {
    try {
      doc.addImage(barcodeDataUrl, "PNG", photoX - 1, startY + photoH + 2, photoW + 2, 9);
    } catch {
      if (applicationNumber) {
        doc.setFontSize(7);
        doc.text(applicationNumber, photoX + photoW / 2, startY + photoH + 7, { align: "center" });
      }
    }
  }

  return startY + Math.max(gridH, photoH + (barcodeDataUrl ? 12 : 2)) + 5;
}

function drawPhotoPlaceholder(doc: jsPDF, x: number, y: number, w: number, h: number) {
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text("Photo", x + w / 2, y + h / 2, { align: "center" });
}

export function drawResultTable(
  doc: jsPDF,
  headers: string[],
  rows: string[][],
  startY: number,
  colWidths: number[]
): number {
  const rowH = 6.5;
  let y = startY;
  let x = PDF_MARGIN;

  doc.setFillColor(...COLORS.primary);
  doc.rect(PDF_MARGIN, y, PDF_CONTENT_WIDTH, rowH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.white);

  headers.forEach((h, i) => {
    if (i === 0) doc.text(h, x + 2, y + 4.2);
    else doc.text(h, x + colWidths[i] / 2, y + 4.2, { align: "center" });
    x += colWidths[i];
  });
  y += rowH;

  rows.forEach((row, idx) => {
    const bg = idx % 2 === 0 ? COLORS.white : COLORS.rowAlt;
    doc.setFillColor(...bg);
    doc.rect(PDF_MARGIN, y, PDF_CONTENT_WIDTH, rowH, "F");
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.12);
    doc.rect(PDF_MARGIN, y, PDF_CONTENT_WIDTH, rowH, "S");

    x = PDF_MARGIN;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.text);

    row.forEach((cell, i) => {
      if (i === 0) {
        doc.setFont("helvetica", "bold");
        doc.text(cell.slice(0, 38), x + 2, y + 4.2);
        doc.setFont("helvetica", "normal");
      } else {
        doc.text(cell, x + colWidths[i] / 2, y + 4.2, { align: "center" });
      }
      x += colWidths[i];
    });
    y += rowH;
  });

  return y + 4;
}

export function drawSummaryBox(
  doc: jsPDF,
  y: number,
  items: Array<{ label: string; value: string; highlight?: boolean }>
): number {
  const cellW = PDF_CONTENT_WIDTH / items.length;
  const boxH = 14;

  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.rect(PDF_MARGIN, y, PDF_CONTENT_WIDTH, boxH);

  items.forEach((item, i) => {
    const x = PDF_MARGIN + i * cellW;
    if (i > 0) {
      doc.line(x, y, x, y + boxH);
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...COLORS.muted);
    doc.text(item.label.toUpperCase(), x + cellW / 2, y + 4.5, { align: "center" });
    doc.setFontSize(item.highlight ? 14 : 11);
    doc.setTextColor(...(item.highlight ? COLORS.gold : COLORS.primary));
    doc.text(item.value, x + cellW / 2, y + 11, { align: "center" });
  });

  return y + boxH + 5;
}

export function drawStampArea(doc: jsPDF, y: number, text = "Official Seal / সিলমোহর"): number {
  doc.setFillColor(...COLORS.pageBg);
  doc.setDrawColor(...COLORS.gold);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.rect(PDF_MARGIN, y, PDF_CONTENT_WIDTH, 10, "FD");
  doc.setLineDashPattern([], 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(136, 136, 136);
  doc.text(text, PDF_PAGE_WIDTH / 2, y + 6, { align: "center" });
  return y + 13;
}

export function drawResultSignatures(doc: jsPDF, y: number, labels: string[]): number {
  const colW = PDF_CONTENT_WIDTH / labels.length;
  labels.forEach((label, i) => {
    const x = PDF_MARGIN + i * colW + colW / 2;
    doc.setDrawColor(51, 51, 51);
    doc.setLineWidth(0.2);
    doc.line(x - 18, y + 8, x + 18, y + 8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.primary);
    doc.text(label.toUpperCase(), x, y + 12, { align: "center" });
  });
  return y + 16;
}

export function drawPaidSeal(doc: jsPDF, x: number, y: number) {
  doc.setDrawColor(...COLORS.success);
  doc.setLineWidth(0.9);
  doc.circle(x, y, 13);
  doc.setLineWidth(0.35);
  doc.circle(x, y, 10.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.success);
  doc.text("PAID", x, y - 0.5, { align: "center" });
  doc.setFontSize(6);
  doc.text("VERIFIED", x, y + 4, { align: "center" });
  doc.setLineWidth(0.25);
  doc.line(x - 8, y - 8, x + 8, y + 8);
  doc.line(x - 8, y + 8, x + 8, y - 8);
}

export function drawFooterNote(doc: jsPDF, y: number, text: string) {
  doc.setDrawColor(...COLORS.border);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(PDF_MARGIN, y, PDF_PAGE_WIDTH - PDF_MARGIN, y);
  doc.setLineDashPattern([], 0);
  doc.setFontSize(6.5);
  doc.setTextColor(136, 136, 136);
  doc.text(text, PDF_PAGE_WIDTH / 2, y + 4, { align: "center" });
}

export function formatCurrencyBdt(amount: number | string): string {
  return `৳${Number(amount).toLocaleString("en-BD", { minimumFractionDigits: 0 })}`;
}

// Legacy aliases
export function drawSchoolHeader(doc: jsPDF, school: SchoolPdfInfo, subtitle?: string): number {
  const y = drawResultSchoolHeader(doc, school);
  if (subtitle) return drawResultSubtitle(doc, y, subtitle);
  return y;
}

export function drawSectionTitle(doc: jsPDF, title: string, y: number): number {
  return drawResultSubtitle(doc, y, title);
}

export function drawKeyValueRows(
  doc: jsPDF,
  rows: Array<[string, string]>,
  startY: number,
  colLabelWidth = 52
): number {
  let y = startY;
  rows.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.primary);
    doc.text(`${label}:`, PDF_MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.text);
    doc.text(value || "—", PDF_MARGIN + colLabelWidth, y);
    y += 5;
  });
  return y + 2;
}

export function drawHorizontalRule(doc: jsPDF, y: number) {
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.35);
  doc.line(PDF_MARGIN, y, PDF_PAGE_WIDTH - PDF_MARGIN, y);
}

export function drawSignatureBlock(
  doc: jsPDF,
  y: number,
  applicationNumber: string,
  verificationUrl?: string,
  barcodeDataUrl?: string | null
): number {
  y = drawStampArea(doc, y);
  y = drawResultSignatures(doc, y, ["Applicant", "Guardian", "Date"]);
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
    `Application No: ${applicationNumber}${verificationUrl ? " | Verify online" : ""} | Issued: ${new Date().toLocaleDateString("en-GB")}`
  );
  return y + 8;
}

export function drawPremiumHeader(
  doc: jsPDF,
  school: SchoolPdfInfo,
  title: string,
  logoDataUrl?: string | null
): number {
  drawResultSheetBorder(doc);
  let y = drawResultSchoolHeader(doc, school, logoDataUrl);
  y = drawResultBanner(doc, y, title);
  return y;
}

export function drawTranscriptHeader(
  doc: jsPDF,
  school: SchoolPdfInfo,
  title: string,
  logoDataUrl?: string | null
): number {
  return drawPremiumHeader(doc, school, title, logoDataUrl);
}

export function drawPageBorder(doc: jsPDF) {
  drawResultSheetBorder(doc);
}

export function drawLabelValueLines(
  doc: jsPDF,
  rows: Array<[string, string]>,
  startY: number
): number {
  return drawKeyValueRows(doc, rows, startY);
}

export function drawSectionCard(
  doc: jsPDF,
  title: string,
  rows: Array<[string, string]>,
  startY: number
): number {
  let y = drawResultSubtitle(doc, startY, title);
  y = drawResultTable(
    doc,
    ["Field", "Details"],
    rows,
    y,
    [58, PDF_CONTENT_WIDTH - 58]
  );
  return y;
}

export function drawTranscriptTable(
  doc: jsPDF,
  headers: string[],
  rows: string[][],
  startY: number,
  colWidths: number[]
): number {
  return drawResultTable(doc, headers, rows, startY, colWidths);
}
