import { Parent, Student } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "../../../../../lib/db";
import FormContainer from "../../../../../components/FormContainer";
import Announcements from "../../../../../components/Announcements";
import Performance from "../../../../../components/Performance";
import { getUserRoleAuth } from "@/lib/logsessition";

const SingleParentPage = async ({
  params: { id },
}: {
  params: { id: string };
}) => {
  const { role } = await getUserRoleAuth();

  const parent:
    | (Parent & {
        students: (Student & {
          class: {
            name: string;
            grade: {
              level: number;
            };
          } | null;
        })[];
        _count: {
          students: number;
        };
      })
    | null = await prisma.parent.findUnique({
    where: { id },
    include: {
      students: {
        include: {
          class: {
            include: {
              grade: true
            }
          }
        }
      },
      _count: {
        select: {
          students: true,
        },
      },
    },
  });

  console.log("Parent Data:", parent);

  if (!parent) {
    return notFound();
  }

  // Calculate statistics
  const totalStudents = parent._count.students;
  const uniqueClasses = new Set(parent.students.map(s => s.class?.name)).size;
  const averageAttendance = "95%"; // You can calculate from attendance data if available

  return (
    <div className="flex-1 p-4 flex flex-col gap-4 xl:flex-row">
      {/* LEFT */}
      <div className="w-full xl:w-2/3">
        {/* TOP */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* USER INFO CARD */}
          <div className="bg-lamaSkyLight py-6 px-4 rounded-md flex-1 flex gap-4">
            <div className="w-1/3">
              <div className="w-36 h-36 rounded-full bg-lamaSky flex items-center justify-center">
                <span className="text-5xl font-semibold text-white">
                  {parent.name.charAt(0)}
                  {parent.surname.charAt(0)}
                </span>
              </div>
            </div>
            <div className="w-2/3 flex flex-col justify-between gap-4">
              <div className="flex items-center gap-4">
                <h1 className="text-xl font-semibold">
                  {parent.name + " " + parent.surname}
                </h1>
                {role === "admin" && (
                  <div className="flex items-center gap-2 hover:underline cursor-pointer hover:bg-green-300">
                    <FormContainer table="parent" type="update" data={parent} />
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {parent.address || "No address provided"}
              </p>
              <div className="flex items-center justify-between gap-2 flex-wrap text-xs font-medium">
                <div className="w-full md:w-1/3 lg:w-full 2xl:w-1/3 flex items-center gap-2">
                  <Image src="/mail.png" alt="" width={14} height={14} />
                  <span>{parent.email || "-"}</span>
                </div>
                <div className="w-full md:w-1/3 lg:w-full 2xl:w-1/3 flex items-center gap-2">
                  <Image src="/phone.png" alt="" width={14} height={14} />
                  <span>{parent.phone || "-"}</span>
                </div>
                <div className="w-full md:w-1/3 lg:w-full 2xl:w-1/3 flex items-center gap-2">
                  <Image src="/username.png" alt="" width={14} height={14} />
                  <span>{parent.username}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* SMALL CARDS */}
          <div className="flex-1 flex gap-4 justify-between flex-wrap">
            {/* CARD - Total Students */}
            <div className="bg-white p-4 rounded-md flex gap-4 w-full md:w-[48%] xl:w-[45%] 2xl:w-[48%]">
              <Image
                src="/student.png"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <div className="">
                <h1 className="text-xl font-semibold">{totalStudents}</h1>
                <span className="text-sm text-gray-400">Total Children</span>
              </div>
            </div>
            
            {/* CARD - Classes */}
            <div className="bg-white p-4 rounded-md flex gap-4 w-full md:w-[48%] xl:w-[45%] 2xl:w-[48%]">
              <Image
                src="/singleClass.png"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <div className="">
                <h1 className="text-xl font-semibold">{uniqueClasses}</h1>
                <span className="text-sm text-gray-400">Classes</span>
              </div>
            </div>
            
            {/* CARD - Attendance */}
            <div className="bg-white p-4 rounded-md flex gap-4 w-full md:w-[48%] xl:w-[45%] 2xl:w-[48%]">
              <Image
                src="/singleAttendance.png"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <div className="">
                <h1 className="text-xl font-semibold">{averageAttendance}</h1>
                <span className="text-sm text-gray-400">Avg. Attendance</span>
              </div>
            </div>
            
            {/* CARD - Contact */}
            <div className="bg-white p-4 rounded-md flex gap-4 w-full md:w-[48%] xl:w-[45%] 2xl:w-[48%]">
              <Image
                src="/phone.png"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <div className="">
                <h1 className="text-xl font-semibold">Active</h1>
                <span className="text-sm text-gray-400">Status</span>
              </div>
            </div>
          </div>
        </div>

        {/* STUDENTS LIST */}
     <div className="mt-4 bg-white rounded-md p-4">
  <div className="flex items-center justify-between mb-4">
    <h1 className="text-xl font-semibold">Children Details</h1>
    <span className="text-sm text-gray-500">
      Total: {totalStudents} students
    </span>
  </div>
  
  {/* TABLE FORMAT */}
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Student
          </th>
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Class & Grade
          </th>
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Contact
          </th>
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Status
          </th>
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Action
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {parent.students.map((student) => (
          <tr key={student.id} className="hover:bg-gray-50 transition-colors">
            {/* Student Info */}
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-10 w-10">
                  <div className="h-10 w-10 rounded-full bg-lamaYellow flex items-center justify-center">
                    <span className="text-sm font-semibold">
                      {student.name.charAt(0)}
                      {student.surname.charAt(0)}
                    </span>
                  </div>
                </div>
                <div className="ml-4">
                  <div className="text-sm font-medium text-gray-900">
                    {student.name} {student.surname}
                  </div>
                  <div className="text-sm text-gray-500">
                    ID: {student.id.slice(-8)}
                  </div>
                </div>
              </div>
            </td>
            
            {/* Class & Grade */}
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="text-sm text-gray-900">
                {student.class?.name || 'N/A'}
              </div>
              <div className="text-sm text-gray-500">
                Grade: {student.class?.grade?.level || 'N/A'}
              </div>
            </td>
            
            {/* Contact */}
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="text-sm text-gray-900">
                {student.phone || 'No phone'}
              </div>
              <div className="text-sm text-gray-500">
                {student.email || 'No email'}
              </div>
            </td>
            
            {/* Status */}
            <td className="px-6 py-4 whitespace-nowrap">
              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                Active
              </span>
            </td>
            
            {/* Action */}
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <Link 
                href={`/list/students/${student.id}`}
                className="text-lamaSky hover:text-lamaPurple flex items-center gap-1"
              >
                <Image src="/view.png" alt="view" width={16} height={16} />
                View
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>

  {parent.students.length === 0 && (
    <div className="text-center py-8 text-gray-500">
      No children assigned to this parent yet.
    </div>
  )}
</div>

        {/* ATTENDANCE OVERVIEW (if needed) */}
        <div className="mt-4 bg-white rounded-md p-4">
          <h1 className="text-xl font-semibold mb-4">Attendance Overview</h1>
          <div className="h-[400px]">
            {/* You can add a chart component here */}
            <div className="flex items-center justify-center h-full bg-gray-50 rounded">
              <p className="text-gray-400">Attendance chart will be displayed here</p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="w-full xl:w-1/3 flex flex-col gap-4">
        {/* SHORTCUTS */}
        <div className="bg-white p-4 rounded-md">
          <h1 className="text-xl font-semibold">Quick Actions</h1>
          <div className="mt-4 flex gap-4 flex-wrap text-xs text-gray-500">
            <Link
              className="p-3 rounded-md bg-lamaSkyLight hover:bg-lamaSky hover:text-white transition-colors"
              href={`/list/students?parentId=${parent.id}`}
            >
              View All Children
            </Link>
            <Link
              className="p-3 rounded-md bg-lamaPurpleLight hover:bg-lamaPurple hover:text-white transition-colors"
              href={`/list/attendance?parentId=${parent.id}`}
            >
              Check Attendance
            </Link>
            <Link
              className="p-3 rounded-md bg-lamaYellowLight hover:bg-lamaYellow hover:text-white transition-colors"
              href={`/list/results?parentId=${parent.id}`}
            >
              View Results
            </Link>
            <Link
              className="p-3 rounded-md bg-pink-50 hover:bg-pink-200 transition-colors"
              href={`/list/events?parentId=${parent.id}`}
            >
              School Events
            </Link>
            <Link
              className="p-3 rounded-md bg-green-50 hover:bg-green-200 transition-colors"
              href={`/list/announcements?parentId=${parent.id}`}
            >
              Announcements
            </Link>
          </div>
        </div>


        <Performance />
        <Announcements />
      </div>
    </div>
  );
};

export default SingleParentPage;