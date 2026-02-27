
import FormModal from "./FormModal";

import prisma from "../lib/db"

import { getUserRole } from "../lib/utlis";
export type FormContainerProps = {
  table:
    | "teacher"
    | "student"
    | "parent"
    | "subject"
    | "class"
    | "lesson"
    | "exam"
    | "assignment"
    | "result"
    | "attendance"
    | "event"
    | "announcement";
  type: "create" | "update" | "delete";
  data?: any;
  id?: number | string;
};

const FormContainer = async ({ table, type, data, id }: FormContainerProps) => {

  const {role, userId:currentUserId} = await getUserRole()
  let relatedData = {};

  if (type !== "delete") {
    switch (table) {
      case "subject":
        const subjectTeachers = await prisma.teacher.findMany({
          select: { id: true, name: true, surname: true },
        });
        relatedData = { teachers: subjectTeachers };
        break;
      case "class":
        const classGrades = await prisma.grade.findMany({
          select: { id: true, level: true },
        });
        const classTeachers = await prisma.teacher.findMany({
          select: { id: true, name: true, surname: true },
        });
        relatedData = { teachers: classTeachers, grades: classGrades };
        break;
      case "teacher":
        const teacherSubjects = await prisma.subject.findMany({
          select: { id: true, name: true },
        });
        relatedData = { subjects: teacherSubjects };
        break;
      case "student":
        const studentGrades = await prisma.grade.findMany({
          select: { id: true, level: true },
        });
        const studentClasses = await prisma.class.findMany({
          include: { _count: { select: { students: true } } },
        });
        relatedData = { classes: studentClasses, grades: studentGrades };
        break;
      case "lesson":
        const lessonTeachers = await prisma.teacher.findMany({
          select: { id: true, name: true, surname: true },
        });
         const lessonSubjects = await prisma.subject.findMany({
          select: { id: true, name: true },
        });
          const lessonClass = await prisma.class.findMany({
        
          select: { id: true, name: true },
        });
        relatedData = { teachers: lessonTeachers, subjects: lessonSubjects, classes: lessonClass };
        break;
      case "exam":
        const examLessons = await prisma.lesson.findMany({
          where: {
            ...(role === "teacher" ? { teacherId: currentUserId! } : {}),
          },
          select: { id: true, name: true },
        });
        relatedData = { lessons: examLessons };
        break;
      case "assignment":
        const assignmetLesson = await prisma.lesson.findMany({
          where: {
            ...(role === "teacher" ? { teacherId: currentUserId! } : {}),
          },
          select: { id: true, name: true },
        });
        relatedData = { lessons: assignmetLesson };
        break;
      case "event":
        const eventClass = await prisma.event.findMany({
        
          select: {  class: { select: { id: true, name: true } } },
        });
        relatedData = { classes: eventClass };
        break;
      case "announcement":
        const announcementClass = await prisma.class.findMany({
        
          select: { id: true, name: true },
        });
        relatedData = { classes: announcementClass };
        break;

      case "result":
        const resultExam = await prisma.exam.findMany({
        
          select: { id: true, title: true },
        });
        const resultAssignment = await prisma.assignment.findMany({
        
          select: { id: true, title: true },
        });
        const resultStudent = await prisma.student.findMany({
        
          select: { id: true, name: true, surname: true },
        });
        relatedData = { exams: resultExam, assignments: resultAssignment, students: resultStudent };
        break;

      default:
        break;
    }
  }



  return (
    <div className="">
      <FormModal
        table={table}
        type={type}
        data={data}
        id={id}
        relatedData={relatedData}
      />
    </div>
  );
};

export default FormContainer;