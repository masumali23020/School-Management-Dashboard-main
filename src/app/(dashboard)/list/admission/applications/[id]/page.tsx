import { redirect, notFound } from "next/navigation";
import { getUserRoleAuth } from "@/lib/logsessition";
import { getAdmissionApplicationDetail } from "@/Actions/admission/admission.actions";
import AdmissionApplicationDetailClient from "@/components/admission/AdmissionApplicationDetailClient";

export default async function AdmissionApplicationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { role } = await getUserRoleAuth();
  const normalizedRole = role?.toLowerCase() ?? "";
  if (!["admin", "cashier"].includes(normalizedRole)) redirect("/");

  const application = await getAdmissionApplicationDetail(Number(params.id));
  if (!application) notFound();

  return (
    <AdmissionApplicationDetailClient
      application={application as never}
      canManage={["admin", "cashier"].includes(normalizedRole)}
    />
  );
}
