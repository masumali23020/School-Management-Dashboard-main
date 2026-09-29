import Link from "next/link";
import { notFound } from "next/navigation";
import Footer from "@/components/hompage/Footer";
import SchoolNavbar from "@/components/hompage/SchoolNavber";
import ApplicationSearchClient from "@/components/admission/ApplicationSearchClient";
import { getSchoolIdFromSlug } from "@/lib/admission/utils";
import { getSchoolSettings } from "@/lib/getSchoolData";

export const dynamic = "force-dynamic";

export default async function AdmissionSearchPage({
  schoolSlug,
  basePath,
  searchParams,
}: {
  schoolSlug: string;
  basePath: string;
  searchParams: { applicationNumber?: string };
}) {
  const schoolId = await getSchoolIdFromSlug(schoolSlug);
  if (!schoolId) notFound();

  const settings = await getSchoolSettings(schoolId);
  if (!settings) notFound();

  return (
    <main className="min-h-screen bg-slate-50">
      <SchoolNavbar settings={settings} />
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
        <div>
          <Link href={`${basePath}/admission`} className="text-sm text-[#1a365d] hover:underline">
            ← ভর্তি তথ্য
          </Link>
          <h1 className="mt-2 text-3xl font-extrabold text-[#1a365d]">Application Search</h1>
          <p className="mt-1 text-muted-foreground">
            Application Number + Mobile Number দিয়ে আবেদনের status দেখুন
          </p>
        </div>
        <ApplicationSearchClient
          schoolSlug={schoolSlug}
          schoolBasePath={basePath}
          initialApplicationNumber={searchParams.applicationNumber ?? ""}
        />
      </div>
      <Footer settings={settings} />
    </main>
  );
}
