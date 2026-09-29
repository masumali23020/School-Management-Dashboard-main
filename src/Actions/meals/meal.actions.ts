// src/lib/actions/meal.actions.ts
"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Decimal } from "@prisma/client/runtime/library";
import {
  MealEntrySchema,
  BulkMealEntrySchema,
  MealTypeSchema,
  MealPaymentSchema,
  MonthlyBillQuerySchema,
  type MealEntryInput,
  type BulkMealEntryInput,
  type MealTypeInput,
  type MealPaymentInput,
  type MonthlyBillQuery,
} from "@/lib/FormValidationSchema";
import { getUserRoleAuth } from "@/lib/logsessition";

// ─── Return Types ─────────────────────────────────────────────────────────────

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export interface MonthlyBillResult {
  studentId: string;
  studentName: string;
  month: number;
  year: number;
  breakdown: {
    mealTypeId: number;
    mealTypeName: string;
    count: number;
    totalAmount: string;
  }[];
  grossTotal: string;
  totalPaid: string;
  balanceDue: string;
  monthLabel: string;
  recentLogs: {
    id: number;
    date: string;
    mealTypeName: string;
    appliedRate: string;
    quantity: number;
    status: string;
    isGuest: boolean;
  }[];
}

/**
 * Student shape returned to client components.
 * classId is Int (matches Student.classId in schema).
 */
export interface StudentForMeal {
  id: string;
  name: string;
  surname: string;
  rollNumber: string | null; // from StudentClassHistory for the selected year
  classId: number | null;
  className: string | null;
  academicYear: string | null; // from StudentClassHistory.academicYear
}

/**
 * Class shape for the class filter dropdown.
 * Class has no session — session comes from StudentClassHistory.academicYear.
 */
export interface ClassForFilter {
  id: number;
  name: string;
}

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function getSchoolId(): Promise<number | null> {
  const { schoolId } = await getUserRoleAuth();
  return schoolId ?? null;
}

// ─── Filter data fetchers ─────────────────────────────────────────────────────

/**
 * Distinct academic years from StudentClassHistory for this school.
 * e.g. ["2026", "2025", "2024"]
 *
 * WHY StudentClassHistory and not Class:
 *   Class has no session/year field in this schema.
 *   The academic year lives only in StudentClassHistory.academicYear.
 */
export async function getSessionsForSchool(): Promise<string[]> {
  const schoolId = await getSchoolId();
  if (!schoolId) return [];

  // StudentClassHistory has its own schoolId (via School.studentClassHistories)
  const rows = await prisma.studentClassHistory.findMany({
    where: { schoolId },
    select: { academicYear: true },
    distinct: ["academicYear"],
    orderBy: { academicYear: "desc" },
  });

  return rows
    .map((r) => r.academicYear)
    .filter((y): y is string => Boolean(y));
}

/**
 * All classes for a school.
 * When `academicYear` is provided we only return classes that actually have
 * students enrolled in that year (via StudentClassHistory).
 */
