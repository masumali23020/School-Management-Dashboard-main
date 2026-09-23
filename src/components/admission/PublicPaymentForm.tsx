"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  admissionPaymentSubmitSchema,
  type AdmissionPaymentSubmitInput,
} from "@/schemas/admission";
import { submitAdmissionPayment } from "@/Actions/admission/admission.actions";
import {
  ApplicationStatusBadge,
  PaymentStatusBadge,
} from "@/components/admission/StatusBadges";
import type { AdmissionApplicationStatus, AdmissionPaymentStatus } from "@prisma/client";

type Props = {
  schoolSlug: string;
  applicationNumber: string;
  bkashNumber?: string | null;
  paymentInstruction?: string | null;
  application?: {
    studentName: string;
    applicationStatus: AdmissionApplicationStatus;
    paymentStatus: AdmissionPaymentStatus;
    admissionClass: {
      admissionFee: string | number;
      class: { name: string };
    };
  } | null;
};

export default function PublicPaymentForm({
  schoolSlug,
  applicationNumber,
  bkashNumber,
  paymentInstruction,
  application,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdmissionPaymentSubmitInput>({
    resolver: zodResolver(admissionPaymentSubmitSchema),
    defaultValues: { schoolSlug, applicationNumber },
  });

  const onSubmit = handleSubmit((data) => {
    startTransition(async () => {
      const res = await submitAdmissionPayment(data);
      if (res.success) {
        toast.success(res.message);
        setSubmitted(true);
      } else toast.error(res.message);
    });
  });

  return (
    <div className="space-y-6">
      {application && (
        <Card>
          <CardHeader>
            <CardTitle>Application: {applicationNumber}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Student: {application.studentName}</p>
            <p>Class: {application.admissionClass.class.name}</p>
            <p>
              Amount: ৳
              {Number(application.admissionClass.admissionFee).toLocaleString("en-BD")}
            </p>
            <div className="flex gap-2 pt-2">
              <ApplicationStatusBadge status={application.applicationStatus} />
              <PaymentStatusBadge status={application.paymentStatus} />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Payment Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {bkashNumber && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
              <p className="text-sm text-emerald-800 font-medium">bKash Number</p>
              <p className="text-2xl font-bold text-emerald-900">{bkashNumber}</p>
            </div>
          )}
          {paymentInstruction && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {paymentInstruction}
            </p>
          )}

          {submitted ? (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-blue-900">
              Payment submitted successfully. Please wait for admin verification.
            </div>
          ) : (
            <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" {...register("schoolSlug")} />
              <input type="hidden" {...register("applicationNumber")} />
              <div className="space-y-2">
                <Label>Sender Mobile *</Label>
                <Input {...register("senderMobile")} placeholder="01XXXXXXXXX" />
                {errors.senderMobile && (
                  <p className="text-xs text-red-500">{errors.senderMobile.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Transaction ID *</Label>
                <Input {...register("transactionId")} placeholder="bKash TrxID" />
                {errors.transactionId && (
                  <p className="text-xs text-red-500">{errors.transactionId.message}</p>
                )}
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={pending}>
                  {pending ? "Submitting..." : "Submit Payment"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
