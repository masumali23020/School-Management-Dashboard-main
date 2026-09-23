import type jsPDF from "jspdf";
import { calculateAgeFromDOB, formatDateEnGB } from "@/lib/admission/age";
import { generateBarcodeDataUrl, loadImageDataUrl, loadSchoolLogoDataUrl } from "./pdf-assets";
import {
  createA4Pdf,
  drawInfoGridWithPhoto,
  drawPremiumHeader,
  drawResultSubtitle,
  drawResultTable,
  drawSignatureBlock,
  PDF_CONTENT_WIDTH,
  pdfToBuffer,
  type SchoolPdfInfo,
} from "./pdf-base";

export type ApplicationPdfData = {
  school: SchoolPdfInfo;
  applicationNumber: string;
  admissionSession: string;
  applyingClass: string;
  verificationUrl?: string;
  student: {
    name: string;
    nameBangla?: string | null;
    dateOfBirth: Date | string;
    gender: string;
    bloodGroup: string;
    religion?: string | null;
    nationality?: string | null;
    birthCertificateNumber?: string | null;
    photoUrl?: string | null;
  };
  father: {
    name: string;
    mobile: string;
    occupation?: string | null;
  };
  mother: {
    name?: string | null;
    mobile?: string | null;
    occupation?: string | null;
  };
  guardian: {
    name?: string | null;
    mobile?: string | null;
    relation?: string | null;
  };
  address: {
    present: string;
    permanent?: string | null;
    division?: string | null;
    district?: string | null;
    upazila?: string | null;
    villageArea?: string | null;
  };
  academic: {
    previousSchool?: string | null;
    previousClass?: string | null;
    previousResult?: string | null;
    previousSchoolAddress?: string | null;
    transferCertificateNumber?: string | null;
    medicalInfo?: string | null;
  };
  documents: Array<{ label: string; fileName?: string | null }>;
};

function genderLabel(g: string) {
  return g === "FEMALE" ? "Female" : "Male";
}

async function renderApplicationPdfContent(doc: jsPDF, data: ApplicationPdfData): Promise<void> {
  const age = calculateAgeFromDOB(data.student.dateOfBirth);
  const [logoDataUrl, photoDataUrl, barcodeDataUrl] = await Promise.all([
    loadSchoolLogoDataUrl(data.school.logoUrl),
    data.student.photoUrl ? loadImageDataUrl(data.student.photoUrl) : Promise.resolve(null),
    generateBarcodeDataUrl(data.applicationNumber),
  ]);

  let y = drawPremiumHeader(
    doc,
    data.school,
    `Admission Application — Session ${data.admissionSession}`,
    logoDataUrl
  );

  y = drawResultSubtitle(doc, y, "Candidate Admission Profile / আবেদনপত্র");

  y = drawInfoGridWithPhoto(
    doc,
    [
      ["Student Name", data.student.name],
      ["Name (Bangla)", data.student.nameBangla ?? "—"],
      ["Application No", data.applicationNumber],
      ["Applying Class", data.applyingClass],
      ["Father Name", data.father.name],
      ["Mother Name", data.mother.name ?? "—"],
      ["Date of Birth", formatDateEnGB(data.student.dateOfBirth)],
      ["Age", age.label],
    ],
    y,
    photoDataUrl,
    barcodeDataUrl,
    data.applicationNumber
  );

  y = drawResultTable(
    doc,
    ["Field / তথ্য", "Details / বিবরণ"],
    [
      ["Gender", genderLabel(data.student.gender)],
      ["Blood Group", data.student.bloodGroup],
      ["Religion", data.student.religion ?? "—"],
      ["Nationality", data.student.nationality ?? "Bangladeshi"],
      ["Birth Certificate", data.student.birthCertificateNumber ?? "—"],
      ["Father Mobile", data.father.mobile],
      ["Guardian", data.guardian.name ?? "—"],
      ["Guardian Mobile", data.guardian.mobile ?? "—"],
    ],
    y,
    [62, PDF_CONTENT_WIDTH - 62]
  );

  if (y > 230) {
    doc.addPage();
    y = 20;
  }

  y = drawResultTable(
    doc,
    ["Address", "Information"],
    [
      ["Present Address", data.address.present],
      ["Permanent Address", data.address.permanent ?? data.address.present],
      ["Division", data.address.division ?? "—"],
      ["District", data.address.district ?? "—"],
      ["Upazila", data.address.upazila ?? "—"],
      ["Village / Area", data.address.villageArea ?? "—"],
    ],
    y,
    [62, PDF_CONTENT_WIDTH - 62]
  );

  y = drawResultTable(
    doc,
    ["Academic Information", "Details"],
    [
      ["Previous School", data.academic.previousSchool ?? "—"],
      ["Previous Class", data.academic.previousClass ?? "—"],
      ["Previous Result", data.academic.previousResult ?? "—"],
      ["Transfer Certificate", data.academic.transferCertificateNumber ?? "—"],
      ["Medical / Other", data.academic.medicalInfo ?? "—"],
    ],
    y,
    [62, PDF_CONTENT_WIDTH - 62]
  );

  if (data.documents.length > 0) {
    y = drawResultTable(
      doc,
      ["S.L", "Document", "File"],
      data.documents.map((d, i) => [String(i + 1), d.label, d.fileName ?? "Attached"]),
      y,
      [12, 88, PDF_CONTENT_WIDTH - 100]
    );
  }

  if (y > 248) {
    doc.addPage();
    y = 20;
  }

  drawSignatureBlock(doc, y, data.applicationNumber, data.verificationUrl, barcodeDataUrl);
}

export async function renderApplicationPdf(data: ApplicationPdfData): Promise<Buffer> {
  const doc = createA4Pdf();
  await renderApplicationPdfContent(doc, data);
  return pdfToBuffer(doc);
}
