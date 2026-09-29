"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AdmissionPdfDownloadButton from "@/components/admission/AdmissionPdfDownloadButton";
import {
  ApplicationStatusBadge,
  PaymentStatusBadge,
} from "@/components/admission/StatusBadges";
import type { AdmissionApplicationStatus, AdmissionPaymentStatus } from "@prisma/client";

export type ApplicationPreviewData = {
  school: {
    schoolName: string;
    address: string | null;
    phone: string | null;
    email: string | null;
  };
  applicationNumber: string;
  verificationCode: string | null;
  studentName: string;
  studentNameBangla: string | null;
  surname: string;
  dateOfBirth: string;
  ageLabel: string;
  gender: string;
  bloodGroup: string;
  religion: string | null;
  nationality: string | null;
  birthCertificateNumber: string | null;
  studentPhoto: string | null;
  fatherName: string;
  fatherMobile: string;
  fatherOccupation: string | null;
  motherName: string | null;
  motherMobile: string | null;
  motherOccupation: string | null;
  guardianName: string | null;
  guardianMobile: string | null;
  guardianRelation: string | null;
  presentAddress: string;
  permanentAddress: string | null;
  division: string | null;
  district: string | null;
  upazila: string | null;
  villageArea: string | null;
  previousSchool: string | null;
  previousClass: string | null;
  previousResult: string | null;
  previousSchoolAddress: string | null;
  transferCertificateNumber: string | null;
  medicalInfo: string | null;
  applicationStatus: AdmissionApplicationStatus;
  paymentStatus: AdmissionPaymentStatus;
  admissionNumber: string | null;
  admissionSession: string;
  applyingClass: string;
  admissionFee: number;
  contactMobile: string;
  submittedAt: string;
  documents: Array<{
    id: number;
    documentType: string;
    fileName: string | null;
    fileUrl: string;
  }>;
  hasVerifiedPayment: boolean;
  hasInvoice: boolean;
  isConfirmed: boolean;
};

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <p className="text-sm">
      <span className="font-medium text-muted-foreground">{label}: </span>
      {value}
    </p>
  );
}

export default function ApplicationPreviewClient({
  data,
  schoolSlug,
  schoolBasePath,
  accessMobile,
  verificationCode,
}: {
  data: ApplicationPreviewData;
  schoolSlug: string;
  schoolBasePath: string;
  accessMobile?: string;
  verificationCode?: string;
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{data.school.schoolName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          {data.school.address && <p>{data.school.address}</p>}
          {(data.school.phone || data.school.email) && (
            <p>
              {[data.school.phone, data.school.email].filter(Boolean).join(" | ")}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Application Number: {data.applicationNumber}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            {data.studentPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.studentPhoto}
                alt={data.studentName}
                className="h-28 w-28 rounded-xl border object-cover"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-xl border bg-muted text-sm">
                No Photo
              </div>
            )}
            <div className="space-y-2">
              <h2 className="text-xl font-bold">{data.studentName}</h2>
              {data.studentNameBangla && (
                <p className="text-lg">{data.studentNameBangla}</p>
              )}
              <div className="flex flex-wrap gap-2">
                <ApplicationStatusBadge status={data.applicationStatus} />
                <PaymentStatusBadge status={data.paymentStatus} />
              </div>
              <InfoRow label="Age" value={data.ageLabel} />
              <InfoRow label="Applying Class" value={data.applyingClass} />
              <InfoRow label="Session" value={data.admissionSession} />
            </div>
          </div>

          <section className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <h3 className="font-semibold">Student Information</h3>
              <InfoRow label="Surname" value={data.surname} />
              <InfoRow
                label="Date of Birth"
                value={new Date(data.dateOfBirth).toLocaleDateString("en-GB")}
              />
              <InfoRow label="Gender" value={data.gender === "FEMALE" ? "Female" : "Male"} />
              <InfoRow label="Blood Group" value={data.bloodGroup} />
              <InfoRow label="Religion" value={data.religion} />
              <InfoRow label="Nationality" value={data.nationality} />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Parent / Guardian</h3>
              <InfoRow label="Father" value={`${data.fatherName} (${data.fatherMobile})`} />
              <InfoRow label="Mother" value={data.motherName} />
              <InfoRow label="Guardian" value={data.guardianName} />
              <InfoRow label="Guardian Relation" value={data.guardianRelation} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <h3 className="font-semibold">Address</h3>
              <InfoRow label="Present" value={data.presentAddress} />
              <InfoRow label="Permanent" value={data.permanentAddress} />
              <InfoRow
                label="Location"
                value={[data.division, data.district, data.upazila, data.villageArea]
                  .filter(Boolean)
                  .join(", ")}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <h3 className="font-semibold">Academic Information</h3>
              <InfoRow label="Previous School" value={data.previousSchool} />
              <InfoRow label="Previous Class" value={data.previousClass} />
              <InfoRow label="Previous Result" value={data.previousResult} />
            </div>
          </section>

          <div className="flex flex-wrap gap-2 border-t pt-4">
            <AdmissionPdfDownloadButton
              schoolSlug={schoolSlug}
              applicationNumber={data.applicationNumber}
              type="application"
              label="Download Application PDF"
              mobile={accessMobile}
              verificationCode={verificationCode ?? data.verificationCode ?? undefined}
            />
            {data.hasInvoice && (
              <AdmissionPdfDownloadButton
                schoolSlug={schoolSlug}
                applicationNumber={data.applicationNumber}
                type="invoice"
                label="Download Payment Invoice"
                mobile={accessMobile}
                verificationCode={verificationCode ?? data.verificationCode ?? undefined}
              />
            )}
            {data.isConfirmed && (
              <AdmissionPdfDownloadButton
                schoolSlug={schoolSlug}
                applicationNumber={data.applicationNumber}
                type="confirmation"
                label="Download Admission Confirmation"
                mobile={accessMobile}
                verificationCode={verificationCode ?? data.verificationCode ?? undefined}
              />
            )}
            {!data.hasVerifiedPayment && data.paymentStatus !== "VERIFIED" && (
              <Button asChild>
                <Link
                  href={`${schoolBasePath}/admission/payment?applicationNumber=${encodeURIComponent(data.applicationNumber)}`}
                >
                  Pay Admission Fee (৳{data.admissionFee.toLocaleString("en-BD")})
                </Link>
              </Button>
            )}
            <Button asChild variant="secondary">
              <Link href={`${schoolBasePath}/admission/search`}>Search Another Application</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
