// app/(dashboard)/list/classes/[slug]/page.tsx
// URL: /list/classes/six  OR  /list/classes/3  (supports both name slug and numeric id)

import prisma from "@/lib/db";
import { notFound } from "next/navigation";

import ClassStudentClient from "@/components/Classstudentclient";
import { getUserRoleAuth } from "@/lib/logsessition";


type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ academicYear?: string }>;
};


// Convert URL slug to a searchable name
// "six" → "Class Six", "class-six" → "Class Six", "3" → find by id
function slugToClassName(slug: string): { byName?: string; byId?: number } {
  // If it's a number, search by id
  const asNumber = parseInt(slug);
  if (!isNaN(asNumber)) return { byId: asNumber };

  // Convert slug like "six" or "class-six" or "class_six" to "Class Six"
  const cleaned = slug.replace(/[-_]/g, " ").trim();
  const titled = cleaned
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

  // If it already starts with "Class", use as-is, else prepend "Class "
  const withClass = titled.toLowerCase().startsWith("class")
    ? titled
    : `Class ${titled}`;

  return { byName: withClass };
}

export default async function ClassDetailPage({ params, searchParams }: Props) {
  // Next.js 15: params and searchParams must be awaited
  const { slug } = await params;
  const { academicYear: academicYearParam } = await searchParams;

  const { role } = await getUserRoleAuth();
  const isAdmin = role === "admin";

  const { byName, byId } = slugToClassName(slug);
  console.log("Searching for class with:", { byName, byId,slug });

  // Find the class by name (case-insensitive) or by id
  const classData = await prisma.class.findFirst({
    where: byId
      ? { id: byId }
      : { name: { equals: byName, mode: "insensitive" } },
    include: {
      supervisor: true,
      grade: true,
      subjectTeachers: {
        include: { subject: true, teacher: true },
      },
    },
  });

  if (!classData) notFound();

  const currentYear = new Date().getFullYear();
  const academicYear =
    academicYearParam || `${currentYear}-${currentYear + 1}`;

  // Current students in this class
  const students = await prisma.student.findMany({
    where: { classId: classData.id },
    orderBy: [{ name: "asc" }],
  });

  // Roll numbers for selected academic year
  const rollRecords = await prisma.studentClassHistory.findMany({
    where: { classId: classData.id, academicYear },
    orderBy: { rollNumber: "asc" },
  });

  const rollMap: Record<string, number> = {};
  rollRecords.forEach((r) => {
    rollMap[r.studentId] = r.rollNumber;
  });

  // Historical view: if past year selected, load students from that year
  const isHistoricalYear = academicYear !== `${currentYear}-${currentYear + 1}`;
  const historicalStudents = isHistoricalYear
    ? await prisma.studentClassHistory.findMany({
        where: { classId: classData.id, academicYear },
        include: { student: true },
        orderBy: { rollNumber: "asc" },
      })
    : null;

  // All academic years that have data for this class
  const yearRecords = await prisma.studentClassHistory.findMany({
    where: { classId: classData.id },
    distinct: ["academicYear"],
    select: { academicYear: true },
    orderBy: { academicYear: "desc" },
  });

  // All classes for promotion target dropdown
  const allClasses = isAdmin
    ? await prisma.class.findMany({
        include: { grade: true },
        orderBy: [{ grade: { level: "asc" } }, { name: "asc" }],
      })
    : [];

  const data = {
    classInfo: {
      id: classData.id,
      name: classData.name,
      slug,                              // keep original slug for URL
      capacity: classData.capacity,
      gradeLevel: classData.grade.level,
      supervisor: classData.supervisor
        ? `${classData.supervisor.name} ${classData.supervisor.surname ?? ""}`.trim()
        : null,
    },
    students: students.map((s) => ({
      id: s.id,
      name: s.name,
      surname: s.surname,
      img: s.img,
      phone: s.phone,
      address: s.address,
      rollNumber: rollMap[s.id] ?? null,
    })),
    historicalStudents: historicalStudents
      ? historicalStudents.map((h) => ({
          id: h.student.id,
          name: h.student.name,
          surname: h.student.surname,
          img: h.student.img,
          phone: h.student.phone,
          address: h.student.address,
          rollNumber: h.rollNumber,
        }))
      : null,
    academicYear,
    allYears: yearRecords.map((y) => y.academicYear),
    allClasses: allClasses.map((c) => ({
      id: c.id,
      name: c.name,
      gradeLevel: c.grade.level,
    })),
    isAdmin,
  };

  return <ClassStudentClient data={data} />;
}