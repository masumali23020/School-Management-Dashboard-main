import { formatDateEnGB } from "@/lib/admission/age";
import {
  createA4Pdf,
  drawFooterNote,
  drawInfoGridWithPhoto,
  drawPremiumHeader,
  drawResultSignatures,
  drawResultSubtitle,
  drawStampArea,
  drawSummaryBox,
  pdfToBuffer,
  type SchoolPdfInfo,
} from "./pdf-base";

export type ConfirmationPdfData = {
  school: SchoolPdfInfo;
  studentName: string;
  admissionNumber: string;
  applicationNumber: string;
  applyingClass: string;
  admissionSession: string;
  guardianName: string;
  admissionDate: Date | string;
  verificationUrl?: string;
};

export function renderConfirmationPdf(data: ConfirmationPdfData): Buffer {
  const doc = createA4Pdf();

  let y = drawPremiumHeader(doc, data.school, `Admission Confirmation — Session ${data.admissionSession}`);
  y = drawResultSubtitle(doc, y, "Admission Confirmation Letter");

  y = drawInfoGridWithPhoto(
    doc,
    [
      ["Student Name", data.studentName],
      ["Admission Number", data.admissionNumber],
      ["Application Number", data.applicationNumber],
      ["Class", data.applyingClass],
      ["Guardian Name", data.guardianName],
      ["Admission Date", formatDateEnGB(data.admissionDate)],
      ["Status", "CONFIRMED"],
    ],
    y,
    null
  );

  y = drawSummaryBox(doc, y, [
    { label: "Admission No", value: data.admissionNumber, highlight: true },
    { label: "Application", value: data.applicationNumber.slice(-8) },
    { label: "Class", value: data.applyingClass.slice(0, 10) },
    { label: "Status", value: "CONFIRMED" },
  ]);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    "Congratulations! The admission of the above candidate has been confirmed.",
    18,
    y + 2
  );
  y += 10;

  y = drawStampArea(doc, y);
  y = drawResultSignatures(doc, y, ["Principal", "Admin", "Guardian"]);
  drawFooterNote(doc, y, `Application No: ${data.applicationNumber} | Issued: ${new Date().toLocaleDateString("en-GB")}`);

  return pdfToBuffer(doc);
}
