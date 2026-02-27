// app/attendance/monthly/page.tsx
import { Suspense } from "react";
import prisma from "@/lib/db";
import { getUserRole } from "@/lib/utlis";
import MonthlyAttendanceClient from "./MonthlyAttendanceClient";


export default async function MonthlyAttendancePage() {
  // সব ক্লাস এবং তাদের সম্পর্কিত ডাটা একসাথে ফেচ করুন
  const classes = await prisma.class.findMany({
    include: {
      grade: {
        select: {
          level: true,
        },
      },
      students: {
        include: {
          attendances: {
            where: {
              date: {
                gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
              },
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      },
    },
    orderBy: [
      {
        grade: {
          level: 'asc',
        },
      },
      {
        name: 'asc',
      },
    ],
  });

  const { role } = await getUserRole();

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Monthly Attendance</h1>
        {role === "admin" || role === "teacher" && (
          <p className="text-sm text-muted-foreground">
            Mark attendance for entire month at once
          </p>
        )}
      </div>
      

    <Suspense fallback={<div>Loading...</div>}>
        <MonthlyAttendanceClient 
          classes={classes} 
          currentMonth={new Date()}
        />
      </Suspense> 
    </div>
  );
}