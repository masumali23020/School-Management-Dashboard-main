import AdmissionApplicationPreviewPage from "@/components/admission/pages/AdmissionApplicationPreviewPage";

export { dynamic } from "@/components/admission/pages/AdmissionApplicationPreviewPage";
export const metadata = { title: "Application Preview" };

export default async function Page({
  params,
  searchParams,
}: {
  params: { schoolSlug: string; applicationNumber: string };
  searchParams: { v?: string; mobile?: string };
}) {
  return AdmissionApplicationPreviewPage({
    schoolSlug: params.schoolSlug,
    basePath: `/school/${params.schoolSlug}`,
    applicationNumber: params.applicationNumber,
    searchParams,
  });
}
