import AdmissionLandingPage from "@/components/admission/pages/AdmissionLandingPage";

export const metadata = { title: "ভর্তি তথ্য" };
export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: { schoolSlug: string };
}) {
  return AdmissionLandingPage({
    schoolSlug: params.schoolSlug,
    basePath: `/${params.schoolSlug}`,
  });
}
