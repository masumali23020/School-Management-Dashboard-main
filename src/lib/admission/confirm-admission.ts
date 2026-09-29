import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import type { AdmissionApplication, Prisma } from "@prisma/client";
import {
  getConfirmedCount,
  recordApplicationStatusChange,
  syncAdmissionClassFullStatus,
} from "./utils";

async function getNextRollNumber(
  tx: Prisma.TransactionClient,
  classId: number,
  schoolId: number,
  academicYear: string
): Promise<number> {
  const last = await tx.studentClassHistory.findFirst({
    where: { classId, schoolId, academicYear },
    orderBy: { rollNumber: "desc" },
    select: { rollNumber: true },
  });
  return (last?.rollNumber ?? 0) + 1;
}

async function resolveOrCreateParent(
  tx: Prisma.TransactionClient,
  application: AdmissionApplication,
  schoolId: number
) {
  const phone = application.guardianMobile || application.fatherMobile;
  const name = application.guardianName || application.fatherName;
  const surname = application.surname;

  const existing = await tx.parent.findUnique({ where: { phone } });
  if (existing) {
    if (existing.schoolId !== schoolId) {
      throw new Error("Parent phone is registered with another school.");
    }
    return existing.id;
  }

  const parent = await tx.parent.create({
    data: {
      id: `parent_${nanoid(12)}`,
      schoolId,
      username: `parent_${phone.slice(-4)}_${nanoid(4)}`,
      password: await bcrypt.hash(nanoid(10), 12),
      name,
      surname,
      phone,
      address: application.presentAddress,
      email: null,
    },
  });
  return parent.id;
}

function buildStudentUsername(applicationNumber: string): string {
  const safe = applicationNumber.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return `adm_${safe.slice(-16)}_${nanoid(4)}`;
}

export async function confirmAdmissionApplication(
  tx: Prisma.TransactionClient,
  params: {
    application: AdmissionApplication;
    schoolId: number;
    confirmedById: string;
    academicYear: string;
  }
) {
  const { application, schoolId, confirmedById, academicYear } = params;

  if (application.applicationStatus !== "APPROVED") {
    throw new Error("Application must be approved before confirmation.");
  }
  if (application.studentId) {
    throw new Error("Application is already confirmed.");
  }

  const admissionClass = await tx.admissionClass.findFirst({
    where: { id: application.admissionClassId, schoolId },
    include: { class: { include: { grade: true, _count: { select: { students: true } } } } },
  });

  if (!admissionClass) {
    throw new Error("Admission class not found.");
  }

  const confirmedCount = await getConfirmedCount(tx, admissionClass.id);
  if (confirmedCount >= admissionClass.seatCapacity) {
    throw new Error("No seats available for this class.");
  }

  if (admissionClass.class._count.students >= admissionClass.class.capacity) {
    throw new Error("Class permanent capacity is full.");
  }

  const parentId = await resolveOrCreateParent(tx, application, schoolId);
  const studentId = `stu_${nanoid(12)}`;
  const username = buildStudentUsername(application.applicationNumber);

  await tx.student.create({
    data: {
      id: studentId,
      schoolId,
      username,
      password: await bcrypt.hash(nanoid(10), 12),
      name: application.studentName,
      surname: application.surname,
      address: application.presentAddress,
      img: application.studentPhoto,
      bloodType: application.bloodGroup,
      sex: application.gender,
      birthday: application.dateOfBirth,
      phone: application.fatherMobile || application.guardianMobile,
      email: null,
      parentId,
      classId: admissionClass.classId,
      gradeId: admissionClass.class.gradeId,
    },
  });

  const rollNumber = await getNextRollNumber(
    tx,
    admissionClass.classId,
    schoolId,
    academicYear
  );

  await tx.studentClassHistory.create({
    data: {
      studentId,
      classId: admissionClass.classId,
      gradeId: admissionClass.class.gradeId,
      schoolId,
      academicYear,
      rollNumber,
    },
  });

  const previousStatus = application.applicationStatus;

  await tx.admissionApplication.update({
    where: { id: application.id },
    data: {
      applicationStatus: "CONFIRMED",
      studentId,
    },
  });

  await recordApplicationStatusChange(tx, {
    applicationId: application.id,
    schoolId,
    previousStatus,
    newStatus: "CONFIRMED",
    changedById: confirmedById,
    note: `Student created: ${studentId}`,
  });

  await syncAdmissionClassFullStatus(tx, admissionClass.id);

  return { studentId, parentId, username, rollNumber };
}
