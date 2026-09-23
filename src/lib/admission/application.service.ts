import prisma from "@/lib/db";
import { mobileMatchesApplication } from "@/lib/admission/access";
import { calculateAgeFromDOB } from "@/lib/admission/age";
import {
  formatApplicationStatus,
  getContactMobile,
  getSchoolIdFromSlug,
} from "@/lib/admission/utils";
import { hasVerifiedAdmissionInvoice } from "@/lib/admission/invoice.service";

const applicationInclude = {
  school: {
    select: {
      id: true,
      slug: true,
      schoolName: true,
      address: true,
      phone: true,
      email: true,
      logoUrl: true,
      establishedYear: true,
    },
  },
  admissionSession: true,
  admissionClass: { include: { class: { include: { grade: true } } } },
  documents: true,
  payments: { orderBy: { createdAt: "desc" as const } },
} as const;

export async function fetchApplicationByNumber(
  schoolId: number,
  applicationNumber: string
) {
  return prisma.admissionApplication.findFirst({
    where: { schoolId, applicationNumber },
    include: applicationInclude,
  });
}

export type PublicApplicationSummary = {
  applicationNumber: string;
  studentName: string;
  studentPhoto: string | null;
  applyingClass: string;
  admissionSession: string;
  applicationStatus: string;
  paymentStatus: string;
  admissionNumber: string | null;
  applicationDate: string;
  ageLabel: string;
  canDownloadApplicationPdf: boolean;
  canDownloadInvoice: boolean;
  canDownloadConfirmation: boolean;
};

export async function searchPublicApplication(input: {
  schoolSlug: string;
  applicationNumber: string;
  mobile: string;
}): Promise<
  | { ok: true; data: PublicApplicationSummary }
  | { ok: false; message: string }
> {
  const schoolId = await getSchoolIdFromSlug(input.schoolSlug);
  if (!schoolId) return { ok: false, message: "School not found." };

  const app = await fetchApplicationByNumber(schoolId, input.applicationNumber.trim());
  if (!app) return { ok: false, message: "Application not found." };

  if (!mobileMatchesApplication(input.mobile, app)) {
    return { ok: false, message: "Application number and mobile do not match." };
  }

  const verifiedPayment = app.payments.find((p) => p.status === "VERIFIED");
  const age = calculateAgeFromDOB(app.dateOfBirth);
  const hasInvoice = verifiedPayment
    ? await hasVerifiedAdmissionInvoice(app.id, schoolId)
    : false;

  return {
    ok: true,
    data: {
      applicationNumber: app.applicationNumber,
      studentName: app.studentName,
      studentPhoto: app.studentPhoto,
      applyingClass: `${app.admissionClass.class.name} (Grade ${app.admissionClass.class.grade.level})`,
      admissionSession: app.admissionSession.name,
      applicationStatus: app.applicationStatus,
      paymentStatus: app.paymentStatus,
      admissionNumber: app.admissionNumber,
      applicationDate: app.submittedAt.toISOString(),
      ageLabel: age.label,
      canDownloadApplicationPdf: true,
      canDownloadInvoice: hasInvoice,
      canDownloadConfirmation: app.applicationStatus === "CONFIRMED" && Boolean(app.admissionNumber),
    },
  };
}

export async function getVerifiedApplicationPreview(input: {
  schoolSlug: string;
  applicationNumber: string;
  mobile?: string;
  verificationCode?: string;
}) {
  const schoolId = await getSchoolIdFromSlug(input.schoolSlug);
  if (!schoolId) return null;

  const app = await fetchApplicationByNumber(schoolId, input.applicationNumber.trim());
  if (!app) return null;

  const codeOk =
    input.verificationCode &&
    app.verificationCode &&
    input.verificationCode === app.verificationCode;
  const mobileOk =
    input.mobile && mobileMatchesApplication(input.mobile, app);

  if (!codeOk && !mobileOk) return null;

  const age = calculateAgeFromDOB(app.dateOfBirth);
  const verifiedPayment = app.payments.find((p) => p.status === "VERIFIED");
  const hasInvoice = verifiedPayment
    ? await hasVerifiedAdmissionInvoice(app.id, schoolId)
    : false;

  return {
    school: app.school,
    applicationNumber: app.applicationNumber,
    verificationCode: app.verificationCode,
    studentName: app.studentName,
    studentNameBangla: app.studentNameBangla,
    surname: app.surname,
    dateOfBirth: app.dateOfBirth.toISOString(),
    ageLabel: age.label,
    gender: app.gender,
    bloodGroup: app.bloodGroup,
    religion: app.religion,
    nationality: app.nationality,
    birthCertificateNumber: app.birthCertificateNumber,
    studentPhoto: app.studentPhoto,
    fatherName: app.fatherName,
    fatherMobile: app.fatherMobile,
    fatherOccupation: app.fatherOccupation,
    fatherNid: app.fatherNid,
    motherName: app.motherName,
    motherMobile: app.motherMobile,
    motherOccupation: app.motherOccupation,
    motherNid: app.motherNid,
    guardianName: app.guardianName,
    guardianMobile: app.guardianMobile,
    guardianRelation: app.guardianRelation,
    presentAddress: app.presentAddress,
    permanentAddress: app.permanentAddress,
    division: app.division,
    district: app.district,
    upazila: app.upazila,
    villageArea: app.villageArea,
    previousSchool: app.previousSchool,
    previousClass: app.previousClass,
    previousResult: app.previousResult,
    previousSchoolAddress: app.previousSchoolAddress,
    transferCertificateNumber: app.transferCertificateNumber,
    medicalInfo: app.medicalInfo,
    applicationStatus: app.applicationStatus,
    paymentStatus: app.paymentStatus,
    admissionNumber: app.admissionNumber,
    admissionSession: app.admissionSession.name,
    applyingClass: `${app.admissionClass.class.name} (Grade ${app.admissionClass.class.grade.level})`,
    admissionFee: Number(app.admissionClass.admissionFee),
    contactMobile: getContactMobile(app),
    submittedAt: app.submittedAt.toISOString(),
    documents: app.documents.map((d) => ({
      id: d.id,
      documentType: d.documentType,
      fileName: d.fileName,
      fileUrl: d.fileUrl,
    })),
    hasVerifiedPayment: Boolean(verifiedPayment),
    hasInvoice,
    isConfirmed: app.applicationStatus === "CONFIRMED",
  };
}

export function documentTypeLabel(type: string): string {
  const map: Record<string, string> = {
    STUDENT_PHOTO: "Student Photo",
    BIRTH_CERTIFICATE: "Birth Certificate",
    PREVIOUS_REPORT_CARD: "Previous Report Card",
    NID: "NID",
    OTHER: "Other Document",
  };
  return map[type] ?? type;
}
