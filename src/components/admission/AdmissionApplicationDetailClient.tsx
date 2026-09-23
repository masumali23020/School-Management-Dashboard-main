"use client";

import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ApplicationStatusBadge,
  PaymentStatusBadge,
} from "@/components/admission/StatusBadges";
import AdmissionPdfDownloadButton from "@/components/admission/AdmissionPdfDownloadButton";
import { calculateAgeFromDOB } from "@/lib/admission/age";
import {
  processAdmissionApplication,
  verifyAdmissionPayment,
} from "@/Actions/admission/admission.actions";
import type {
  AdmissionApplicationStatus,
  AdmissionDocumentType,
  AdmissionPaymentStatus,
} from "@prisma/client";

type Detail = {
  id: number;
  applicationNumber: string;
  studentName: string;
  studentNameBangla: string | null;
  surname: string;
  dateOfBirth: string | Date;
  gender: string;
  bloodGroup: string;
  fatherName: string;
  fatherMobile: string;
  motherName: string | null;
  motherMobile: string | null;
  guardianName: string | null;
  guardianMobile: string | null;
  presentAddress: string;
  permanentAddress: string | null;
  previousSchool: string | null;
  previousClass: string | null;
  previousResult: string | null;
  applicationStatus: AdmissionApplicationStatus;
  paymentStatus: AdmissionPaymentStatus;
  contactMobile: string;
  studentPhoto: string | null;
  admissionClass: {
    class: { name: string; grade: { level: number } };
    admissionFee: string | number;
  };
  admissionSession: { name: string; academicYear: string };
  payments: Array<{
    id: number;
    amount: string | number;
    senderMobile: string;
    transactionId: string;
    status: AdmissionPaymentStatus;
    createdAt: string | Date;
    rejectionReason: string | null;
  }>;
  documents: Array<{
    id: number;
    documentType: AdmissionDocumentType;
    fileUrl: string;
    fileName: string | null;
  }>;
  statusHistory: Array<{
    id: number;
    previousStatus: AdmissionApplicationStatus | null;
    newStatus: AdmissionApplicationStatus;
    note: string | null;
    createdAt: string | Date;
    changedBy: { name: string; surname: string } | null;
  }>;
  student: { id: string; username: string; name: string } | null;
  school: { slug: string };
  invoices: Array<{ id: number; invoiceNumber: string }>;
  admissionNumber: string | null;
};

