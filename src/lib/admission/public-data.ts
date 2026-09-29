import prisma from "@/lib/db";
import { getSchoolIdFromSlug, isSessionWithinDates } from "@/lib/admission/utils";

function formatBnDate(date: Date) {
  return date.toLocaleDateString("bn-BD", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function isSessionActive(
  session: { status: string; startDate: Date; endDate: Date },
  now: Date = new Date()
) {
  return session.status === "OPEN" && isSessionWithinDates(session.startDate, session.endDate, now);
}

export async function getPublicAdmissionPageData(schoolSlug: string) {
  const schoolId = await getSchoolIdFromSlug(schoolSlug);
  if (!schoolId) return null;

  const now = new Date();

  const [setting, sessions, announcements] = await Promise.all([
    prisma.admissionSetting.findUnique({ where: { schoolId } }),
    prisma.admissionSession.findMany({
      where: { schoolId },
      include: {
        admissionClasses: {
          include: {
            class: { include: { grade: true } },
          },
          orderBy: { class: { grade: { level: "asc" } } },
        },
        _count: { select: { admissionApplications: true } },
      },
      orderBy: { startDate: "desc" },
    }),
    prisma.announcement.findMany({
      where: { schoolId, isPublic: true },
      orderBy: { date: "desc" },
      take: 5,
    }),
  ]);

  const activeSessions = sessions.filter((s) => isSessionActive(s, now));

  const classIds = sessions.flatMap((s) => s.admissionClasses.map((ac) => ac.id));

  const [confirmedByClass, totalByClass] = await Promise.all([
    classIds.length > 0
      ? prisma.admissionApplication.groupBy({
          by: ["admissionClassId"],
          where: {
            schoolId,
            admissionClassId: { in: classIds },
            applicationStatus: "CONFIRMED",
          },
          _count: { id: true },
        })
      : Promise.resolve([]),
    classIds.length > 0
      ? prisma.admissionApplication.groupBy({
          by: ["admissionClassId"],
          where: {
            schoolId,
            admissionClassId: { in: classIds },
            applicationStatus: { notIn: ["CANCELLED", "APPLICATION_REJECTED"] },
          },
          _count: { id: true },
        })
      : Promise.resolve([]),
  ]);

  const confirmedMap = Object.fromEntries(
    confirmedByClass.map((r) => [r.admissionClassId, r._count.id])
  );
  const totalMap = Object.fromEntries(
    totalByClass.map((r) => [r.admissionClassId, r._count.id])
  );

  const allClasses = activeSessions.flatMap((session) =>
    session.admissionClasses.map((ac) => {
      const confirmedCount = confirmedMap[ac.id] ?? 0;
      const totalApplications = totalMap[ac.id] ?? 0;
      const availableSeats = Math.max(0, ac.seatCapacity - confirmedCount);
      const isWithinSession = isSessionWithinDates(session.startDate, session.endDate, now);
      const isClassOpen = ac.status === "OPEN" && availableSeats > 0;
      const isApplyOpen =
        Boolean(setting?.admissionEnabled) &&
        session.status === "OPEN" &&
        isWithinSession &&
        isClassOpen;

      return {
        id: ac.id,
        sessionId: session.id,
        sessionName: session.name,
        academicYear: session.academicYear,
        className: ac.class.name,
        gradeLevel: ac.class.grade.level,
        seatCapacity: ac.seatCapacity,
        admissionFee: Number(ac.admissionFee),
        classStatus: ac.status,
        sessionStatus: session.status,
        confirmedCount,
        totalApplications,
        pendingCount: Math.max(0, totalApplications - confirmedCount),
        availableSeats,
        isApplyOpen,
      };
    })
  );

  const openClasses = allClasses.filter((c) => c.isApplyOpen);
  const canApply = openClasses.length > 0;

  const sessionNotices = activeSessions.map((s) => ({
    title: `${s.name} — ভর্তি চলছে`,
    date: `${formatBnDate(s.startDate)} থেকে ${formatBnDate(s.endDate)}`,
    tag: "চলমান" as const,
  }));

  const announcementNotices = announcements.map((a) => ({
    title: a.title,
    date: formatBnDate(a.date),
    tag: "গুরুত্বপূর্ণ" as const,
  }));

  const notices = [...sessionNotices, ...announcementNotices].slice(0, 6);

  const importantDates = activeSessions.length
    ? activeSessions.flatMap((s) => [
        { label: `${s.name} — আবেদন শুরু`, date: formatBnDate(s.startDate) },
        { label: `${s.name} — আবেদন শেষ`, date: formatBnDate(s.endDate) },
      ])
    : sessions.slice(0, 1).flatMap((s) => [
        { label: `${s.name} — আবেদন শুরু`, date: formatBnDate(s.startDate) },
        { label: `${s.name} — আবেদন শেষ`, date: formatBnDate(s.endDate) },
      ]);

  const fees = allClasses.map((c) => c.admissionFee).filter((f) => f > 0);
  const minFee = fees.length ? Math.min(...fees) : 0;
  const maxFee = fees.length ? Math.max(...fees) : 0;

  const primarySession = activeSessions[0] ?? sessions[0] ?? null;

  return {
    schoolId,
    enabled: Boolean(setting?.admissionEnabled),
    setting: setting
      ? {
          admissionEnabled: setting.admissionEnabled,
          bkashNumber: setting.bkashNumber,
          paymentInstruction: setting.paymentInstruction,
          applicationPrefix: setting.applicationPrefix,
          admissionPrefix: setting.admissionPrefix,
        }
      : null,
    activeSessions: activeSessions.map((s) => ({
      id: s.id,
      name: s.name,
      academicYear: s.academicYear,
      startDate: s.startDate,
      endDate: s.endDate,
      status: s.status,
    })),
    allClasses,
    openClasses,
    canApply,
    notices,
    importantDates,
    announcements: announcements.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      date: a.date,
    })),
    primarySession: primarySession
      ? {
          name: primarySession.name,
          academicYear: primarySession.academicYear,
        }
      : null,
    feeRange: { min: minFee, max: maxFee },
    stats: {
      totalSessions: sessions.length,
      activeSessionCount: activeSessions.length,
      openClassCount: openClasses.length,
      totalApplications: sessions.reduce((n, s) => n + s._count.admissionApplications, 0),
    },
  };
}

export async function getPublicAdmissionAvailability(schoolSlug: string) {
  const data = await getPublicAdmissionPageData(schoolSlug);
  if (!data) return null;

  if (!data.enabled) {
    return {
      enabled: false,
      schoolId: data.schoolId,
      setting: data.setting,
      sessions: [],
      openClasses: [],
    };
  }

  return {
    enabled: true,
    schoolId: data.schoolId,
    setting: data.setting,
    sessions: data.activeSessions,
    openClasses: data.openClasses.map((ac) => ({
      id: ac.id,
      sessionId: ac.sessionId,
      sessionName: ac.sessionName,
      academicYear: ac.academicYear,
      admissionFee: ac.admissionFee,
      seatCapacity: ac.seatCapacity,
      confirmedCount: ac.confirmedCount,
      availableSeats: ac.availableSeats,
      class: { name: ac.className, grade: { level: ac.gradeLevel } },
    })),
  };
}
