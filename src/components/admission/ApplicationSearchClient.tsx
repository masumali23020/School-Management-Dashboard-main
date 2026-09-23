"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { searchAdmissionApplication } from "@/Actions/admission/admission.actions";
import AdmissionPdfDownloadButton from "@/components/admission/AdmissionPdfDownloadButton";
import {
  ApplicationStatusBadge,
  PaymentStatusBadge,
} from "@/components/admission/StatusBadges";

import type { AdmissionApplicationStatus, AdmissionPaymentStatus } from "@prisma/client";

type SearchResult = {
  applicationNumber: string;
  studentName: string;
  studentPhoto: string | null;
  applyingClass: string;
  admissionSession: string;
  applicationStatus: AdmissionApplicationStatus;
  paymentStatus: AdmissionPaymentStatus;
  admissionNumber: string | null;
  applicationDate: string;
  ageLabel: string;
  canDownloadApplicationPdf: boolean;
  canDownloadInvoice: boolean;
  canDownloadConfirmation: boolean;
};

export default function ApplicationSearchClient({
  schoolSlug,
  schoolBasePath,
  initialApplicationNumber = "",
}: {
  schoolSlug: string;
  schoolBasePath: string;
  initialApplicationNumber?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [applicationNumber, setApplicationNumber] = useState(initialApplicationNumber);
  const [mobile, setMobile] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);

  const onSearch = () => {
    startTransition(async () => {
      const res = await searchAdmissionApplication({
        schoolSlug,
        applicationNumber,
        mobile,
      });
      if (res.success && res.data) {
        setResult(res.data as SearchResult);
        toast.success(res.message);
      } else {
        setResult(null);
        toast.error(res.message);
      }
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Search Application</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter your Application Number and registered mobile number (father, mother, or
            guardian) to view your application status.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Application Number</Label>
              <Input
                value={applicationNumber}
                onChange={(e) => setApplicationNumber(e.target.value)}
                placeholder="ADM-2027-000001"
              />
            </div>
            <div className="space-y-2">
              <Label>Mobile Number</Label>
              <Input
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="01XXXXXXXXX"
              />
            </div>
          </div>
          <Button onClick={onSearch} disabled={pending}>
            {pending ? "Searching..." : "Search Application"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Application Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              {result.studentPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={result.studentPhoto}
                  alt={result.studentName}
                  className="h-24 w-24 rounded-lg border object-cover"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-lg border bg-muted text-sm text-muted-foreground">
                  No Photo
                </div>
              )}
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium">Application No:</span> {result.applicationNumber}
                </p>
                <p>
                  <span className="font-medium">Student:</span> {result.studentName}
                </p>
                <p>
                  <span className="font-medium">Age:</span> {result.ageLabel}
                </p>
                <p>
                  <span className="font-medium">Class:</span> {result.applyingClass}
                </p>
                <p>
                  <span className="font-medium">Session:</span> {result.admissionSession}
                </p>
                <p>
                  <span className="font-medium">Application Date:</span>{" "}
                  {new Date(result.applicationDate).toLocaleDateString("en-GB")}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <ApplicationStatusBadge status={result.applicationStatus} />
                  <PaymentStatusBadge status={result.paymentStatus} />
                </div>
                {result.admissionNumber && (
                  <p>
                    <span className="font-medium">Admission No:</span> {result.admissionNumber}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 border-t pt-4">
              <Button asChild variant="secondary">
                <Link
                  href={`${schoolBasePath}/admission/application/${encodeURIComponent(result.applicationNumber)}?mobile=${encodeURIComponent(mobile)}`}
                >
                  View Application
                </Link>
              </Button>
              {result.canDownloadApplicationPdf && (
                <AdmissionPdfDownloadButton
                  schoolSlug={schoolSlug}
                  applicationNumber={result.applicationNumber}
                  type="application"
                  label="Download Application PDF"
                  mobile={mobile}
                />
              )}
              {result.canDownloadInvoice && (
                <AdmissionPdfDownloadButton
                  schoolSlug={schoolSlug}
                  applicationNumber={result.applicationNumber}
                  type="invoice"
                  label="Download Payment Invoice"
                  mobile={mobile}
                />
              )}
              {result.canDownloadConfirmation && (
                <AdmissionPdfDownloadButton
                  schoolSlug={schoolSlug}
                  applicationNumber={result.applicationNumber}
                  type="confirmation"
                  label="Download Admission Confirmation"
                  mobile={mobile}
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
