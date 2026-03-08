import { z } from "zod";

// ─── Assignment Mark Schema ───────────────────────────────────────────────────
export const assignmentMarkSchema = z.object({
  studentId: z.string().min(1, "Student ID required"),
  assignmentId: z.number().int().positive("Assignment ID required"),
  score: z
    .number()
    .int("Score must be a whole number")
    .min(0, "Score cannot be negative")
    .max(100, "Score cannot exceed 100"),
});

export const bulkAssignmentMarkSchema = z.object({
  classId: z.number().int().positive(),
  subjectId: z.number().int().positive(),
  teacherId: z.string().min(1),
  assignmentId: z.number().int().positive(),
  marks: z
    .array(assignmentMarkSchema)
    .min(1, "At least one mark entry required"),
});

// ─── Exam Result Schema ───────────────────────────────────────────────────────
// Primary (grade 1–5): single score
export const primaryExamResultSchema = z.object({
  studentId: z.string().min(1),
  examId: z.number().int().positive(),
  score: z
    .number()
    .int()
    .min(0, "Score cannot be negative")
    .max(100, "Score cannot exceed 100"),
});

// Secondary (grade 6–10): mcq + written
export const secondaryExamResultSchema = z.object({
  studentId: z.string().min(1),
  examId: z.number().int().positive(),
  mcqScore: z
    .number()
    .int()
    .min(0)
    .max(30, "MCQ score cannot exceed 30"),
  writtenScore: z
    .number()
    .int()
    .min(0)
    .max(60, "Written score cannot exceed 60"),
});

export const bulkExamResultSchema = z.object({
  classId: z.number().int().positive(),
  academicYear: z.string().min(1),
  results: z.array(
    z.discriminatedUnion("type", [
      z.object({ type: z.literal("primary"), ...primaryExamResultSchema.shape }),
      z.object({ type: z.literal("secondary"), ...secondaryExamResultSchema.shape }),
    ])
  ).min(1),
});

// ─── Query Param Schemas ─────────────────────────────────────────────────────
export const getAssignmentQuerySchema = z.object({
  classId: z.coerce.number().int().positive(),
  subjectId: z.coerce.number().int().positive(),
});

export const getClassDataQuerySchema = z.object({
  classId: z.coerce.number().int().positive(),
});

export type BulkAssignmentMarkInput = z.infer<typeof bulkAssignmentMarkSchema>;
export type BulkExamResultInput = z.infer<typeof bulkExamResultSchema>;
export type PrimaryExamResultInput = z.infer<typeof primaryExamResultSchema>;
export type SecondaryExamResultInput = z.infer<typeof secondaryExamResultSchema>;
