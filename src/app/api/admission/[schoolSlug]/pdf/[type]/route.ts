import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSchoolIdFromSlug } from "@/lib/admission/utils";
import {
  generateApplicationPdfBuffer,
  generateConfirmationPdfBuffer,
  generateInvoicePdfBuffer,
} from "@/lib/admission/pdf.service";
import { mobileMatchesApplication } from "@/lib/admission/access";
import { fetchApplicationByNumber } from "@/lib/admission/application.service";
import { hasVerifiedAdmissionInvoice } from "@/lib/admission/invoice.service";

type PdfType = "application" | "invoice" | "confirmation";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { schoolSlug: string; type: string } }
) {
  const type = params.type as PdfType;
  if (!["application", "invoice", "confirmation"].includes(type)) {
    return NextResponse.json({ error: "Invalid PDF type" }, { status: 400 });
  }

  const { searchParams } = request.nextUrl;
  const applicationNumber = searchParams.get("applicationNumber")?.trim();
  const mobile = searchParams.get("mobile") ?? undefined;
  const verificationCode = searchParams.get("v") ?? undefined;

  if (!applicationNumber) {
    return NextResponse.json({ error: "Application number is required" }, { status: 400 });
  }

  const schoolId = await getSchoolIdFromSlug(params.schoolSlug);
  if (!schoolId) {
    return NextResponse.json({ error: "School not found" }, { status: 404 });
  }

  const session = await auth();
  const isAdmin =
    session?.user?.schoolId &&
    Number(session.user.schoolId) === schoolId &&
    ["ADMIN", "CASHIER"].includes(String(session.user.role).toUpperCase());

  if (!isAdmin) {
    const app = await fetchApplicationByNumber(schoolId, applicationNumber);
    if (!app) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const codeOk =
      verificationCode && app.verificationCode && verificationCode === app.verificationCode;
    const mobileOk = mobile && mobileMatchesApplication(mobile, app);

    if (!codeOk && !mobileOk) {
      return NextResponse.json(
        { error: "Verification required (mobile or access code)" },
        { status: 403 }
      );
    }

    if (type === "invoice") {
      const verified = app.payments.some((p) => p.status === "VERIFIED");
      const hasInvoice = verified
        ? await hasVerifiedAdmissionInvoice(app.id, schoolId)
        : false;
      if (!verified || !hasInvoice) {
        return NextResponse.json({ error: "Invoice not available" }, { status: 403 });
      }
    }

    if (type === "confirmation") {
      if (app.applicationStatus !== "CONFIRMED" || !app.admissionNumber) {
        return NextResponse.json({ error: "Confirmation not available" }, { status: 403 });
      }
    }
  }

  let buffer: Buffer | null = null;
  let filename = `${type}-${applicationNumber}.pdf`;

  try {
    if (type === "application") {
      buffer = await generateApplicationPdfBuffer(schoolId, applicationNumber);
      filename = `application-${applicationNumber}.pdf`;
    } else if (type === "invoice") {
      buffer = await generateInvoicePdfBuffer(schoolId, applicationNumber);
      filename = `invoice-${applicationNumber}.pdf`;
    } else {
      buffer = await generateConfirmationPdfBuffer(schoolId, applicationNumber);
      filename = `confirmation-${applicationNumber}.pdf`;
    }
  } catch (error) {
    console.error("[admission-pdf]", type, applicationNumber, error);
    return NextResponse.json(
      { error: "PDF generation failed. Please try again." },
      { status: 500 }
    );
  }

  if (!buffer) {
    return NextResponse.json({ error: "PDF could not be generated" }, { status: 404 });
  }

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
