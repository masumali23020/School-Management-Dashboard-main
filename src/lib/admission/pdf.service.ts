import {
  documentTypeLabel,
  fetchApplicationByNumber,
} from "@/lib/admission/application.service";
import { ensureAdmissionInvoice, fetchLatestAdmissionInvoice } from "@/lib/admission/invoice.service";
import { buildVerificationUrl } from "@/lib/admission/access";
import { renderApplicationPdf } from "@/lib/admission/pdf/application-pdf";
import { renderConfirmationPdf } from "@/lib/admission/pdf/confirmation-pdf";
import { renderPaymentInvoicePdf } from "@/lib/admission/pdf/invoice-pdf";

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
}

function schoolPdfInfo(school: {
  schoolName: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  establishedYear?: string | null;
}) {
  return {
    name: school.schoolName,
    address: school.address,
    phone: school.phone,
    email: school.email,
    logoUrl: school.logoUrl,
    establishedYear: school.establishedYear ?? null,
  };
}

export async function generateApplicationPdfBuffer(
  schoolId: number,
  applicationNumber: string
): Promise<Buffer | null> {
  const app = await fetchApplicationByNumber(schoolId, applicationNumber);
  if (!app) return null;

  const verificationUrl = buildVerificationUrl(
    getBaseUrl(),
    app.school.slug,
    app.applicationNumber
  );

  return renderApplicationPdf({
    school: schoolPdfInfo(app.school),
    applicationNumber: app.applicationNumber,
    admissionSession: app.admissionSession.name,
    applyingClass: `${app.admissionClass.class.name} (Grade ${app.admissionClass.class.grade.level})`,
    verificationUrl,
    student: {
      name: app.studentName,
      nameBangla: app.studentNameBangla,
      dateOfBirth: app.dateOfBirth,
      gender: app.gender,
      bloodGroup: app.bloodGroup,
      religion: app.religion,
      nationality: app.nationality,
      birthCertificateNumber: app.birthCertificateNumber,
      photoUrl: app.studentPhoto,
    },
    father: {
      name: app.fatherName,
      mobile: app.fatherMobile,
      occupation: app.fatherOccupation,
    },
    mother: {
      name: app.motherName,
      mobile: app.motherMobile,
      occupation: app.motherOccupation,
    },
    guardian: {
      name: app.guardianName,
      mobile: app.guardianMobile,
      relation: app.guardianRelation,
    },
    address: {
      present: app.presentAddress,
      permanent: app.permanentAddress,
      division: app.division,
      district: app.district,
      upazila: app.upazila,
      villageArea: app.villageArea,
    },
    academic: {
      previousSchool: app.previousSchool,
      previousClass: app.previousClass,
      previousResult: app.previousResult,
      previousSchoolAddress: app.previousSchoolAddress,
      transferCertificateNumber: app.transferCertificateNumber,
      medicalInfo: app.medicalInfo,
    },
    documents: app.documents.map((d) => ({
      label: documentTypeLabel(d.documentType),
      fileName: d.fileName,
    })),
  });
}

export async function generateInvoicePdfBuffer(
  schoolId: number,
  applicationNumber: string
): Promise<Buffer | null> {
  const app = await fetchApplicationByNumber(schoolId, applicationNumber);
  if (!app) return null;

  const verifiedPayment = app.payments.find((p) => p.status === "VERIFIED");
  if (!verifiedPayment) return null;

  const invoice = await ensureAdmissionInvoice(app.id, schoolId);
  if (!invoice) return null;

  const verificationUrl = buildVerificationUrl(
    getBaseUrl(),
    app.school.slug,
    app.applicationNumber
  );

  return renderPaymentInvoicePdf({
    school: schoolPdfInfo(app.school),
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.issuedAt,
    applicationNumber: app.applicationNumber,
    admissionSession: app.admissionSession.name,
    paymentStatus: "VERIFIED",
    student: {
      name: app.studentName,
      applyingClass: `${app.admissionClass.class.name} (Grade ${app.admissionClass.class.grade.level})`,
      guardianName: app.guardianName ?? app.fatherName,
      mobile: app.guardianMobile ?? app.fatherMobile,
    },
    payment: {
      description: "Admission Fee",
      amount: Number(verifiedPayment.amount),
      method: verifiedPayment.paymentMethod.replace(/_/g, " "),
      senderMobile: verifiedPayment.senderMobile,
      transactionId: verifiedPayment.transactionId,
      paymentDate: verifiedPayment.createdAt,
      verifiedDate: verifiedPayment.verifiedAt,
    },
    verificationUrl,
  });
}

export async function generateConfirmationPdfBuffer(
  schoolId: number,
  applicationNumber: string
): Promise<Buffer | null> {
  const app = await fetchApplicationByNumber(schoolId, applicationNumber);
  if (!app || app.applicationStatus !== "CONFIRMED" || !app.admissionNumber) {
    return null;
  }

  const verificationUrl = buildVerificationUrl(
    getBaseUrl(),
    app.school.slug,
    app.applicationNumber
  );

  return renderConfirmationPdf({
    school: schoolPdfInfo(app.school),
    studentName: app.studentName,
    admissionNumber: app.admissionNumber,
    applicationNumber: app.applicationNumber,
    applyingClass: `${app.admissionClass.class.name} (Grade ${app.admissionClass.class.grade.level})`,
    admissionSession: app.admissionSession.name,
    guardianName: app.guardianName ?? app.fatherName,
    admissionDate: app.admissionConfirmedAt ?? app.updatedAt,
    verificationUrl,
  });
}

export async function assertApplicationAccess(input: {
  schoolId: number;
  applicationNumber: string;
  mobile?: string;
  verificationCode?: string;
  adminSchoolId?: number;
}) {
  if (input.adminSchoolId !== undefined && input.adminSchoolId === input.schoolId) {
    return fetchApplicationByNumber(input.schoolId, input.applicationNumber);
  }

  const app = await fetchApplicationByNumber(input.schoolId, input.applicationNumber);
  if (!app) return null;

  const codeOk =
    input.verificationCode &&
    app.verificationCode &&
    input.verificationCode === app.verificationCode;
  const { mobileMatchesApplication } = await import("@/lib/admission/access");
  const mobileOk =
    input.mobile && mobileMatchesApplication(input.mobile, app);

  if (!codeOk && !mobileOk) return null;
  return app;
}
