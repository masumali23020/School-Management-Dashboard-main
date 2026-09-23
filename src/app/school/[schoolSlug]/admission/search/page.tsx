import AdmissionSearchPage from "@/components/admission/pages/AdmissionSearchPage";

export { dynamic } from "@/components/admission/pages/AdmissionSearchPage";
export const metadata = { title: "Application Search" };

export default async function Page({
  params,
  searchParams,
}: {
  params: { schoolSlug: string };
  searchParams: { applicationNumber?: string };
}) {
  return AdmissionSearchPage({
    schoolSlug: params.schoolSlug,
    basePath: `/school/${params.schoolSlug}`,
    searchParams,
  });
}
