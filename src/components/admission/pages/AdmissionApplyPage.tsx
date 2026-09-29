import Link from "next/link";
import { notFound } from "next/navigation";
import Footer from "@/components/hompage/Footer";
import SchoolNavbar from "@/components/hompage/SchoolNavber";
import PublicAdmissionForm from "@/components/admission/PublicAdmissionForm";
import { getPublicAdmissionAvailability } from "@/lib/admission/public-data";
import { getSchoolSettings } from "@/lib/getSchoolData";

export const dynamic = "force-dynamic";

export default async function AdmissionApplyPage({
  schoolSlug,
  basePath,
}: {
  schoolSlug: string;
  basePath: string;
}) {
  const availability = await getPublicAdmissionAvailability(schoolSlug);
  if (!availability) notFound();

  const settings = await getSchoolSettings(availability.schoolId);
  if (!settings) notFound();

  return (
    <main className="min-h-screen bg-slate-50">
      <SchoolNavbar settings={settings} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div>
          <Link
            href={`${basePath}/admission`}
            className="text-sm text-[#1a365d] hover:underline"
          >
            ← ভর্তি তথ্য
          </Link>
          <h1 className="text-3xl font-extrabold text-[#1a365d] mt-2">
            অনলাইন ভর্তি আবেদন
          </h1>
          <p className="text-muted-foreground mt-1">
            {settings.schoolName} — শুধুমাত্র খোলা ক্লাসে আবেদন করা যাবে
          </p>
        </div>

        {!availability.enabled ? (
          <div className="rounded-2xl border bg-white p-8 text-center">
            <p className="text-lg font-semibold text-[#1a365d]">
              এই মুহূর্তে অনলাইন ভর্তি বন্ধ আছে
            </p>
            <p className="text-muted-foreground mt-2">
              বিস্তারিত জানতে বিদ্যালয়ের অফিসে যোগাযোগ করুন।
            </p>
          </div>
        ) : (
          <PublicAdmissionForm
            schoolSlug={schoolSlug}
            schoolBasePath={basePath}
            openClasses={availability.openClasses.map((ac) => ({
              id: ac.id,
              sessionId: ac.sessionId,
              sessionName: ac.sessionName,
              class: ac.class,
              admissionFee: ac.admissionFee,
              availableSeats: ac.availableSeats,
            }))}
          />
        )}
      </div>
      <Footer settings={settings} />
    </main>
  );
}
