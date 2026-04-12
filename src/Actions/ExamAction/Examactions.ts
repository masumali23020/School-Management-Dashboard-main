"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getUserRoleAuth } from "@/lib/logsessition";

const PER_PAGE = 10;

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Check school access
// ─────────────────────────────────────────────────────────────────────────────

async function verifySchoolAccess(schoolId: number) {
  if (!schoolId) {
    throw new Error("No school associated with this account");
  }
  return schoolId;
}

// ─────────────────────────────────────────────────────────────────────────────
// READ - Get Exam List (School Wise)
// ─────────────────────────────────────────────────────────────────────────────

export async function getExamList({
  page = 1,
  search = "",
  classId,
  role,
  currentUserId,
}: {
  page?: number;
  search?: string;
  classId?: number;
  role: string;
  currentUserId: string;
}) {
  const { schoolId } = await getUserRoleAuth();

  if (!schoolId) {
    return { data: [], count: 0 };
  }

  const where: any = {
    lesson: {
      class: {
        schoolId: schoolId, // 🔥 School filter
      },
    },
  };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { lesson: { subject: { name: { contains: search, mode: "insensitive" } } } },
    ];
  }
  
  if (classId) {
    // Verify class belongs to this school
    const classItem = await prisma.class.findFirst({
      where: { id: classId, schoolId: schoolId },
    });
    if (classItem) {
      where.lesson.classId = classId;
    } else {
      return { data: [], count: 0 };
    }
  }

  switch (role) {
    case "teacher":
      if (currentUserId) {
        // Verify teacher belongs to this school
        const teacher = await prisma.employee.findFirst({
          where: { id: currentUserId, schoolId: schoolId, role: "TEACHER" },
        });
        if (teacher) {
          where.lesson.teacherId = currentUserId;
        } else {
          return { data: [], count: 0 };
        }
      }
      break;
    case "student":
      if (currentUserId) {
        // Verify student belongs to this school
        const student = await prisma.student.findFirst({
          where: { id: currentUserId, schoolId: schoolId },
          select: { classId: true },
        });
        if (student) {
          where.lesson.class = { students: { some: { id: currentUserId } } };
        } else {
          return { data: [], count: 0 };
        }
      }
      break;
    case "parent":
      if (currentUserId) {
        // Verify parent belongs to this school
        const parent = await prisma.parent.findFirst({
          where: { id: currentUserId, schoolId: schoolId },
        });
        if (parent) {
          where.lesson.class = { students: { some: { parentId: currentUserId } } };
        } else {
          return { data: [], count: 0 };
        }
      }
      break;
  }

  const [data, count] = await prisma.$transaction([
    prisma.exam.findMany({
      where,
      include: {
        lesson: {
          select: {
            subject: { select: { name: true } },
            teacher: { select: { name: true, surname: true } },
            class: { select: { name: true, schoolId: true } },
          },
        },
      },
      orderBy: { startTime: "desc" },
      take: PER_PAGE,
      skip: PER_PAGE * (page - 1),
    }),
    prisma.exam.count({ where }),
  ]);

  return { data, count };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET SUBJECTS FOR A CLASS (School Wise)
// ─────────────────────────────────────────────────────────────────────────────

// export async function getSubjectsForClass(classId: number) {
//   const { schoolId } = await getUserRoleAuth();

//   if (!schoolId) {
//     return [];
//   }

//   // Verify class belongs to this school
//   const classItem = await prisma.class.findFirst({
//     where: { id: classId, schoolId: schoolId },
//   });

//   if (!classItem) {
//     return [];
//   }

//   const data = await prisma.classSubjectTeacher.findMany({
//     where: {
//       classId,
//       schoolId: schoolId, // 🔥 School filter
//     },
//     include: {
//       subject: {
//         select: {
//           id: true,
//           name: true,
//         },
//       },
//       teacher: {
//         select: {
//           id: true,
//           role: true,
//           schoolId: true,
//         },
//       },
//     },
//   });

