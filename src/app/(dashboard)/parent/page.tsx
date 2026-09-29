import Announcements from "../../../components/Announcements";
<<<<<<< HEAD
=======

>>>>>>> 637d2b338431a202f203494526ceb5cc68466820
import prisma from "../../../lib/db";
import BigCalendarContainer from "../../../components/BigCalendarContainer";
import { getUserRoleAuth } from "@/lib/logsessition";

<<<<<<< HEAD
const ParentPage = async () => {
  const { userId } = await getUserRoleAuth();
  const currentUserId = userId;
=======

const ParentPage = async() => {
  const { userId } = await getUserRoleAuth();
    const currentUserId = userId;
>>>>>>> 637d2b338431a202f203494526ceb5cc68466820
  
  const students = await prisma.student.findMany({
    where: {
      parentId: currentUserId!,
    },
  });
<<<<<<< HEAD

  return (
    <div className="flex-1 p-4 flex gap-4 flex-col xl:flex-row">
      
      {/* LEFT: শিডিউল সেকশন (ডেস্কটপে ৭০% জায়গা নেবে) */}
      <div className="w-full xl:w-[70%] flex flex-col gap-6">
        {students.map((student) => (
          <div className="w-full" key={student.id}>
            <div className="h-full bg-white p-4 rounded-md shadow-sm">
              <h1 className="text-xl font-semibold mb-4">
=======
  return (
    <div className="flex-1 p-4 flex gap-4 flex-col xl:flex-row">
      {/* LEFT */}
      <div className="">
        {students.map((student) => (
          <div className="w-full xl:w-2/3" key={student.id}>
            <div className="h-full bg-white p-4 rounded-md">
              <h1 className="text-xl font-semibold">
>>>>>>> 637d2b338431a202f203494526ceb5cc68466820
                Schedule ({student.name + " " + student.surname})
              </h1>
              <BigCalendarContainer type="classId" id={student.classId} />
            </div>
          </div>
        ))}
      </div>
<<<<<<< HEAD

      {/* RIGHT: অ্যানাউন্সমেন্ট কম্পোনেন্ট (ডেস্কটপে ঠিক ৩০% এবং মোবাইলে ফুল উইডথ) */}
      <div className="w-full xl:w-[30%] flex flex-col gap-8">
        <Announcements />
      </div>

=======
      {/* RIGHT */}
      <div className="w-full xl:w-1/3 flex flex-col gap-8">
        <Announcements />
      </div>
>>>>>>> 637d2b338431a202f203494526ceb5cc68466820
    </div>
  );
};

<<<<<<< HEAD
export default ParentPage;
=======
export default ParentPage;
>>>>>>> 637d2b338431a202f203494526ceb5cc68466820
