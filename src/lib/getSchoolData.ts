import prisma from "@/lib/db";

export async function getSchoolSettings() {
  return prisma.schoolSetting.findFirst({
    orderBy: { id: "desc" },
  });
}

export async function getSliders() {
  return prisma.homeSlider.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });
}

export async function getAnnouncements() {
  return prisma.announcement.findMany({
    where: { isPublic: true },
    orderBy: { date: "desc" },
    take: 6,
  });
}

export async function getEvents() {
  return prisma.event.findMany({
    where: {
      isPublic: true,
      endTime: { gte: new Date() },
    },
    orderBy: { startTime: "asc" },
    take: 6,
  });
}