//   // Only TEACHER and verify teacher belongs to this school
//   const filtered = data.filter(
//     (cst) => cst.teacher.role === "TEACHER" && cst.teacher.schoolId === schoolId
//   );

//   return filtered.map((cst) => ({
//     cstId: cst.id,
//     subjectId: cst.subject.id,
//     subjectName: cst.subject.name,
//     teacherId: cst.teacher.id,
//   }));
// }

// ─────────────────────────────────────────────────────────────────────────────
// CREATE EXAMS BULK (School Wise)
// ─────────────────────────────────────────────────────────────────────────────

// export async function createExamsBulk(payload: {
//   title: string;
//   startTime: string;
//   endTime: string;
//   classes: {
//     classId: number;
//     gradeLevel: number;
//     subjects: {
//       cstId: number;
//       subjectId: number;
//       subjectName: string;
//       teacherId: string;
//     }[];
//   }[];
// }): Promise<{ success: boolean; created?: number; message?: string }> {
//   try {
//     const { schoolId, role } = await getUserRoleAuth();

//     if (!schoolId) {
//       return {
//         success: false,
//         message: "No school associated with this account",
//       };
//     }

//     if (role !== "admin") {
//       return {
//         success: false,
//         message: "Only admin can create exams",
//       };
//     }

//     const totalSubjects = payload.classes.reduce(
//       (acc, c) => acc + c.subjects.length,
//       0
//     );

//     if (totalSubjects === 0) {
//       return {
//         success: false,
//         message:
//           "No subjects assigned to the selected classes. Please assign subjects via Class Subject Teacher first.",
//       };
//     }

//     let created = 0;

//     for (const cls of payload.classes) {
//       // Verify class belongs to this school
//       const classItem = await prisma.class.findFirst({
//         where: { id: cls.classId, schoolId: schoolId },
//       });

//       if (!classItem) {
//         continue;
//       }

//       const primary = cls.gradeLevel <= 5;

//       for (const subj of cls.subjects) {
//         // Verify CST belongs to this school
//         const cst = await prisma.classSubjectTeacher.findFirst({
//           where: {
//             id: subj.cstId,
//             schoolId: schoolId,
//             classId: cls.classId,
//           },
//         });

//         if (!cst) {
//           continue;
//         }

//         // 1. Find existing lesson for this CST row
//         let lesson = await prisma.lesson.findFirst({
//           where: {
//             classSubjectTeacherId: subj.cstId,
//             class: { schoolId: schoolId },
//           },
//           select: { id: true },
//         });

//         // 2. If no lesson exists, auto-create a placeholder
//         if (!lesson) {
//           lesson = await prisma.lesson.create({
//             data: {
//               name: `${subj.subjectName}`,
//               day: "MONDAY",
//               startTime: new Date(payload.startTime),
//               endTime: new Date(payload.endTime),
//               subjectId: subj.subjectId,
//               classId: cls.classId,
//               teacherId: subj.teacherId,
//               classSubjectTeacherId: subj.cstId,
//             },
//             select: { id: true },
//           });
//         }

//         // 3. Create the exam linked to the lesson
//         await prisma.exam.create({
//           data: {
//             title: payload.title,
//             startTime: new Date(payload.startTime),
//             endTime: new Date(payload.endTime),
//             totalMarks: primary ? 100 : 90,
//             mcqMarks: primary ? null : 30,
//             writtenMarks: primary ? 100 : 60,
//             practicalMarks: null,
//             lessonId: lesson.id,
//           },
//         });

//         created++;
//       }
//     }

//     revalidatePath("/list/exams");
//     return { success: true, created };
//   } catch (err: any) {
//     console.error("createExamsBulk error:", err);
//     return { success: false, message: err?.message ?? "Unknown error" };
//   }
// }

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE EXAM (School Wise)
// ─────────────────────────────────────────────────────────────────────────────

