import Announcements from "../../../components/Announcements";
import prisma from "../../../lib/db";
import BigCalendarContainer from "../../../components/BigCalendarContainer";
import { getUserRoleAuth } from "@/lib/logsessition";

const ParentPage = async () => {
  const { userId } = await getUserRoleAuth();
  const currentUserId = userId;
  
  const students = await prisma.student.findMany({
    where: {
      parentId: currentUserId!,
    },
  });

  return (
    <div className="flex-1 p-4 flex gap-4 flex-col xl:flex-row">
      
      {/* LEFT: শিডিউল সেকশন (ডেস্কটপে ৭০% জায়গা নেবে) */}
      <div className="w-full xl:w-[70%] flex flex-col gap-6">
        {students.map((student) => (
          <div className="w-full" key={student.id}>
            <div className="h-full bg-white p-4 rounded-md shadow-sm">
              <h1 className="text-xl font-semibold mb-4">
                Schedule ({student.name + " " + student.surname})
              </h1>
              <BigCalendarContainer type="classId" id={student.classId} />
            </div>
          </div>
        ))}
      </div>

      {/* RIGHT: অ্যানাউন্সমেন্ট কম্পোনেন্ট (ডেস্কটপে ঠিক ৩০% এবং মোবাইলে ফুল উইডথ) */}
      <div className="w-full xl:w-[30%] flex flex-col gap-8">
        <Announcements />
      </div>

    </div>
  );
};

export default ParentPage;