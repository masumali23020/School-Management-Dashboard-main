import FormModal from "./FormModal";
import prisma from "../lib/db";
import { getUserRole } from "../lib/utlis";
import { UserRole } from "@prisma/client";

export type FormContainerProps = {
  table:
    | "employee"
    | "teacher"
    | "student"
    | "parent"
    | "subject"
    | "class"
    | "lesson"
    | "exam"
    | "assignment"
    | "classSubjectTeacher"
    | "result"
    | "attendance"
    | "event"
    | "announcement";
  type: "create" | "update" | "delete";
  data?: any;
  id?: number | string;
};

const FormContainer = async ({ table, type, data, id }: FormContainerProps) => {
  const { role, userId: currentUserId } = await getUserRole();
  let relatedData = {};

  if (type !== "delete") {
    switch (table) {
      case "class":
        const classGrades = await prisma.grade.findMany({ select: { id: true, level: true } });
        const classTeachers = await prisma.employee.findMany({
          where: { role: UserRole.TEACHER },
          select: { id: true, name: true, surname: true },
        });
        relatedData = { teachers: classTeachers, grades: classGrades };
        break;

      case "classSubjectTeacher":
        const classes = await prisma.class.findMany({ include: { grade: true } });
        const subjects = await prisma.subject.findMany({ select: { id: true, name: true } });
        const teachers = await prisma.employee.findMany({
          where: { role: UserRole.TEACHER },
          select: { id: true, name: true, surname: true },
        });
        relatedData = { classes, subjects, teachers };
        break;

      case "employee":
      case "teacher":
        const teacherSubjects = await prisma.subject.findMany({ select: { id: true, name: true } });
        relatedData = { subjects: teacherSubjects };
        break;

      case "student":
        const studentGrades = await prisma.grade.findMany({ select: { id: true, level: true } });
        const studentClasses = await prisma.class.findMany({ include: { _count: { select: { students: true } } } });
        relatedData = { classes: studentClasses, grades: studentGrades };
        break;

   case "parent":
        // Get all students with their class and grade info
        const parentStudents = await prisma.student.findMany({
          select: { 
            id: true, 
            name: true, 
            surname: true,
            classId: true,
            class: {
              select: {
                name: true,
                grade: {
                  select: {
                    level: true
                  }
                }
              }
            }
          },
        });
        
        // Get all classes with their grade info
        const parentClasses = await prisma.class.findMany({
          select: {
            id: true,
            name: true,
            grade: {
              select: {
                level: true
              }
            }
          },
          orderBy: {
            name: 'asc'
          }
        });
        
        relatedData = { 
          students: parentStudents,
          classes: parentClasses 
        };
        break;

  
       case "lesson":
  const lessonTeachers = await prisma.employee.findMany({
    where: {
      role: "TEACHER" // এখানে বড় হাতের অক্ষরে TEACHER দিন যেহেতু আপনার Enum-এ তাই আছে
    },
    select: { id: true, name: true, surname: true },
  });

  const lessonSubjects = await prisma.subject.findMany({
    select: { id: true, name: true },
  });

  const lessonClasses = await prisma.class.findMany({
    select: { 
      id: true, 
      name: true, 
      grade: { select: { level: true } } 
    },
  });
  
  // Get all class-subject-teacher assignments
  const lessonAssignments = await prisma.classSubjectTeacher.findMany({
    include: {
      class: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true } },
      teacher: { select: { id: true, name: true, surname: true } },
    },
    orderBy: [
      { class: { name: 'asc' } },
      { subject: { name: 'asc' } }
    ]
  });
  
  relatedData = { 
    teachers: lessonTeachers, 
    subjects: lessonSubjects, 
    classes: lessonClasses,
    assignments: lessonAssignments 
  };
  break; // Switch কেসে 'break' দিতে ভুলবেন না
  break;
      case "exam":
        relatedData = { lessons: await prisma.lesson.findMany({ select: { id: true, name: true } }) };
        break;

      case "assignment":
        relatedData = { lessons: await prisma.lesson.findMany({ select: { id: true, name: true } }) };
        break;

      case "event":
        relatedData = { classes: await prisma.class.findMany({ select: { id: true, name: true } }) };
        break;

      case "announcement":
        relatedData = { classes: await prisma.class.findMany({ select: { id: true, name: true } }) };
        break;

      case "result":
        relatedData = {
          exams: await prisma.exam.findMany({ select: { id: true, title: true } }),
          assignments: await prisma.assignment.findMany({ select: { id: true, title: true } }),
          students: await prisma.student.findMany({ select: { id: true, name: true, surname: true } }),
        };
        break;

      default:
        break;
    }
  }

  return (
    <div className="">
      <FormModal table={table} type={type} data={data} id={id} relatedData={relatedData} />
    </div>
  );
};

export default FormContainer;