export async function updateExamAction(data: {
  id: number;
  title: string;
  startTime: string;
  endTime: string;
}): Promise<{ success: boolean; message?: string }> {
  try {
    const { schoolId, role } = await getUserRoleAuth();

    if (!schoolId) {
      return { success: false, message: "No school associated with this account" };
    }

    if (role !== "admin") {
      return { success: false, message: "Only admin can update exams" };
    }

    // Verify exam belongs to this school
    const exam = await prisma.exam.findFirst({
      where: {
        id: data.id,
        lesson: {
          class: {
            schoolId: schoolId,
          },
        },
      },
    });

    if (!exam) {
      return { success: false, message: "Exam not found in your school" };
    }

    await prisma.exam.update({
      where: { id: data.id },
      data: {
        title: data.title,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
      },
    });
    
    revalidatePath("/list/exams");
    return { success: true };
  } catch (error) {
    console.error("updateExamAction error:", error);
    return { success: false, message: "Failed to update exam" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE EXAM (School Wise)
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteExamAction(
  id: number
): Promise<{ success: boolean; message?: string }> {
  try {
    const { schoolId, role } = await getUserRoleAuth();

    if (!schoolId) {
      return { success: false, message: "No school associated with this account" };
    }

    if (role !== "admin") {
      return { success: false, message: "Only admin can delete exams" };
    }

    // Verify exam belongs to this school and check for results
    const exam = await prisma.exam.findFirst({
      where: {
        id: id,
        lesson: {
          class: {
            schoolId: schoolId,
          },
        },
      },
      include: {
        results: {
          select: { id: true },
        },
      },
    });

    if (!exam) {
      return { success: false, message: "Exam not found in your school" };
    }

    // Check if exam has results
    if (exam.results.length > 0) {
      return {
        success: false,
        message: `Cannot delete exam because it has ${exam.results.length} result(s). Please delete results first.`,
      };
    }

    await prisma.exam.delete({ where: { id } });
    
    revalidatePath("/list/exams");
    return { success: true };
  } catch (error) {
    console.error("deleteExamAction error:", error);
    return { success: false, message: "Failed to delete exam" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET EXAM BY ID (School Wise)
// ─────────────────────────────────────────────────────────────────────────────

export async function getExamById(examId: number) {
  const { schoolId } = await getUserRoleAuth();

  if (!schoolId) {
    return null;
  }

  const exam = await prisma.exam.findFirst({
    where: {
      id: examId,
      lesson: {
        class: {
          schoolId: schoolId,
        },
      },
    },
    include: {
      lesson: {
        include: {
          subject: true,
          class: {
            include: {
              grade: true,
            },
          },
          teacher: true,
        },
      },
      results: {
        include: {
          student: {
            select: {
              id: true,
              name: true,
              surname: true,
            },
          },
        },
      },
    },
  });

  return exam;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET EXAMS BY CLASS (School Wise)
// ─────────────────────────────────────────────────────────────────────────────

export async function getExamsByClass(classId: number) {
  const { schoolId } = await getUserRoleAuth();

  if (!schoolId) {
    return [];
  }

  // Verify class belongs to this school
  const classItem = await prisma.class.findFirst({
    where: { id: classId, schoolId: schoolId },
  });

  if (!classItem) {
    return [];
  }

  const exams = await prisma.exam.findMany({
    where: {
      lesson: {
        classId: classId,
        class: {
          schoolId: schoolId,
        },
      },
    },
    include: {
      lesson: {
        include: {
          subject: {
            select: { name: true },
          },
        },
      },
      results: {
        select: { id: true },
      },
    },
    orderBy: { startTime: "desc" },
  });

  return exams;
}

// Actions/ExamAction/Examactions.ts (আপডেটেড অংশ)

// ─────────────────────────────────────────────────────────────────────────────
// GET SUBJECTS FOR A CLASS (School Wise with Session)
// ─────────────────────────────────────────────────────────────────────────────

export async function getSubjectsForClass(classId: number, session?: string) {
  const { schoolId } = await getUserRoleAuth();

  if (!schoolId) {
    return [];
  }

  // Verify class belongs to this school
  const classItem = await prisma.class.findFirst({
    where: { id: classId, schoolId: schoolId },
  });

  if (!classItem) {
    return [];
  }

  // If session not provided, get latest session
  let academicYear = session;
  if (!academicYear) {
    const latestCST = await prisma.classSubjectTeacher.findFirst({
      where: { classId, schoolId: schoolId },
      orderBy: { academicYear: "desc" },
      select: { academicYear: true },
    });
    academicYear = latestCST?.academicYear || new Date().getFullYear().toString();
  }

  const data = await prisma.classSubjectTeacher.findMany({
    where: {
      classId,
      academicYear: academicYear,
      schoolId: schoolId,
    },
    include: {
      subject: {
        select: {
          id: true,
          name: true,
        },
      },
      teacher: {
        select: {
          id: true,
          role: true,
          schoolId: true,
        },
      },
    },
  });

  // Only TEACHER and verify teacher belongs to this school
  const filtered = data.filter(
    (cst) => cst.teacher.role === "TEACHER" && cst.teacher.schoolId === schoolId
  );

  return filtered.map((cst) => ({
    cstId: cst.id,
    subjectId: cst.subject.id,
    subjectName: cst.subject.name,
    teacherId: cst.teacher.id,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE EXAMS BULK (School Wise with Session)
// ─────────────────────────────────────────────────────────────────────────────

export async function createExamsBulk(payload: {
  title: string;
  startTime: string;
  endTime: string;
  session: string;
  classes: {
    classId: number;
    gradeLevel: number;
    subjects: {
      cstId: number;
      subjectId: number;
      subjectName: string;
      teacherId: string;
    }[];
  }[];
}): Promise<{ success: boolean; created?: number; message?: string }> {
  console.log("========== CREATE EXAMS BULK START ==========");
  console.log("Payload received:", JSON.stringify(payload, null, 2));
  
  try {
    const { schoolId, role } = await getUserRoleAuth();
    console.log("User info - schoolId:", schoolId, "role:", role);

    if (!schoolId) {
      console.log("ERROR: No schoolId found");
      return {
        success: false,
        message: "No school associated with this account",
      };
    }

    if (role !== "admin") {
      console.log("ERROR: User is not admin. Role:", role);
      return {
        success: false,
        message: "Only admin can create exams",
      };
    }

    const totalSubjects = payload.classes.reduce(
      (acc, c) => acc + c.subjects.length,
      0
    );
    console.log("Total subjects across all classes:", totalSubjects);

    if (totalSubjects === 0) {
      console.log("ERROR: No subjects found");
      return {
        success: false,
        message:
          "No subjects assigned to the selected classes. Please assign subjects via Class Subject Teacher first.",
      };
    }

    let created = 0;
    let skipped = 0;

    for (const cls of payload.classes) {
      console.log(`\n--- Processing Class ID: ${cls.classId}, Grade Level: ${cls.gradeLevel} ---`);
      console.log(`Subjects for this class: ${cls.subjects.length}`);
      
      // Verify class belongs to this school
      const classItem = await prisma.class.findFirst({
        where: { id: cls.classId, schoolId: schoolId },
      });
      console.log(`Class found: ${classItem ? "YES" : "NO"}`);

      if (!classItem) {
        console.log(`Skipping class ${cls.classId} - not found in school ${schoolId}`);
        continue;
      }

      const primary = cls.gradeLevel <= 5;
      console.log(`Primary level: ${primary} (Grade ${cls.gradeLevel} ${primary ? "<= 5" : "> 5"})`);

      for (const subj of cls.subjects) {
        console.log(`\n  --- Processing Subject: ${subj.subjectName} (ID: ${subj.subjectId}) ---`);
        console.log(`    CST ID: ${subj.cstId}, Teacher ID: ${subj.teacherId}`);
        
        // Verify CST belongs to this school and session
        const cst = await prisma.classSubjectTeacher.findFirst({
          where: {
            id: subj.cstId,
            schoolId: schoolId,
            classId: cls.classId,
            academicYear: payload.session,
          },
        });

        console.log(`    CST found: ${cst ? "YES" : "NO"}`);
        if (cst) {
          console.log(`    CST details - academicYear: ${cst.academicYear}, classId: ${cst.classId}`);
        }

        if (!cst) {
          console.log(`    ❌ SKIPPED: No CST found for subject ${subj.subjectName} in session ${payload.session}`);
          skipped++;
          continue;
        }

        // 1. Find existing lesson for this CST row
        let lesson = await prisma.lesson.findFirst({
          where: {
            classSubjectTeacherId: subj.cstId,
            class: { schoolId: schoolId },
          },
          select: { id: true, name: true },
        });

        console.log(`    Existing lesson found: ${lesson ? `YES (ID: ${lesson.id})` : "NO"}`);

        // 2. If no lesson exists, auto-create a placeholder
        if (!lesson) {
          console.log(`    Creating new lesson for ${subj.subjectName}...`);
          try {
            lesson = await prisma.lesson.create({
              data: {
                name: `${subj.subjectName} Exam`,
                day: "MONDAY",
                startTime: new Date(payload.startTime),
                endTime: new Date(payload.endTime),
                subjectId: subj.subjectId,
                classId: cls.classId,
                teacherId: subj.teacherId,
                classSubjectTeacherId: subj.cstId,
              },
              select: { id: true, name: true },
            });
            console.log(`    ✅ Lesson created with ID: ${lesson.id}`);
          } catch (lessonError) {
            console.error(`    ❌ Failed to create lesson:`, lessonError);
            continue;
          }
        }

        // 3. Create the exam linked to the lesson
        const examData = {
          title: payload.title,
          startTime: new Date(payload.startTime),
          endTime: new Date(payload.endTime),
          totalMarks: primary ? 100 : 90,
          mcqMarks: primary ? null : 30,
          writtenMarks: primary ? 100 : 60,
          practicalMarks: null,
          lessonId: lesson.id,
          session: parseInt(payload.session) || new Date().getFullYear(),
        };
        console.log(`    Creating exam with data:`, examData);

        try {
          await prisma.exam.create({
            data: examData,
          });
          console.log(`    ✅ Exam created successfully for ${subj.subjectName}`);
          created++;
        } catch (examError) {
          console.error(`    ❌ Failed to create exam:`, examError);
        }
      }
    }

    console.log(`\n========== SUMMARY ==========`);
    console.log(`✅ Created: ${created} exams`);
    console.log(`❌ Skipped: ${skipped} subjects`);
    console.log(`Session: ${payload.session}`);
    console.log(`================================\n`);
    
    revalidatePath("/list/exams");
    
    if (created === 0) {
      return { 
        success: false, 
        created: 0, 
        message: `No exams were created. ${skipped} subjects were skipped. Please check if subjects are assigned for session ${payload.session}.` 
      };
    }
    
    return { success: true, created, message: `${created} exam(s) created successfully for session ${payload.session}` };
  } catch (err: any) {
    console.error("========== CREATE EXAMS BULK ERROR ==========");
    console.error("Error details:", err);
    console.error("Error message:", err?.message);
    console.error("Error stack:", err?.stack);
    console.error("=============================================");
    return { success: false, message: err?.message ?? "Unknown error" };
  }
}

export async function getAvailableSessions(): Promise<string[]> {
  const { schoolId } = await getUserRoleAuth();

  if (!schoolId) {
    console.log("No schoolId found in getAvailableSessions");
    return [];
  }

  try {
    const sessions = await prisma.classSubjectTeacher.findMany({
      where: { schoolId: schoolId },
      distinct: ["academicYear"],
      select: { academicYear: true },
      orderBy: { academicYear: "desc" },
    });

    console.log("Available sessions from ClassSubjectTeacher:", sessions);
    return sessions.map(s => s.academicYear);
  } catch (error) {
    console.error("Error fetching available sessions:", error);
    return [];
  }
}
