// lib/FormValidationSchema.ts

import { z } from "zod";

export const classSubjectTeacherSchema = z.object({
  id: z.number().optional(),
  classId: z.coerce.number().min(1, { message: "Class is required" }),
  
  subjectId: z.coerce.number().min(1, { message: "Subject is required" }),
  
  teacherId: z.string().min(1, { message: "Teacher is required" }),
  
  academicYear: z.string({
    required_error: "Academic year is required"
  })
  .min(4, { message: "Academic year must be at least 4 characters" })
  .max(9, { message: "Academic year must be at most 9 characters" })
  .regex(/^\d{4}(-\d{4})?$/, { message: "Invalid format. Use YYYY or YYYY-YYYY" }),
});

export type ClassSubjectTeacherSchema = z.infer<typeof classSubjectTeacherSchema>;


// Class Schema (আপডেট)
export const upClassSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, { message: "Class name is required" }),
  capacity: z.coerce.number().min(1, { message: "Capacity is required" }),
  gradeId: z.number().min(1, { message: "Grade is required" }),
  supervisorId: z.string().optional().nullable(),
  subjectTeachers: z.array(classSubjectTeacherSchema).optional(), // নতুন
});

export type UpClassSchema = z.infer<typeof upClassSchema>;

// Subject Schema (আপডেট)
export const upSubjectSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, { message: "Subject name is required" }),
  code: z.string().optional(),
  classTeachers: z.array(classSubjectTeacherSchema).optional(), // নতুন
});

export type UpSubjectSchema = z.infer<typeof upSubjectSchema>;


export const subjectSchema = z.object({
  id: z.coerce.number().optional(),
  name: z
    .string()
    .min(1, { message: "Subject name must be required!" }),
  // teachers: z.array(z.string()), 
    
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

  // Auth
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30)
    .regex(/^[a-z0-9_]+$/, "Lowercase letters, numbers, underscores only"),

  password: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.length >= 8,
      "Password must be at least 8 characters"
    ),

  email: z.string().email("Invalid email").optional().or(z.literal("")),

  // Personal
  name:      z.string().min(1, "First name is required"),
  surname:   z.string().min(1, "Last name is required"),
  phone:     z.string().optional().or(z.literal("")),
  address:   z.string().min(1, "Address is required"),
  bloodType: z.string().min(1, "Blood type is required"),

  // ★ string → Date transform: HTML input "YYYY-MM-DD" → Date object
    birthday:  z.string().min(1, "Birthday is required"),

  sex: z.enum(["MALE", "FEMALE"]),

  // Relations
  subjects: z.array(z.string()).optional(),
  img:      z.string().optional().or(z.literal("")),
});

export type TeacherSchema = z.infer<typeof teacherSchema>;
// TeacherSchema.birthday এখন Date — Prisma DateTime এর সাথে মিলবে

export const staffSchema = z.object({
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
  
});

export type StaffSchema = z.infer<typeof staffSchema>;


export const cashierSchema = z.object({
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
  
});

export type CashierSchema = z.infer<typeof cashierSchema>;

export const adminSchema = z.object({
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
  
});

export type AdminSchema = z.infer<typeof adminSchema>;

