import Image from "next/image";
import FormContainer from "../../../../components/FormContainer";
import Pagination from "../../../../components/Pagination";
import Table from "../../../../components/Table";
import TableSearch from "../../../../components/TableSearch";

import { itemPerPage } from "../../../../lib/setting";
import prisma from "../../../../lib/db";
import { Grade, Prisma } from "@prisma/client";
import { getUserRoleAuth } from "@/lib/logsessition";

type EventList = Grade;

const GradePage = async ({ 
  searchParams 
}: { 
  searchParams: { [key: string]: string | undefined } 
}) => {
  const { page, ...queryParams } = searchParams;
  const p = page ? parseInt(page) : 1;
  
  // Get current user with school information
  const { role, schoolId } = await getUserRoleAuth();

  console.log("GradePage - User info:", { role, schoolId }); // Debug log

  // Check if user has school access
  if (!schoolId) {
    return (
      <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
        <div className="text-center text-red-500 py-8">
          <p>Error: No school associated with this account.</p>
          <p className="text-sm mt-2">Please contact administrator.</p>
        </div>
      </div>
    );
  }

  const columns = [
    {
      header: "Level",
      accessor: "level",
      className: "text-center",
    },
    {
      header: "Classes Count",
      accessor: "classesCount",
      className: "hidden md:table-cell text-center",
    },
    {
      header: "Students Count",
      accessor: "studentsCount",
      className: "hidden md:table-cell text-center",
    },
    ...(role === "admin" ? [
      {
        header: "Actions",
        accessor: "action",
        className: "text-center",
      },
    ] : []),
  ];

  // Build query with school filter
  const query: Prisma.GradeWhereInput = {
    schoolId: schoolId, // 🔥 Only show grades from current school
  };

  // Apply search filters from URL params
  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "search":
            // Search by level number
            const searchNumber = parseInt(value);
            if (!isNaN(searchNumber)) {
              query.level = searchNumber;
            }
            break;
          default:
            break;
        }
      }
    }
  }

  // Fetch grades with counts
  const [gradesData, count] = await prisma.$transaction([
    prisma.grade.findMany({
      where: query,
      include: {
        _count: {
          select: {
            classes: true,
            students: true,
          },
        },
      },
      take: itemPerPage,
      skip: itemPerPage * (p - 1),
      orderBy: {
        level: "asc", // Sort by level ascending (6,7,8...)
      },
    }),
    prisma.grade.count({ where: query }),
  ]);

  // Render row function
  const renderRow = (item: Grade & { _count: { classes: number; students: number } }) => {
    return (
      <tr
        key={item.id}
        className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
      >
        <td className="p-4 text-center font-medium">{item.level}</td>
        <td className="hidden md:table-cell text-center">
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
            {item._count.classes} Classes
          </span>
        </td>
        <td className="hidden md:table-cell text-center">
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
            {item._count.students} Students
          </span>
        </td>
        {role === "admin" && (
          <td>
            <div className="flex items-center justify-center gap-2">
              <FormContainer table="grade" type="update" data={item} />
              <FormContainer table="grade" type="delete" id={item.id} />
            </div>
          </td>
        )}
      </tr>
    );
  };

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Grades</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/filter.png" alt="" width={14} height={14} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/sort.png" alt="" width={14} height={14} />
            </button>
            {role === "admin" && <FormContainer table="grade" type="create" />}
          </div>
        </div>
      </div>

      {/* STATS SUMMARY */}
      {gradesData.length > 0 && (
        <div className="mt-4 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-xs text-gray-500">Total Grades</p>
            <p className="text-2xl font-bold text-blue-600">{count}</p>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <p className="text-xs text-gray-500">Total Classes</p>
            <p className="text-2xl font-bold text-green-600">
              {gradesData.reduce((sum, g) => sum + g._count.classes, 0)}
            </p>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg">
            <p className="text-xs text-gray-500">Total Students</p>
            <p className="text-2xl font-bold text-purple-600">
              {gradesData.reduce((sum, g) => sum + g._count.students, 0)}
            </p>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg">
            <p className="text-xs text-gray-500">Avg Students/Grade</p>
            <p className="text-2xl font-bold text-orange-600">
              {count > 0 ? Math.round(gradesData.reduce((sum, g) => sum + g._count.students, 0) / count) : 0}
            </p>
          </div>
        </div>
      )}

      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={gradesData} />

      {/* PAGINATION */}
      <Pagination count={count} page={p} />
    </div>
  );
};

export default GradePage;