export default function AdmissionApplicationDetailClient({
  application,
  canManage,
}: {
  application: Detail;
  canManage: boolean;
}) {
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  const runAction = (action: "review" | "approve" | "reject" | "confirm" | "cancel") => {
    startTransition(async () => {
      const res = await processAdmissionApplication({
        applicationId: application.id,
        action,
        note,
        rejectionReason: action === "reject" ? note : undefined,
      });
      if (res.success) {
        toast.success(res.message);
        window.location.reload();
      } else toast.error(res.message);
    });
  };

  const runPayment = (paymentId: number, action: "verify" | "reject") => {
    startTransition(async () => {
      const res = await verifyAdmissionPayment({
        paymentId,
        action,
        rejectionReason: action === "reject" ? note : undefined,
      });
      if (res.success) {
        toast.success(res.message);
        window.location.reload();
      } else toast.error(res.message);
    });
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/list/admission" className="text-sm text-muted-foreground hover:underline">
            ← Back to Admission
          </Link>
          <h1 className="text-2xl font-bold">{application.applicationNumber}</h1>
          <p className="text-muted-foreground">{application.studentName}</p>
        </div>
        <div className="flex gap-2">
          <ApplicationStatusBadge status={application.applicationStatus} />
          <PaymentStatusBadge status={application.paymentStatus} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <AdmissionPdfDownloadButton
          schoolSlug={application.school.slug}
          applicationNumber={application.applicationNumber}
          type="application"
          label="Download Application PDF"
        />
        {application.paymentStatus === "VERIFIED" && (
          <AdmissionPdfDownloadButton
            schoolSlug={application.school.slug}
            applicationNumber={application.applicationNumber}
            type="invoice"
            label="Download Payment Invoice"
          />
        )}
        {application.applicationStatus === "CONFIRMED" && application.admissionNumber && (
          <AdmissionPdfDownloadButton
            schoolSlug={application.school.slug}
            applicationNumber={application.applicationNumber}
            type="confirmation"
            label="Download Admission Confirmation"
          />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Student Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
            <p><span className="text-muted-foreground">Class:</span> {application.admissionClass.class.name}</p>
            <p><span className="text-muted-foreground">Session:</span> {application.admissionSession.name}</p>
            <p><span className="text-muted-foreground">DOB:</span> {new Date(application.dateOfBirth).toLocaleDateString()}</p>
            <p><span className="text-muted-foreground">Age:</span> {calculateAgeFromDOB(application.dateOfBirth).label}</p>
            <p><span className="text-muted-foreground">Gender:</span> {application.gender}</p>
            <p><span className="text-muted-foreground">Blood Group:</span> {application.bloodGroup}</p>
            <p><span className="text-muted-foreground">Father:</span> {application.fatherName} ({application.fatherMobile})</p>
            {application.motherName && (
              <p><span className="text-muted-foreground">Mother:</span> {application.motherName}</p>
            )}
            <p className="sm:col-span-2"><span className="text-muted-foreground">Address:</span> {application.presentAddress}</p>
            {application.previousSchool && (
              <p className="sm:col-span-2"><span className="text-muted-foreground">Previous School:</span> {application.previousSchool}</p>
            )}
            {application.student && (
              <p className="sm:col-span-2 text-emerald-700 font-medium">
                Linked Student: {application.student.username} ({application.student.name})
              </p>
            )}
          </CardContent>
        </Card>

        {canManage && (
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="Note / rejection reason"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              {application.applicationStatus === "PAYMENT_VERIFIED" && (
                <Button className="w-full" onClick={() => runAction("review")} disabled={pending}>
                  Move to Review
                </Button>
              )}
              {["UNDER_REVIEW", "PAYMENT_VERIFIED"].includes(application.applicationStatus) && (
                <Button className="w-full" onClick={() => runAction("approve")} disabled={pending}>
                  Approve Application
                </Button>
              )}
              {application.applicationStatus === "APPROVED" && (
                <Button className="w-full" onClick={() => runAction("confirm")} disabled={pending}>
                  Confirm Admission
                </Button>
              )}
              {!["CONFIRMED", "CANCELLED"].includes(application.applicationStatus) && (
                <>
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => runAction("reject")}
                    disabled={pending}
                  >
                    Reject Application
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => runAction("cancel")}
                    disabled={pending}
                  >
                    Cancel
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {application.payments.length === 0 && (
            <p className="text-sm text-muted-foreground">No payment submitted yet.</p>
          )}
          {application.payments.map((p) => (
            <div key={p.id} className="rounded-lg border p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">TrxID: {p.transactionId}</p>
                  <p className="text-muted-foreground">
                    ৳{Number(p.amount).toLocaleString("en-BD")} · {p.senderMobile}
                  </p>
                </div>
                <PaymentStatusBadge status={p.status} />
              </div>
              {canManage && p.status === "PENDING" && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => runPayment(p.id, "verify")} disabled={pending}>
                    Verify Payment
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => runPayment(p.id, "reject")}
                    disabled={pending}
                  >
                    Reject Payment
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {application.statusHistory.map((h) => (
            <div key={h.id} className="rounded-md border p-3 text-sm">
              <p className="font-medium">
                {h.previousStatus ?? "—"} → {h.newStatus}
              </p>
              <p className="text-muted-foreground">
                {new Date(h.createdAt).toLocaleString()}
                {h.changedBy ? ` · ${h.changedBy.name} ${h.changedBy.surname}` : ""}
              </p>
              {h.note && <p>{h.note}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
