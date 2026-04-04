
import ExamPageClient from "./Exampageclient";
import { getAllClasses } from "@/Actions/AnnousmentAction/Assignmet/Assignmentactions";
import { getExamList } from "@/app/actions/examActions/examActions";
import { getUserRoleAuth } from "@/lib/logsessition";


type Props = {
  searchParams: { [key: string]: string | undefined };
};

export default async function ExamListPage({ searchParams }: Props) {
  const { role, userId: currentUserId } = await getUserRoleAuth();

  const page = searchParams.page ? parseInt(searchParams.page) : 1;
  const search = searchParams.search ?? "";
  const classId = searchParams.classId ? parseInt(searchParams.classId) : undefined;

  const [{ data: exams, count }, classes] = await Promise.all([
    getExamList({ page, search, classId, role, currentUserId: currentUserId! }),
    getAllClasses(),
  ]);

  return (
    <ExamPageClient
      exams={exams}
      count={count}
      page={page}
      role={role}
      classes={classes.map((c) => ({
        id: c.id,
        name: c.name,
        gradeLevel: c.grade.level,
      }))}
    />
  );
}