import Image from "next/image";
import Link from "next/link";
import { getUserRoleAuth } from "@/lib/logsessition";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { itemPerPage } from "@/lib/setting";
import TableSearch from "@/components/TableSearch";
import Table from "@/components/Table"; // Lucide Icon নয়, আপনার Custom Table Component
import Pagination from "@/components/Pagination";
import FormContainer from "@/components/FormContainer";

const MonthlyMealStudent = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { page, studentId, ...queryParams } = searchParams;
  const p = page ? parseInt(page) : 1;

  // লগইন করা ইউজার এবং স্কুল আইডি সংগ্রহ
  const { role, schoolId } = await getUserRoleAuth();

  // যদি schoolId না থাকে তবে এরর মেসেজ
  if (!schoolId) {
    return (
      <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
        <div className="text-center text-red-500">
          <p>Error: No school associated with this account.</p>
        </div>
      </div>
    );
  }

  // কলাম লজিক
  const columns = [
    ...(studentId ? [] : [{ header: "Student", accessor: "student" }]),
    { header: "Date", accessor: "date" },
    { header: "Meal Type", accessor: "mealType", className: "hidden md:table-cell" },
    { header: "Quantity", accessor: "quantity", className: "hidden md:table-cell" },
    { header: "Guest", accessor: "guest", className: "hidden md:table-cell" },
    { header: "Rate", accessor: "rate", className: "hidden lg:table-cell" },
    { header: "Status", accessor: "status", className: "hidden lg:table-cell" },
    ...(role === "admin" ? [{ header: "Actions", accessor: "action" }] : []),
  ];

  // প্রিজমা কুয়েরি অবজেক্ট
  const query: Prisma.MealAttendanceWhereInput = {
    schoolId: Number(schoolId),
  };

  // স্টুডেন্ট আইডি থাকলে ফিল্টার
  if (studentId) {
    query.studentId = studentId;
  }

  // সার্চ প্যারামস হ্যান্ডেলিং
  if (queryParams.search) {
    query.student = {
      name: { contains: queryParams.search, mode: "insensitive" },
    };
  }

  // ডেটা ফেচিং
  const [mealData, count] = await prisma.$transaction([
    prisma.mealAttendance.findMany({
      where: query,
      include: {
        student: {
          select: { name: true, id: true, img: true },
        },
        mealType: true,
      },
      take: itemPerPage,
      skip: itemPerPage * (p - 1),
      orderBy: { date: "desc" },
    }),
    prisma.mealAttendance.count({ where: query }),
  ]);

  // রো রেন্ডার ফাংশন
  const renderRow = (item: any) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      {!studentId && (
        <td className="flex items-center gap-4 p-4">
          <Image
            src={item.student.img || "/avatar.png"}
            alt={item.student.name}
            width={40}
            height={40}
            className="xl:block w-10 h-10 rounded-full object-cover"
          />
          <div className="flex flex-col">
            <h3 className="font-semibold">{item.student.name}</h3>
            <p className="text-xs text-gray-500">ID: {item.student.id}</p>
          </div>
        </td>
      )}
      <td className="p-4">{new Date(item.date).toLocaleDateString("en-GB")}</td>
      <td className="hidden md:table-cell p-4">{item.mealType.name}</td>
      <td className="hidden md:table-cell p-4">{item.quantity}</td>
      <td className="hidden md:table-cell p-4">{item.guest > 0 ? item.guest : "-"}</td>
      <td className="hidden lg:table-cell p-4">{item.appliedRate.toString()} TK</td>
      <td className="hidden lg:table-cell p-4">
        <span
          className={`px-2 py-1 rounded-md text-xs font-medium ${
            item.status === "CONSUMED"
              ? "bg-green-100 text-green-700"
              : item.status === "CANCELED"
              ? "bg-red-100 text-red-700"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {item.status}
        </span>
      </td>
      {role === "admin" && (
        // <td className="p-4">
        //   <div className="flex items-center gap-2">
        //     <FormContainer table="mealAttendance" type="update" data={item} />
        //     <FormContainer table="mealAttendance" type="delete" id={item.id} />
        //   </div>
        // </td>
        <td className="p-4">
            <div className="flex items-center gap-2">
                download 
                </div>
        </td>
      )}
    </tr>
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          {studentId ? "Personal Meal Records" : `All Meal Attendance (${count})`}
        </h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          {!studentId && <TableSearch />}
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/filter.png" alt="filter" width={14} height={14} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/sort.png" alt="sort" width={14} height={14} />
            </button>
            {role === "admin" && (
            //   <FormContainer table="mealAttendance" type="create" />
            //   <FormContainer table="mealAttendance" type="create" />
            <p> create</p>
            )}
          </div>
        </div>
      </div>
      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={mealData} />
      {/* PAGINATION */}
      <Pagination page={p} count={count} />
    </div>
  );
};

export default MonthlyMealStudent;