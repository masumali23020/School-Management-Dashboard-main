import FormModal from "./FormModal";
import prisma from "../lib/db";

import { UserRole } from "@prisma/client";
import { getUserRoleAuth } from "@/lib/logsessition";

export type FormContainerProps = {
  table:
    | "employee"
    | "teacher"
    | "student"
    | "parent"
    | "subject"
    | "class"
    | "grade"
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
  const { role, userId: currentUserId, schoolId } = await getUserRoleAuth();

  // Check if user has school access
  if (!schoolId && type !== "delete") {
    console.error("FormContainer: No schoolId found for user");
    return (
      <div className="text-red-500 text-sm p-2">
        Error: No school associated with your account.
      </div>
    );
  }

  let relatedData = {};

  if (type !== "delete") {
    switch (table) {
      case "class":
        // Only get grades from the same school
        const classGrades = await prisma.grade.findMany({ 
          where: { schoolId: Number(schoolId) },
          select: { id: true, level: true },
          orderBy: { level: 'asc' }
        });
        
        // Only get teachers from the same school
        const classTeachers = await prisma.employee.findMany({
          where: { 
            role: UserRole.TEACHER,
            schoolId: Number(schoolId)
          },
          select: { id: true, name: true, surname: true },
          orderBy: { name: 'asc' }
        });
        
        relatedData = { teachers: classTeachers, grades: classGrades };
        break;

      case "classSubjectTeacher":
        // Only get classes from the same school
        const classes = await prisma.class.findMany({ 
          where: { schoolId: Number(schoolId) },
          include: { grade: true },
          orderBy: { name: 'asc' }
        });
        
        // Only get subjects from the same school
        const subjects = await prisma.subject.findMany({ 
          where: { schoolId: Number(schoolId) },
          select: { id: true, name: true },
          orderBy: { name: 'asc' }
        });
        
        // Only get teachers from the same school
        const teachers = await prisma.employee.findMany({
          where: { 
            role: UserRole.TEACHER,
            schoolId: Number(schoolId)
          },
          select: { id: true, name: true, surname: true },
          orderBy: { name: 'asc' }
        });
        
        relatedData = { classes, subjects, teachers };
        break;

      case "employee":
      case "teacher":
        // Only get subjects from the same school
        const teacherSubjects = await prisma.subject.findMany({ 
          where: { schoolId: Number(schoolId) },
          select: { id: true, name: true },
          orderBy: { name: 'asc' }
        });
        relatedData = { subjects: teacherSubjects };
        break;

      case "student":
        // Only get grades from the same school
        const studentGrades = await prisma.grade.findMany({ 
          where: { schoolId: Number(schoolId) },
          select: { id: true, level: true },
          orderBy: { level: 'asc' }
        });
        
        // Only get classes from the same school with student count
        const studentClasses = await prisma.class.findMany({ 
          where: { schoolId: Number(schoolId) },
          include: { 
            _count: { select: { students: true } },
            grade: true
          },
          orderBy: { name: 'asc' }
        });
        
        relatedData = { classes: studentClasses, grades: studentGrades };
        break;

      case "parent":
        // Only get students from the same school
        const parentStudents = await prisma.student.findMany({
          where: { schoolId: Number(schoolId) },
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
          orderBy: { name: 'asc' }
        });
        
        // Only get classes from the same school
        const parentClasses = await prisma.class.findMany({
          where: { schoolId: Number(schoolId) },
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
        // Only get teachers from the same school
        const lessonTeachers = await prisma.employee.findMany({
          where: {
            role: UserRole.TEACHER,
            schoolId: Number(schoolId)
          },
          select: { id: true, name: true, surname: true },
          orderBy: { name: 'asc' }
        });

        // Only get subjects from the same school
        const lessonSubjects = await prisma.subject.findMany({
          where: { schoolId: Number(schoolId) },
          select: { id: true, name: true },
          orderBy: { name: 'asc' }
        });

        // Only get classes from the same school
        const lessonClasses = await prisma.class.findMany({
          where: { schoolId: Number(schoolId) },
          select: { 
            id: true, 
            name: true, 
            grade: { select: { level: true } } 
          },
          orderBy: { name: 'asc' }
        });
        
        // Only get class-subject-teacher assignments from the same school
        const lessonAssignments = await prisma.classSubjectTeacher.findMany({
          where: { schoolId: Number(schoolId) },
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
        break;

      case "exam":
        // Using only include, not select
        const examLessons = await prisma.lesson.findMany({
          where: {
            class: {
              schoolId: Number(schoolId)
            }
          },
          include: {
            subject: {
              select: { name: true }
            },
            class: {
              select: {
                name: true,
                grade: {
                  select: { level: true }
                }
              }
            }
          },
          orderBy: { name: 'asc' }
        });
        relatedData = { lessons: examLessons };
        break;

    case "assignment":
        // Using only include, not select
        const assignmentLessons = await prisma.lesson.findMany({
          where: {
            class: {
              schoolId: Number(schoolId)
            }
          },
          include: {
            subject: {
              select: { name: true }
            },
            class: {
              select: {
                name: true,
                grade: {
                  select: { level: true }
                }
              }
            }
          },
          orderBy: { name: 'asc' }
        });
        relatedData = { lessons: assignmentLessons };
        break;

      case "event":
        // Only get classes from the same school
        const eventClasses = await prisma.class.findMany({ 
          where: { schoolId: Number(schoolId) },
          select: { id: true, name: true },
          orderBy: { name: 'asc' }
        });
        relatedData = { classes: eventClasses };
        break;

      case "grade":
        // Return empty object for grade create/update (no additional data needed)
        relatedData = {};
        break;

      case "announcement":
        // Only get classes from the same school
        const announcementClasses = await prisma.class.findMany({ 
          where: { schoolId: Number(schoolId) },
          select: { id: true, name: true },
          orderBy: { name: 'asc' }
        });
        relatedData = { classes: announcementClasses };
        break;

     case "result":
        // Using only include for exams
        const resultExams = await prisma.exam.findMany({
          where: {
            lesson: {
              class: {
                schoolId: Number(schoolId)
              }
            }
          },
          include: {
            lesson: {
              include: {
                subject: {
                  select: { name: true }
                },
                class: {
                  select: {
                    name: true,
                    grade: {
                      select: { level: true }
                    }
                  }
                }
              }
            }
          }
        });
        
        // Using only include for assignments
        const resultAssignments = await prisma.assignment.findMany({
          where: {
            lesson: {
              class: {
                schoolId: Number(schoolId)
              }
            }
          },
          include: {
            lesson: {
              include: {
                subject: {
                  select: { name: true }
                },
                class: {
                  select: {
                    name: true,
                    grade: {
                      select: { level: true }
                    }
                  }
                }
              }
            }
          }
        });
        
        const resultStudents = await prisma.student.findMany({
          where: { schoolId: Number(schoolId) },
          select: { id: true, name: true, surname: true },
          orderBy: { name: 'asc' }
        });
        
        relatedData = {
          exams: resultExams,
          assignments: resultAssignments,
          students: resultStudents,
        };
        break;
      default:
        relatedData = {};
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