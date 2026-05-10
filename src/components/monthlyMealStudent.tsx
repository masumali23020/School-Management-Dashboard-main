import Image from "next/image";
import Link from "next/link";
import Pagination from "./Pagination";
import { getUserRoleAuth } from "@/lib/logsessition";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import TableSearch from "./TableSearch";
import Table from "./Table";
import { itemPerPage } from "@/lib/setting";

const MonthlyMealStudent = async ({
  searchParams = {},
}: {
  searchParams?: { [key: string]: string | undefined };
}) => {
  const { page, studentId, ...queryParams } = searchParams;
  const p = page ? parseInt(page) : 1;

  // এখানে role ডিস্ট্রাকচার করা হয়েছে
  const { role, schoolId } = await getUserRoleAuth();

  const query: Prisma.MealAttendanceWhereInput = {
    schoolId: Number(schoolId),
  };

  if (studentId) {
    query.studentId = studentId;
  }

  if (queryParams.search) {
    query.student = {
      name: { contains: queryParams.search, mode: "insensitive" },
    };
  }

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

  // কলাম লজিক: যদি নির্দিষ্ট স্টুডেন্ট প্রোফাইল হয়, তবে "Student" কলাম দেখানোর দরকার নেই
  const columns = [
    ...(studentId 
      ? [] 
      : [{ header: "Student", accessor: "student" }]),
      { header: "Date", accessor: "date" },
    { header: "Meal Type", accessor: "mealType", className: "hidden md:table-cell" },
    { header: "Quantity", accessor: "quantity", className: "hidden md:table-cell" },
    { header: "Guest", accessor: "guest", className: "hidden md:table-cell" },
    { header: "Rate", accessor: "rate", className: "hidden lg:table-cell" },
    { header: "Status", accessor: "status", className: "hidden lg:table-cell" },
    ...(role === "admin" ? [{ header: "Actions", accessor: "action" }] : []),
  ];

  const renderRow = (item: any) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      {/* স্টুডেন্ট কলাম শুধু তখনই দেখাবে যখন আমরা গ্লোবাল লিস্টে থাকব */}
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
        <span className={`px-2 py-1 rounded-md text-xs font-medium ${
          item.status === "CONSUMED" ? "bg-green-100 text-green-700" : 
          item.status === "CANCELED" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
        }`}>
          {item.status}
        </span>
      </td>
      {role === "admin" && (
        <td className="p-4">
          <div className="flex items-center gap-2">
             {/* Action buttons এখানে বসবে */}
          </div>
        </td>
      )}
    </tr>
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between mb-4">
        <h1 className="hidden md:block text-lg font-semibold">
          {studentId ? "Personal Meal Records" : `All Meal Attendance (${count})`}
        </h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          {/* যদি স্টুডেন্ট পেজ হয় তবে সার্চ বক্স লুকানো থাকতে পারে */}
          {!studentId && <TableSearch />}
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/filter.png" alt="filter" width={14} height={14} />
            </button>
          </div>
        </div>
      </div>
      <Table columns={columns} renderRow={renderRow} data={mealData} />
      <Pagination page={p} count={count} />
    </div>
  );
};

export default MonthlyMealStudent;