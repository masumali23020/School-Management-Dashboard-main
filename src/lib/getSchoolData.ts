// getSchoolData.ts
import prisma from "@/lib/db";
import type { School, Announcement, Event, HomeSlider } from "@prisma/client";

// ✅ schoolId optional, যদি দেওয়া হয় current school এর data fetch হবে
export async function getSchoolSettings(schoolId?: string): Promise<School | null> {
  if (schoolId) {
    return prisma.school.findUnique({
      where: { id: Number(schoolId) },
    });
  }
  return prisma.school.findFirst({
    orderBy: { id: "desc" }, // default fallback school
  });
}

export async function getSliders(schoolId?: string): Promise<HomeSlider[]> {
  return prisma.homeSlider.findMany({
    where: { isActive: true, ...(schoolId && { schoolId: Number(schoolId) }) },
    orderBy: { order: "asc" },
  });
}

export async function getAnnouncements(schoolId?: string): Promise<Announcement[]> {
  return prisma.announcement.findMany({
    where: { isPublic: true, ...(schoolId && { schoolId: Number(schoolId) }) },
    orderBy: { date: "desc" },
    take: 6,
  });
}

export async function getEvents(schoolId?: string): Promise<Event[]> {
  return prisma.event.findMany({
    where: {
      isPublic: true,
      endTime: { gte: new Date() },
      ...(schoolId && { schoolId: Number(schoolId) }),
    },
    orderBy: { startTime: "asc" },
    take: 6,
  });
}