export const parentSchema = z.object({
  id: z.string().optional(),
  username: z
    .string()
    .min(4, { message: "Username must be at least 3 characters long!" })
    .max(20, { message: "Username must be at most 20 characters long!" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long!" })
    .optional()
    .or(z.literal("")),
  surname: z.string().min(1, { message: "surname name is required!" }),
  name: z.string().min(1, { message: "name name is required!" }),
  email: z
    .string()
    .email({ message: "Invalid email address!" })
    .optional()
    .or(z.literal("")),
  phone: z.string().min(1, { message: "Phone is required!" }),
  address: z.string().min(1, { message: "Address is required!" }),
  studentIds: z.array(z.string()).optional(),
});

export type ParentSchema = z.infer<typeof parentSchema>;

export const gradeSchema = z.object({
  id: z.coerce.number().optional(),
  level: z.coerce.number().min(1, { message: "Level is required!" }),
});

 export type GradeSchema = z.infer<typeof gradeSchema>;



export const studentSchema = z.object({
  id: z.string().optional(),
  username: z
    .string()
    .min(4, { message: "Username must be at least 3 characters long!" })
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
  birthday:  z.string().min(1, "Birthday is required"),
  sex: z.enum(["MALE", "FEMALE"], { message: "Sex is required!" }),
  gradeId: z.coerce.number().min(1, { message: "Grade is required!" }),
  classId: z.coerce.number().min(1, { message: "Class is required!" }),
  parentId: z.string().optional(),
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

// export const lessonSchema = z.object({
//   id: z.coerce.number().optional(), // Auto increment in Prisma
//   name: z.string().min(1, { message: "Lesson name is required" }),
//   day: DayEnum,
//   startTime: z.coerce.date({ message: "Start time is required" }),
//   endTime: z.coerce.date({ message: "End time is required" }),

//   subjectId: z.coerce.number({ message: "Subject is required" }),
//   classId: z.coerce.number({ message: "Class is required" }),
//   teacherId: z.string().min(1, { message: "Teacher is required" }),
// });

// export type LessonSchema = z.infer<typeof lessonSchema>;

// lib/FormValidationSchema.ts



// export const DayEnum = z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]);

export const lessonSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, { message: "Lesson name is required" }),
  day: DayEnum,
  startTime: z.string().min(1, { message: "Start time is required" }),
  endTime: z.string().min(1, { message: "End time is required" }),
  classId: z.coerce.number().min(1, { message: "Class is required" }),
  subjectId: z.coerce.number().optional(), // Will be set from assignment
  teacherId: z.string().optional(), // Will be set from assignment
  classSubjectTeacherId: z.coerce.number().min(1, { message: "Subject-teacher assignment is required" }),
}).refine((data) => {
  const start = new Date(data.startTime);
  const end = new Date(data.endTime);
  return end > start;
}, {
  message: "End time must be after start time",
  path: ["endTime"],
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

// sdfsdfsfsf   
// ─── Plan duration map (days) ─────────────────────────────────────────────────
export const PLAN_DURATIONS_DAYS: Record<string, number> = {
  FREE:     30,
  STANDARD: 180,
  POPULAR:  365,
};
 
// ─── School Registration Schema ───────────────────────────────────────────────
 
export const SchoolRegistrationSchema = z.object({
  // School fields
  schoolName: z
    .string()
    .min(3, "School name must be at least 3 characters")
    .max(100, "School name must be under 100 characters")
    .trim(),
 
  shortName: z
    .string()
    .max(20, "Short name must be under 20 characters")
    .trim()
    .optional(),

  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters") // সর্বনিম্ন ৩ অক্ষর
    .max(100, "Slug must be under 100 characters")
    .trim()
    .toLowerCase() // সব ছোট হাতের অক্ষর করে দিবে
    .regex(/^[a-z0-9-]+$/, "Slug can only contain letters, numbers, and hyphens") // স্পেস বা স্পেশাল ক্যারেক্টার ব্লক করবে
    .optional(),

 
  eiinNumber: z
    .string()
    .regex(/^\d{6,10}$/, "EIIN must be 6–10 digits")
    .optional()
    .or(z.literal("")),
 
  email: z
    .string()
    .email("Invalid school email address")
    .optional()
    .or(z.literal("")),
 
  phone: z
    .string()
    .regex(/^(\+?880|0)1[3-9]\d{8}$/, "Invalid Bangladeshi phone number")
    .optional()
    .or(z.literal("")),
 
  address: z.string().max(255).optional(),
 
  planId: z
    .number({ required_error: "Plan is required" })
    .int()
    .positive("Plan ID must be a positive integer"),
 
  planType: z.enum(["FREE", "STANDARD", "POPULAR"], {
    required_error: "Plan type is required",
  }),
 
  // Admin Employee fields
  adminUsername: z
    .string()
    .min(4, "Username must be at least 4 characters")
    .max(30, "Username must be under 30 characters")
    .regex(
      /^[a-z0-9_]+$/,
      "Username can only contain lowercase letters, numbers, and underscores"
    )
    .trim(),
 
  adminPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
 
  adminName: z
    .string()
    .min(2, "First name must be at least 2 characters")
    .max(50)
    .trim(),
 
  adminSurname: z
    .string()
    .min(2, "Last name must be at least 2 characters")
    .max(50)
    .trim(),
 
  adminEmail: z
    .string()
    .email("Invalid admin email address")
    .optional()
    .or(z.literal("")),
 
  adminPhone: z
    .string()
    .regex(/^(\+?880|0)1[3-9]\d{8}$/, "Invalid phone number")
    .optional()
    .or(z.literal("")),
});
 
export type SchoolRegistrationInput = z.infer<typeof SchoolRegistrationSchema>;
 
// ─── Inferred output type after transform ─────────────────────────────────────
export type SchoolRegistrationParsed = SchoolRegistrationInput;
 