export async function getClassesForSchool(
  academicYear?: string
): Promise<ClassForFilter[]> {
  const schoolId = await getSchoolId();
  if (!schoolId) return [];

  const classes = await prisma.class.findMany({
    where: {
      schoolId,
      // If a year is selected, only show classes that have history entries
      ...(academicYear
        ? {
            classHistory: {
              some: { academicYear },
            },
          }
        : {}),
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return classes.map((c) => ({ id: c.id, name: c.name }));
}

/**
 * Students filtered by academicYear and/or classId.
 *
 * Schema relationships used:
 *   Student.classId          → current class (direct FK, always set)
 *   Student.classHistory[]   → StudentClassHistory (year, rollNumber, classId)
 *
 * Filter strategy:
 *   No filter      → all students in the school (use Student.classId for class name)
 *   academicYear   → students with a history entry for that year
 *   classId        → students with a history entry for that class
 *   both           → students matching both conditions
 *
 * When no history filter is active we read the student's direct class
 * (Student.class) for the display name — this is always accurate for
 * the current year even if no history entry exists yet.
 */
export async function getStudentsForMeal(params?: {
  academicYear?: string;
  classId?: number;
}): Promise<StudentForMeal[]> {
  const schoolId = await getSchoolId();
  if (!schoolId) return [];

  const { academicYear, classId } = params ?? {};

  // Only treat as "filtered" when at least one param is actually provided
  const hasAcademicYear = Boolean(academicYear);
  const hasClassId = Boolean(classId);
  const hasFilter = hasAcademicYear || hasClassId;

  // Build the history where clause — only add keys that are defined
  // This prevents Prisma receiving `classHistory: { some: {} }` which
  // would match ALL students (including those with no history).
  const historyWhere: { academicYear?: string; classId?: number } = {};
  if (hasAcademicYear) historyWhere.academicYear = academicYear!;
  if (hasClassId) historyWhere.classId = classId!;

  const students = await prisma.student.findMany({
    where: {
      schoolId,
      ...(hasFilter ? { classHistory: { some: historyWhere } } : {}),
    },
    select: {
      id: true,
      name: true,
      surname: true,
      // Direct current class — used as display fallback when no history filter
      classId: true,
      class: { select: { id: true, name: true } },
      // History entries matching the filter (or most-recent if no filter)
      classHistory: {
        where: hasFilter ? historyWhere : undefined,
        select: {
          academicYear: true,
          rollNumber: true,
          classId: true,
          class: { select: { id: true, name: true } },
        },
        // FIX: StudentClassHistory has no createdAt — use promotedAt desc,
        // then id desc as tiebreaker so we always get the latest record.
        orderBy: [{ promotedAt: "desc" }, { id: "desc" }],
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });

return students.map((s) => {
    const h = s.classHistory[0] ?? null;

    // Prefer history class info when filtering, fall back to current class
    const resolvedClassId = h?.classId ?? s.classId;
    const resolvedClassName = h?.class?.name ?? s.class?.name ?? "N/A";

    return {
      id: s.id,
      name: s.name,
      surname: s.surname,
      // rollNumber-কে string-এ কনভার্ট করা হয়েছে এবং null সেফটি চেক দেওয়া হয়েছে
      rollNumber: h?.rollNumber !== undefined && h?.rollNumber !== null 
        ? String(h.rollNumber) 
        : "N/A", 
      classId: resolvedClassId,
      className: resolvedClassName,
      academicYear: h?.academicYear ?? "N/A",
    };
  });
}

// Server action wrappers for client-side calls

export async function getFilteredStudents(params: {
  academicYear?: string;
  classId?: number;
}): Promise<StudentForMeal[]> {
  return getStudentsForMeal(params);
}

export async function getClassesByYear(
  academicYear: string
): Promise<ClassForFilter[]> {
  return getClassesForSchool(academicYear);
}

/**
 * All data the /list/meals page needs — one parallel fetch.
 */
export async function getMealsPageData() {
  const schoolId = await getSchoolId();
  if (!schoolId) return null;

  const [mealTypes, sessions, classes, students, school] = await Promise.all([
    prisma.mealType.findMany({
      where: { schoolId, isActive: true },
      select: { id: true, name: true, rate: true, guestRate: true, isActive: true },
      orderBy: { name: "asc" },
    }),
    getSessionsForSchool(),
    getClassesForSchool(),   // all classes (no year filter yet)
    getStudentsForMeal(),    // all students (no filter yet)

    prisma.school.findMany({
      where: { id: schoolId },
      select: { id: true, schoolName: true, academicSession: true,shortName:true, address:true,phone:true,email:true , logoUrl:true, establishedYear:true}
    })
  ]);

  return {
    mealTypes: mealTypes.map((m) => ({
      id: m.id,
      name: m.name,
      rate: m.rate.toString(),
      guestRate: m.guestRate?.toString() ?? null,
      isActive: m.isActive,
    })),
    sessions,   // string[] — e.g. ["2026", "2025"]
    classes,    // ClassForFilter[]
    students,   // StudentForMeal[]
    school,
  };
}

// ─── MealType CRUD ────────────────────────────────────────────────────────────

export async function getMealTypes() {
  const schoolId = await getSchoolId();
  if (!schoolId) return [];
  return prisma.mealType.findMany({
    where: { schoolId, isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function getAllMealTypes() {
  const schoolId = await getSchoolId();
  if (!schoolId) return [];
  return prisma.mealType.findMany({ where: { schoolId }, orderBy: { name: "asc" } });
}

export async function createMealType(
  input: MealTypeInput
): Promise<ActionResult<{ id: number }>> {
  const {schoolId} = await getUserRoleAuth();
  if (!schoolId) return { success: false, error: "Unauthorized" };

  const parsed = MealTypeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { name, rate, guestRate, isActive } = parsed.data;
  const existing = await prisma.mealType.findUnique({
    where: { schoolId_name: { schoolId, name } },
  });
  if (existing) return { success: false, error: `"${name}" already exists` };

  const mealType = await prisma.mealType.create({
    data: {
      schoolId,
      name,
      rate: new Decimal(rate),
      guestRate: guestRate ? new Decimal(guestRate) : null,
      isActive,
    },
  });

  revalidatePath("/list/meals");
  return { success: true, data: { id: mealType.id } };
}

export async function updateMealType(
  id: number,
  input: MealTypeInput
): Promise<ActionResult> {
  const schoolId = await getSchoolId();
  if (!schoolId) return { success: false, error: "Unauthorized" };

  const parsed = MealTypeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const existing = await prisma.mealType.findFirst({ where: { id, schoolId } });
  if (!existing) return { success: false, error: "Meal type not found" };

  const { name, rate, guestRate, isActive } = parsed.data;
  await prisma.mealType.update({
    where: { id },
    data: {
      name,
      rate: new Decimal(rate),
      guestRate: guestRate ? new Decimal(guestRate) : null,
      isActive,
    },
  });

  revalidatePath("/list/meals");
  return { success: true, data: undefined };
}

export async function deleteMealType(id: number): Promise<ActionResult> {
  const {schoolId} = await getUserRoleAuth();
  if (!schoolId) return { success: false, error: "Unauthorized" };

  const existing = await prisma.mealType.findFirst({ where: { id, schoolId } });
  if (!existing) return { success: false, error: "Meal type not found" };

  await prisma.mealType.update({ where: { id }, data: { isActive: false } });
  revalidatePath("/list/meals");
  return { success: true, data: undefined };
}

// ─── Meal Attendance ──────────────────────────────────────────────────────────

export async function recordMealAttendance(
  input: MealEntryInput
): Promise<ActionResult<{ id: number }>> {
  const schoolId = await getSchoolId();
  if (!schoolId) return { success: false, error: "Unauthorized" };

  const parsed = MealEntrySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { studentId, mealTypeId, date, isGuest, quantity, status } = parsed.data;

  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId },
    select: { id: true },
  });
  if (!student) return { success: false, error: "Student not found" };

  const mealType = await prisma.mealType.findFirst({
    where: { id: mealTypeId, schoolId, isActive: true },
    select: { rate: true, guestRate: true },
  });
  if (!mealType) return { success: false, error: "Meal type not found or inactive" };

  const appliedRate =
    isGuest && mealType.guestRate ? mealType.guestRate : mealType.rate;

  // MealAttendance has no compound @@unique — use findFirst + create/update.
  // Match within the calendar day so one record per student/meal/day.
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const existing = await prisma.mealAttendance.findFirst({
    where: {
      schoolId,
      studentId,
      mealTypeId,
      date: { gte: dayStart, lte: dayEnd },
    },
    select: { id: true },
  });

  let record;
  if (existing) {
    record = await prisma.mealAttendance.update({
      where: { id: existing.id },
      data: { isGuest, quantity, appliedRate, status },
    });
  } else {
    record = await prisma.mealAttendance.create({
      data: {
        schoolId,
        studentId,
        mealTypeId,
        date: dayStart,
        isGuest,
        quantity,
        appliedRate,
        status,
      },
    });
  }

//   revalidatePath("/list/meals");
  return { success: true, data: { id: record.id } };
}

export async function recordBulkMealAttendance(
  input: BulkMealEntryInput
): Promise<ActionResult<{ count: number }>> {
  const schoolId = await getSchoolId();
  if (!schoolId) return { success: false, error: "Unauthorized" };

  const parsed = BulkMealEntrySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  // ১. এখানে quantity এবং isGuest (যদি লাগে) বের করে নিন
  const { date, mealTypeIds, studentIds, status, quantity, isGuest } = parsed.data;

  const mealTypes = await prisma.mealType.findMany({
    where: { id: { in: mealTypeIds }, schoolId, isActive: true },
    select: { id: true, rate: true, guestRate: true }, // guestRate ও নিয়ে নিলাম
  });
  
  const rateMap = new Map(mealTypes.map((m) => [m.id, m]));

  if (mealTypes.length !== mealTypeIds.length) {
    return { success: false, error: "One or more meal types are invalid or inactive" };
  }

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const existingKeys = new Set(
    (
      await prisma.mealAttendance.findMany({
        where: {
          schoolId,
          studentId: { in: studentIds },
          mealTypeId: { in: mealTypeIds },
          date: { gte: dayStart, lte: dayEnd },
        },
        select: { studentId: true, mealTypeId: true },
      })
    ).map((r) => `${r.studentId}__${r.mealTypeId}`)
  );

  const records = studentIds
    .flatMap((studentId) =>
      mealTypeIds
        .filter((mealTypeId) => !existingKeys.has(`${studentId}__${mealTypeId}`))
        .map((mealTypeId) => {
          const mealInfo = rateMap.get(mealTypeId)!;
          // গেস্ট হলে গেস্ট রেট, নাহলে নরমাল রেট
          const rateToApply = isGuest ? (mealInfo.guestRate || mealInfo.rate) : mealInfo.rate;

          return {
            schoolId,
            studentId,
            mealTypeId,
            date: dayStart,
            appliedRate: rateToApply,
            status,
            isGuest: isGuest || false,
            quantity: quantity, // ২. এখানে ১ এর বদলে ডাইনামিক ভ্যালু দিন
          };
        })
    );

  let count = 0;
  if (records.length > 0) {
    const result = await prisma.mealAttendance.createMany({ data: records });
    count = result.count;
  }

  revalidatePath("/list/meals");
  return { success: true, data: { count } };
}
// ─── Billing ──────────────────────────────────────────────────────────────────

export async function getStudentMonthlyBill(
  query: MonthlyBillQuery
): Promise<MonthlyBillResult | null> {
  const schoolId = await getSchoolId();
  if (!schoolId) return null;

  const parsed = MonthlyBillQuerySchema.safeParse(query);
  if (!parsed.success) return null;

  const { studentId, year, month } = parsed.data;

  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId },
    select: { id: true, name: true },
  });
  if (!student) return null;

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const monthLabel = `${new Date(year, month - 1).toLocaleString("en-US", {
    month: "long",
  })} ${year}`;

  const totals = await prisma.$queryRaw<
    { mealTypeId: number; count: bigint; total: string }[]
  >`
    SELECT
      ma."mealTypeId",
      COUNT(*)::bigint  AS count,
      SUM(ma."appliedRate" * ma.quantity)::text AS total
    FROM "MealAttendance" ma
    WHERE
      ma."studentId" = ${studentId}
      AND ma."schoolId" = ${schoolId}
      AND ma.date >= ${start}
      AND ma.date <  ${end}
      AND ma.status = 'CONSUMED'::"MealStatus"
    GROUP BY ma."mealTypeId"
  `;

  const mealTypeIds = totals.map((t) => t.mealTypeId);
  const mealTypesData = await prisma.mealType.findMany({
    where: { id: { in: mealTypeIds } },
    select: { id: true, name: true },
  });
  const nameMap = new Map(mealTypesData.map((m) => [m.id, m.name]));

  const breakdown = totals.map((t) => ({
    mealTypeId: t.mealTypeId,
    mealTypeName: nameMap.get(t.mealTypeId) ?? "Unknown",
    count: Number(t.count),
    totalAmount: new Decimal(t.total ?? "0").toFixed(2),
  }));

  const grossTotal = breakdown
    .reduce((sum, b) => sum.plus(new Decimal(b.totalAmount)), new Decimal(0))
    .toFixed(2);

  const paymentAgg = await prisma.mealPayment.aggregate({
    where: { studentId, schoolId, monthLabel },
    _sum: { amount: true },
  });

  const totalPaid = (paymentAgg._sum.amount ?? new Decimal(0)).toFixed(2);
  const balanceDue = new Decimal(grossTotal).minus(new Decimal(totalPaid)).toFixed(2);

  const recentRaw = await prisma.mealAttendance.findMany({
    where: { studentId, schoolId, date: { gte: start, lt: end } },
    include: { mealType: { select: { name: true } } },
    orderBy: { date: "desc" },
    take: 10,
  });

  const recentLogs = recentRaw.map((r) => ({
    id: r.id,
    date: r.date.toISOString().split("T")[0],
    mealTypeName: r.mealType.name,
    appliedRate: r.appliedRate.toFixed(2),
    quantity: r.quantity,
    status: r.status,
    isGuest: r.isGuest,
  }));

  return {
    studentId,
    studentName: student.name,
    month,
    year,
    breakdown,
    grossTotal,
    totalPaid,
    balanceDue,
    monthLabel,
    recentLogs,
  };
}

export async function recordMealPayment(
  input: MealPaymentInput
): Promise<ActionResult<{ id: number }>> {
  const schoolId = await getSchoolId();
  if (!schoolId) return { success: false, error: "Unauthorized" };

  const parsed = MealPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { studentId, amount, paymentMethod, monthLabel, remarks } = parsed.data;

  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId },
    select: { id: true },
  });
  if (!student) return { success: false, error: "Student not found" };

  const payment = await prisma.mealPayment.create({
    data: {
      schoolId,
      studentId,
      amount: new Decimal(amount),
      paymentMethod,
      monthLabel,
      remarks,
    },
  });

  revalidatePath("/list/meals");
  return { success: true, data: { id: payment.id } };
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export async function getMealDashboardStats() {
  const schoolId = await getSchoolId();
  if (!schoolId) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [todayCount, todayRevenue, activeMealTypes, studentsThisMonth] =
    await Promise.all([
      prisma.mealAttendance.count({
        where: { schoolId, date: { gte: today, lt: tomorrow }, status: "CONSUMED" },
      }),
      prisma.mealAttendance.aggregate({
        where: { schoolId, date: { gte: today, lt: tomorrow }, status: "CONSUMED" },
        _sum: { appliedRate: true },
      }),
      prisma.mealType.count({ where: { schoolId, isActive: true } }),
      prisma.mealAttendance.groupBy({
        by: ["studentId"],
        where: {
          schoolId,
          date: {
            gte: new Date(today.getFullYear(), today.getMonth(), 1),
            lt: new Date(today.getFullYear(), today.getMonth() + 1, 1),
          },
          status: "CONSUMED",
        },
        _count: { id: true },
      }),
    ]);

  return {
    todayMealsServed: todayCount,
    todayRevenue: todayRevenue._sum.appliedRate?.toFixed(2) ?? "0.00",
    activeMealTypes,
    studentsWithActivityThisMonth: studentsThisMonth.length,
  };
}