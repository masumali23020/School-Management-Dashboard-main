import { getAllClasses } from "@/Actions/AnnousmentAction/Assignmet/Assignmentactions";
import AssignmentsClient from "./Assignmentsclient";

export default async function AssignmentsPage() {
  const classes = await getAllClasses();

  const classOptions = classes.map((c) => ({
    id: c.id,
    name: c.name,
    gradeLevel: c.grade.level,
  }));

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Assignments</h1>
        <p className="text-sm text-gray-500 mt-1">
          Select a class to view and manage assignment marks
        </p>
      </div>
      <AssignmentsClient classes={classOptions} />
    </div>
  );
}