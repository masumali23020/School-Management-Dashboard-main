// app/list/results/exams/page.tsx



import { getAllClasses } from "@/Actions/ExamAction/deepsek";
import ExamsClient from "./Examsclient";


export default async function ExamsPage() {
  const classes = await getAllClasses();

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Exam Marks</h1>
        <p className="text-sm text-gray-500 mt-1">
          Select a class → enter marks per subject for all students
        </p>
      </div>
      <ExamsClient
        classes={classes.map((c) => ({
          id: c.id,
          name: c.name,
          gradeLevel: c.grade.level,
        }))}
      />
    </div>
  );
}