import Link from "next/link";
import { notFound } from "next/navigation";
import Footer from "@/components/hompage/Footer";
import SchoolNavbar from "@/components/hompage/SchoolNavber";
import PublicPaymentForm from "@/components/admission/PublicPaymentForm";
import { getPublicAdmissionAvailability } from "@/lib/admission/public-data";
import { getPublicApplicationStatus } from "@/Actions/admission/admission.actions";
import { getSchoolSettings } from "@/lib/getSchoolData";

export const dynamic = "force-dynamic";

export default async function AdmissionPaymentPage({
  schoolSlug,
  basePath,
  searchParams,
}: {
  schoolSlug: string;
  basePath: string;
  searchParams: { applicationNumber?: string };
}) {
  const availability = await getPublicAdmissionAvailability(schoolSlug);
  if (!availability) notFound();

  const settings = await getSchoolSettings(availability.schoolId);
  if (!settings) notFound();

  const applicationNumber = searchParams.applicationNumber ?? "";
  const application = applicationNumber
    ? await getPublicApplicationStatus(schoolSlug, applicationNumber)
    : null;

  return (
    <main className="min-h-screen bg-slate-50">
      <SchoolNavbar settings={settings} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div>
          <Link
            href={`${basePath}/admission`}
            className="text-sm text-[#1a365d] hover:underline"
          >
            ← ভর্তি তথ্য
          </Link>
          <h1 className="text-3xl font-extrabold text-[#1a365d] mt-2">
            ভর্তি ফি পরিশোধ
          </h1>
        </div>

        {!applicationNumber ? (
          <div className="rounded-2xl border bg-white p-8 text-center">
            <p className="text-muted-foreground">
              Application number পাওয়া যায়নি। প্রথমে আবেদন ফর্ম submit করুন।
            </p>
            <Link
              href={`${basePath}/admission/apply`}
              className="inline-block mt-4 text-[#1a365d] font-semibold hover:underline"
            >
              আবেদন করুন →
            </Link>
          </div>
        ) : (
          <PublicPaymentForm
            schoolSlug={schoolSlug}
            applicationNumber={applicationNumber}
            bkashNumber={availability.setting?.bkashNumber}
            paymentInstruction={availability.setting?.paymentInstruction}
            application={application as never}
          />
        )}
      </div>
      <Footer settings={settings} />
    </main>
  );
}
