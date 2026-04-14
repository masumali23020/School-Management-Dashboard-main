// getSchoolData.ts
import prisma from "@/lib/db";
import type { School, Announcement, Event, HomeSlider } from "@prisma/client";

// ✅ schoolId optional, যদি দেওয়া হয় current school এর data fetch হবে
export async function getSchoolSettings(schoolId?: number): Promise<School | null> {
  if (schoolId) {
    return prisma.school.findUnique({
      where: { id: schoolId },
    });
  }
  return prisma.school.findFirst({
    orderBy: { id: "desc" }, // default fallback school
  });
}

export async function getSliders(schoolId?: number): Promise<HomeSlider[]> {
  return prisma.homeSlider.findMany({
    where: { isActive: true, ...(schoolId && { schoolId }) },
    orderBy: { order: "asc" },
  });
}

export async function getAnnouncements(schoolId?: number): Promise<Announcement[]> {
  return prisma.announcement.findMany({
    where: { isPublic: true, ...(schoolId && { schoolId }) },
    orderBy: { date: "desc" },
    take: 6,
  });
}

export async function getEvents(schoolId?: number): Promise<Event[]> {
  return prisma.event.findMany({
    where: {
      isPublic: true,
      endTime: { gte: new Date() },
      ...(schoolId && { schoolId }),
    },
    orderBy: { startTime: "asc" },
    take: 6,
  });
}