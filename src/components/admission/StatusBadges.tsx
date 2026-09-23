import { Badge } from "@/components/ui/badge";
import type { AdmissionApplicationStatus, AdmissionPaymentStatus } from "@prisma/client";
import {
  formatApplicationStatus,
  formatPaymentStatus,
} from "@/lib/admission/utils";

const applicationStatusVariant: Record<
  AdmissionApplicationStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  SUBMITTED: "secondary",
  PAYMENT_PENDING: "outline",
  PAYMENT_VERIFIED: "default",
  PAYMENT_REJECTED: "destructive",
  UNDER_REVIEW: "outline",
  APPROVED: "default",
  APPLICATION_REJECTED: "destructive",
  CONFIRMED: "default",
  CANCELLED: "secondary",
};

const paymentStatusVariant: Record<
  AdmissionPaymentStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING: "outline",
  VERIFIED: "default",
  REJECTED: "destructive",
};

export function ApplicationStatusBadge({
  status,
}: {
  status: AdmissionApplicationStatus;
}) {
  return (
    <Badge variant={applicationStatusVariant[status] ?? "secondary"}>
      {formatApplicationStatus(status)}
    </Badge>
  );
}

export function PaymentStatusBadge({ status }: { status: AdmissionPaymentStatus }) {
  return (
    <Badge variant={paymentStatusVariant[status] ?? "secondary"}>
      {formatPaymentStatus(status)}
    </Badge>
  );
}
