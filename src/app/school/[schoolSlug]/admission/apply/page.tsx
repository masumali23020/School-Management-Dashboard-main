import AdmissionApplyPage from "@/components/admission/pages/AdmissionApplyPage";

export { dynamic } from "@/components/admission/pages/AdmissionApplyPage";
export const metadata = { title: "ভর্তি আবেদন" };

export default async function Page({
  params,
}: {
  params: { schoolSlug: string };
}) {
  return AdmissionApplyPage({
    schoolSlug: params.schoolSlug,
    basePath: `/school/${params.schoolSlug}`,
  });
}
