"use client";

import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

type Props = {
  schoolSlug: string;
  applicationNumber: string;
  type: "application" | "invoice" | "confirmation";
  label: string;
  mobile?: string;
  verificationCode?: string;
  disabled?: boolean;
};

function defaultFilename(type: Props["type"], applicationNumber: string) {
  if (type === "application") return `application-${applicationNumber}.pdf`;
  if (type === "invoice") return `invoice-${applicationNumber}.pdf`;
  return `confirmation-${applicationNumber}.pdf`;
}

export default function AdmissionPdfDownloadButton({
  schoolSlug,
  applicationNumber,
  type,
  label,
  mobile,
  verificationCode,
  disabled = false,
}: Props) {
  const [pending, startTransition] = useTransition();

  const downloadPdf = () => {
    startTransition(async () => {
      try {
        const params = new URLSearchParams({ applicationNumber });
        if (mobile) params.set("mobile", mobile);
        if (verificationCode) params.set("v", verificationCode);

        const url = `/api/admission/${schoolSlug}/pdf/${type}?${params.toString()}`;
        const res = await fetch(url, { credentials: "include" });

        const contentType = res.headers.get("content-type") ?? "";
        if (!res.ok || !contentType.includes("application/pdf")) {
          let message = "PDF could not be generated";
          try {
            const data = (await res.json()) as { error?: string };
            if (data.error) message = data.error;
          } catch {
            // ignore json parse errors
          }
          toast.error(message);
          return;
        }

        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = blobUrl;
        anchor.download = defaultFilename(type, applicationNumber);
        anchor.style.display = "none";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(blobUrl);
      } catch {
        toast.error("Failed to download PDF");
      }
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled || pending}
      onClick={downloadPdf}
    >
      <Download className="mr-2 h-4 w-4" />
      {pending ? "Downloading..." : label}
    </Button>
  );
}
