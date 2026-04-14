// app/attendance/monthly/page.tsx
import { Suspense } from "react";
import prisma from "@/lib/db";

import MonthlyAttendanceClient from "./MonthlyAttendanceClient";
import { getUserRoleAuth } from "@/lib/logsessition";


export default async function MonthlyAttendancePage() {
  
  const { role, schoolId } = await getUserRoleAuth();

  const classes = await prisma.class.findMany({
    where:{
      schoolId: Number(schoolId),
    },
    include: {
      grade: {
        select: {
          level: true,
        },
      },
      school:{
        select:{
          schoolName: true,
          shortName: true,

        }

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
          classHistory: {
            select: {
              rollNumber: true,
              academicYear: true,
            }
          }
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

    

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between mb-6">
        <div className="flex flex-col ">
        <h1 className="text-2xl font-semibold"> {classes[0]?.school?.schoolName || "School Name"}</h1>
        <p className="text-sm text-muted-foreground">
          {classes[0]?.school?.shortName || "Short Name"}
        </p>
      </div>

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