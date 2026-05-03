import PaymentListClient from "@/components/Paymentlistclient ";
import prisma from "@/lib/db";
import { getUserRoleAuth } from "@/lib/logsessition";
import { redirect } from "next/navigation";

export default async function PaymentListPage() {
  const { role, schoolId } = await getUserRoleAuth();
  if (!["admin", "cashier"].includes(role as string)) redirect("/");

  // ১. ডাটাবেস থেকে স্কুলের তথ্য নিয়ে আসুন
  const school = await prisma.school.findUnique({
    where: { id: Number(schoolId) },
    select: {
      schoolName: true,
      shortName: true,
      logoUrl: true,
      email: true,
      establishedYear: true,
      eiinNumber: true,
      academicSession: true,
      address: true,
      phone: true,
    }
  });

  const classes = await prisma.class.findMany({
    where: { schoolId: Number(schoolId) },
    include: { grade: true },
    orderBy: [{ grade: { level: "asc" } }, { name: "asc" }],
  });

  const yearRows = await prisma.feePayment.findMany({
    where: { student: { schoolId: Number(schoolId) } },
    distinct: ["academicYear"],
    select:   { academicYear: true },
    orderBy:  { academicYear: "desc" },
  });

  return (
    <PaymentListClient
      classes={classes.map((c) => ({ id: c.id, name: c.name }))}
      academicYears={yearRows.map((r) => r.academicYear)}
      // ২. এখানে schoolInfo পাস করুন (এটিই মিসিং ছিল)
      schoolInfo={{
        name: school?.shortName || "Unknown School",
        address: school?.address || "No Address",
        phone: school?.phone || "No Phone",
        email: school?.email || "No Email",
        establishedYear: school?.establishedYear || "No Year",
        eiinNumber: school?.eiinNumber || "No EIIN",
        academicSession: school?.academicSession || "No Session",
      }}
    />
  );
}