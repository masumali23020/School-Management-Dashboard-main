import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ResultPageClient } from "@/components/result/ResultPageClient";
import { getTeacherByClerkId, getClassesByTeacher } from "@/lib/queries/result.queries";

export const metadata = {
  title: "Result Entry | EduResult Pro",
  description: "Enter assignment and exam marks for your students",
};

export default async function ResultPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const teacher = await getTeacherByClerkId(userId);
  if (!teacher) redirect("/unauthorized");

  const classes = await getClassesByTeacher(teacher.id);

  return (
    <ResultPageClient
      teacher={{ id: teacher.id, name: teacher.name, surname: teacher.surname }}
      classes={classes}
    />
  );
}
