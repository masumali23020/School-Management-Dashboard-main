// app/(dashboard)/student/page.tsx
import { getUserRoleAuth } from "@/lib/logsessition";
import Announcements from "../../../components/Announcements";
import BigCalendarContainer from "../../../components/BigCalendarContainer";
import EventCalendar from "../../../components/EventCalendar";
import prisma from "../../../lib/db";
import { redirect } from "next/navigation";

const StudentPage = async () => {
  const { userId, role } = await getUserRoleAuth();

  if (!userId || role !== "student") {
    redirect("/login");
  }

  // Get the student with their class information
  const student = await prisma.student.findUnique({
    where: { id: userId },
    include: {
      class: true,
      grade: true,
    },
  });

  if (!student) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h2 className="text-red-600 font-semibold">Student not found</h2>
          <p className="text-red-500 mt-1">Unable to find your student profile.</p>
        </div>
      </div>
    );
  }

  // If student doesn't have a class assigned
  if (!student.classId) {
    return (
      <div className="p-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <h2 className="text-yellow-600 font-semibold">No Class Assigned</h2>
          <p className="text-yellow-500 mt-1">
            You haven't been assigned to a class yet. Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  const className = student.class?.name || "Your Class";
  const gradeLevel = student.grade?.level || "";

  return (
    <div className="p-4 flex gap-4 flex-col xl:flex-row">
      {/* LEFT */}
      <div className="w-full xl:w-2/3">
        <div className="h-full bg-white p-4 rounded-md">
          <h1 className="text-xl font-semibold">
            Schedule - {gradeLevel} {className}
          </h1>
          <BigCalendarContainer type="classId" id={student.classId} />
        </div>
      </div>
      {/* RIGHT */}
      <div className="w-full xl:w-1/3 flex flex-col gap-8">
        <EventCalendar />
        <Announcements />
      </div>
    </div>
  );
};

export default StudentPage;