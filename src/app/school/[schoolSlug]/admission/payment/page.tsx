import AdmissionPaymentPage from "@/components/admission/pages/AdmissionPaymentPage";

export { dynamic } from "@/components/admission/pages/AdmissionPaymentPage";
export const metadata = { title: "ভর্তি পেমেন্ট" };

export default async function Page({
  params,
  searchParams,
}: {
  params: { schoolSlug: string };
  searchParams: { applicationNumber?: string };
}) {
  return AdmissionPaymentPage({
    schoolSlug: params.schoolSlug,
    basePath: `/school/${params.schoolSlug}`,
    searchParams,
  });
}
