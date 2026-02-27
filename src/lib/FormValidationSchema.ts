import { z } from "zod";


export const subjectSchema = z.object({
  id: z.coerce.number().optional(),
  name: z
    .string()
    .min(1, { message: "Subject name must be required!" }),
  teachers: z.array(z.string()), 
    
});

export type SubjectSchema = z.infer<typeof subjectSchema>;

export const classSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(1, { message: "Subject name is required!" }),
  capacity: z.coerce.number().min(1, { message: "Capacity name is required!" }),
  gradeId: z.coerce.number().min(1, { message: "Grade name is required!" }),
  supervisorId: z.coerce.string().optional(),
});

export type ClassSchema = z.infer<typeof classSchema>;


export const teacherSchema = z.object({
  id: z.string().optional(),
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters long!" })
    .max(20, { message: "Username must be at most 20 characters long!" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long!" })
    .optional()
    .or(z.literal("")),
  name: z.string().min(1, { message: "First name is required!" }),
  surname: z.string().min(1, { message: "Last name is required!" }),
  email: z
    .string()
    .email({ message: "Invalid email address!" })
    .optional()
    .or(z.literal("")),
  phone: z.string().optional(),
  address: z.string(),
  img: z.string().optional(),
  bloodType: z.string().min(1, { message: "Blood Type is required!" }),
  birthday: z.coerce.date({ message: "Birthday is required!" }),
  sex: z.enum(["MALE", "FEMALE"], { message: "Sex is required!" }),
  subjects: z.array(z.string()).optional(), // subject ids
});

export type TeacherSchema = z.infer<typeof teacherSchema>;

export const studentSchema = z.object({
  id: z.string().optional(),
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters long!" })
    .max(20, { message: "Username must be at most 20 characters long!" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long!" })
    .optional()
    .or(z.literal("")),
  name: z.string().min(1, { message: "First name is required!" }),
  surname: z.string().min(1, { message: "Last name is required!" }),
  email: z
    .string()
    .email({ message: "Invalid email address!" })
    .optional()
    .or(z.literal("")),
  phone: z.string().optional(),
  address: z.string(),
  img: z.string().optional(),
  bloodType: z.string().min(1, { message: "Blood Type is required!" }),
  birthday: z.coerce.date({ message: "Birthday is required!" }),
  sex: z.enum(["MALE", "FEMALE"], { message: "Sex is required!" }),
  gradeId: z.coerce.number().min(1, { message: "Grade is required!" }),
  classId: z.coerce.number().min(1, { message: "Class is required!" }),
  parentId: z.string().min(1, { message: "Parent Id is required!" }),
});

export type StudentSchema = z.infer<typeof studentSchema>;

export const examSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().min(1, { message: "Title name is required!" }),
  startTime: z.coerce.date({ message: "Start time is required!" }),
  endTime: z.coerce.date({ message: "End time is required!" }),
  lessonId: z.coerce.number({ message: "Lesson is required!" }),
});

export type ExamSchema = z.infer<typeof examSchema>;

export const assignmentSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().min(1, { message: "Title name is required!" }),
  startDate: z.coerce.date({ message: "Start time is required!" }),
  dueDate: z.coerce.date({ message: "dueDate time is required!" }),
  lessonId: z.coerce.number({ message: "Lesson is required!" }),
});

export type AssignmentSchema = z.infer<typeof assignmentSchema>;


export const eventSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().min(1, { message: "Title name is required!" }),
  description: z.string().min(1, { message: "description name is required!" }),
  startTime: z.coerce.date({ message: "Start time is required!" }),
  endTime: z.coerce.date({ message: "End time is required!" }),
  classId: z.coerce.number({ message: "Class is required!" }),
});

export type EventSchema = z.infer<typeof eventSchema>;

export const announcementSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().min(1, { message: "Title name is required!" }),
  description: z.string().min(1, { message: "description name is required!" }),
  date: z.coerce.date({ message: "Date is required!" }),
  classId: z.coerce.number({ message: "Class is required!" }),
});

export type AnnouncementSchema = z.infer<typeof announcementSchema>;
// Enum from Prisma model
export const DayEnum = z.enum([
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
]);

export const lessonSchema = z.object({
  id: z.coerce.number().optional(), // Auto increment in Prisma
  name: z.string().min(1, { message: "Lesson name is required" }),
  day: DayEnum,
  startTime: z.coerce.date({ message: "Start time is required" }),
  endTime: z.coerce.date({ message: "End time is required" }),

  subjectId: z.coerce.number({ message: "Subject is required" }),
  classId: z.coerce.number({ message: "Class is required" }),
  teacherId: z.string().min(1, { message: "Teacher is required" }),
});

export type LessonSchema = z.infer<typeof lessonSchema>;


export const resultSchema = z.object({
  id: z.number().optional(),

  score: z.coerce
    .number({
      required_error: "Score is required",
      invalid_type_error: "Score must be a number",
    })
    .min(0, { message: "Score must be at least 0" })
    .max(100, { message: "Score cannot be more than 100" }),
    examId: z.coerce.number({ message: "Exam is required" }),
    assignmentId: z.coerce.number({ message: "Assignment is required" }),
    studentId: z.string().min(1, { message: "Student is required" }),
})
.refine(
  (data) => data.examId || data.assignmentId,
  {
    message: "Either Exam or Assignment must be selected",
    path: ["examId"], 
  }
);

export type ResultSchema = z.infer<typeof resultSchema>;

export const attendanceSchema = z.object({
  id: z.number().optional(),
  studentId: z.string().min(1, { message: "Student ID is required!" }),
  lessonId: z.number().min(1, { message: "Lesson ID is required!" }),
  date: z.date({ required_error: "Date is required!" }),
  present: z.boolean().default(false),
});

// বাল্ক অ্যাটেন্ডেন্স স্কিমা
export const BulkAttendanceSchema = z.object({
  attendances: z.array(
    z.object({
      id: z.number().optional(),
      studentId: z.string(),
      lessonId: z.number(),
      date: z.date(),
      present: z.boolean(),
    })
  ),
});

export type AttendanceSchema = z.infer<typeof attendanceSchema>;
export type BulkAttendanceSchema = z.infer<typeof BulkAttendanceSchema>;