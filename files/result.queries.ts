import { db } from "@/lib/db";

// ─── Teacher helpers ──────────────────────────────────────────────────────────

/**
 * Get the teacher record by Clerk userId (stored as Teacher.id)
 */
export async function getTeacherByClerkId(clerkId: string) {
  return db.teacher.findUnique({
    where: { id: clerkId },
    select: { id: true, name: true, surname: true, username: true },
  });
}

// ─── Class helpers ────────────────────────────────────────────────────────────

/**
 * Get all classes assigned to a teacher via ClassSubjectTeacher
 */
export async function getClassesByTeacher(teacherId: string) {
  const records = await db.classSubjectTeacher.findMany({
    where: { teacherId },
    select: {
      class: {
        select: {
          id: true,
          name: true,
          gradeId: true,
          grade: { select: { level: true } },
        },
      },
    },
    distinct: ["classId"],
  });

  return records.map((r) => r.class);
}

/**
 * Get all subjects assigned in a specific class for a teacher
 */
export async function getSubjectsByClassAndTeacher(
  classId: number,
  teacherId: string
) {
  const records = await db.classSubjectTeacher.findMany({
    where: { classId, teacherId },
    select: {
      subject: { select: { id: true, name: true } },
    },
  });
  return records.map((r) => r.subject);
}

/**
 * Get all subjects in a class (for exam mode – all subjects, not just teacher's)
 */
export async function getAllSubjectsByClass(classId: number) {
  const records = await db.classSubjectTeacher.findMany({
    where: { classId },
    select: {
      subject: { select: { id: true, name: true } },
      subjectId: true,
    },
    distinct: ["subjectId"],
  });
  return records.map((r) => r.subject);
}

// ─── Student helpers ──────────────────────────────────────────────────────────

/**
 * Get all students in a class
 */
export async function getStudentsByClass(classId: number) {
  return db.student.findMany({
    where: { classId },
    select: {
      id: true,
      name: true,
      surname: true,
      username: true,
    },
    orderBy: { name: "asc" },
  });
}

// ─── Assignment helpers ───────────────────────────────────────────────────────

/**
 * Find the latest assignment for a given class + subject via lesson
 */
export async function getAssignmentByClassSubject(
  classId: number,
  subjectId: number,
  teacherId: string
) {
  const cst = await db.classSubjectTeacher.findFirst({
    where: { classId, subjectId, teacherId },
    select: { id: true },
  });

  if (!cst) return null;

  const lesson = await db.lesson.findFirst({
    where: { classId, subjectId, teacherId, classSubjectTeacherId: cst.id },
    select: { id: true },
  });

  if (!lesson) return null;

  return db.assignment.findFirst({
    where: { lessonId: lesson.id },
    orderBy: { dueDate: "desc" },
    select: {
      id: true,
      title: true,
      startDate: true,
      dueDate: true,
      lessonId: true,
    },
  });
}

/**
 * Get existing assignment results for a specific assignment + class
 */
export async function getExistingAssignmentResults(
  assignmentId: number,
  studentIds: string[]
) {
  return db.result.findMany({
    where: {
      assignmentId,
      studentId: { in: studentIds },
    },
    select: {
      id: true,
      studentId: true,
      score: true,
      totalScore: true,
    },
  });
}

// ─── Exam helpers ─────────────────────────────────────────────────────────────

/**
 * Get the active exam for a lesson
 */
export async function getExamByLesson(lessonId: number) {
  return db.exam.findFirst({
    where: { lessonId },
    orderBy: { startTime: "desc" },
    select: {
      id: true,
      title: true,
      totalMarks: true,
      mcqMarks: true,
      writtenMarks: true,
      practicalMarks: true,
    },
  });
}

/**
 * Get all exams for a class grouped by subject
 */
export async function getExamsByClass(classId: number) {
  const lessons = await db.lesson.findMany({
    where: { classId },
    select: {
      id: true,
      subjectId: true,
      subject: { select: { id: true, name: true } },
      exams: {
        orderBy: { startTime: "desc" },
        take: 1,
        select: {
          id: true,
          title: true,
          totalMarks: true,
          mcqMarks: true,
          writtenMarks: true,
        },
      },
    },
  });

  // De-duplicate by subjectId, take most recent exam per subject
  const map = new Map<number, (typeof lessons)[0]>();
  for (const lesson of lessons) {
    if (!map.has(lesson.subjectId) && lesson.exams.length > 0) {
      map.set(lesson.subjectId, lesson);
    }
  }
  return Array.from(map.values());
}

/**
 * Get existing exam results for a class
 */
export async function getExistingExamResults(
  examIds: number[],
  studentIds: string[]
) {
  return db.result.findMany({
    where: {
      examId: { in: examIds },
      studentId: { in: studentIds },
    },
    select: {
      id: true,
      studentId: true,
      examId: true,
      score: true,
      mcqScore: true,
      writtenScore: true,
      totalScore: true,
    },
  });
}

// ─── Grade helpers ────────────────────────────────────────────────────────────

export async function getGradeLevel(classId: number): Promise<number> {
  const cls = await db.class.findUnique({
    where: { id: classId },
    select: { grade: { select: { level: true } } },
  });
  return cls?.grade.level ?? 0;
}
