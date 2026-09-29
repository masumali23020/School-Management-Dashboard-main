import Image from "next/image";

import Pagination from "../../../../components/Pagination";
import Table from "../../../../components/Table";
import TableSearch from "../../../../components/TableSearch";

import { itemPerPage } from "../../../../lib/setting";
import FormContainer from "../../../../components/FormContainer";
import { Class, Lesson, Subject, Prisma, Employee } from "@prisma/client";
import prisma from "../../../../lib/db";
import { getUserRoleAuth } from "@/lib/logsessition";

type Lessontype = Lesson & { 
  subject: Subject; 
  class: Class; 
  teacher: Employee;
};

const LessonListPage = async ({ searchParams }: { searchParams: { [key: string]: string | undefined } }) => {
  const { page, ...queryParams } = searchParams;
  const { role, schoolId } = await getUserRoleAuth();

  const p = page ? parseInt(page) : 1;

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
    { header: "Subject Name", accessor: "subject" },
    { header: "Class", accessor: "class" },
    { header: "Lesson Name", accessor: "name" },
    { header: "Day", accessor: "day" },
    { header: "Start Time", accessor: "startTime", className: "hidden md:table-cell" },
    { header: "End Time", accessor: "endTime", className: "hidden md:table-cell" },
    { header: "Teacher", accessor: "teacher", className: "hidden md:table-cell" },
    ...(role === "admin" ? [{ header: "Actions", accessor: "action" }] : [])
  ];

  // Build query with school filter
  const query: Prisma.LessonWhereInput = {
    class: {
      schoolId: schoolId  // 🔥 Only lessons from this school
    }
  };

  // Apply search filters from URL params
  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "classId":
            query.classId = parseInt(value);
            break;
          case "teacherId":
            query.teacherId = value;
            break;
          case "search":
            query.OR = [
              { subject: { name: { contains: value, mode: "insensitive" } } },
              { class: { name: { contains: value, mode: "insensitive" } } },
              { name: { contains: value, mode: "insensitive" } }
            ];
            break;
          default:
            break;
        }
      }
    }
  }

  // Fetch lessons with all relations
  const [lessonsData, count] = await prisma.$transaction([
    prisma.lesson.findMany({
      where: {
        ...query,
        teacher: {
          role: "TEACHER",
        },
        class: {
          schoolId: schoolId
        }
      },
      include: {
        subject: {
          select: { id: true, name: true }
        },
        class: {
          select: { id: true, name: true, grade: { select: { level: true } } }
        },
        teacher: {
          select: {
            id: true,
            name: true,
            surname: true,
            role: true,
          }
        },
      },
      take: itemPerPage,
      skip: itemPerPage * (p - 1),
      orderBy: {
        startTime: "asc",
      },
    }),
    prisma.lesson.count({
      where: {
        ...query,
        teacher: {
          role: "TEACHER",
        },
        class: {
          schoolId: schoolId
        }
      },
    }),
  ]);

  const renderRow = (item: Lessontype) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="p-3">{item.subject?.name || "—"}</td>
      <td className="p-3">{item.class?.name || "—"}</td>
      <td className="p-3">{item.name || "—"}</td>
      <td className="p-3">{item.day || "—"}</td>
      <td className="p-3 hidden md:table-cell">
        {item.startTime ? item.startTime.toLocaleTimeString() : "—"}
      </td>
      <td className="p-3 hidden md:table-cell">
        {item.endTime ? item.endTime.toLocaleTimeString() : "—"}
      </td>
      <td className="p-3 hidden md:table-cell">
        {item.teacher?.name && item.teacher?.surname 
          ? `${item.teacher.name} ${item.teacher.surname}`
          : item.teacher?.name || "—"}
      </td>
      <td>
        <div className="flex items-center gap-2">
          {role === "admin" && (
            <>
              <FormContainer table="lesson" type="update" data={item} />
              <FormContainer table="lesson" type="delete" id={item.id} />
            </>
          )}
        </div>
      </td>
    </tr>
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Lessons</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/filter.png" alt="" width={14} height={14} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/sort.png" alt="" width={14} height={14} />
            </button>
            {role === "admin" && <FormContainer table="lesson" type="create" />}
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 mb-4">
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-xs text-gray-500">Total Lessons</p>
          <p className="text-2xl font-bold text-blue-600">{count}</p>
        </div>
        <div className="bg-green-50 p-3 rounded-lg">
          <p className="text-xs text-gray-500">Subjects</p>
          <p className="text-2xl font-bold text-green-600">
            {new Set(lessonsData.map(l => l.subjectId)).size}
          </p>
        </div>
        <div className="bg-purple-50 p-3 rounded-lg">
          <p className="text-xs text-gray-500">Teachers</p>
          <p className="text-2xl font-bold text-purple-600">
            {new Set(lessonsData.map(l => l.teacherId)).size}
          </p>
        </div>
        <div className="bg-orange-50 p-3 rounded-lg">
          <p className="text-xs text-gray-500">Classes</p>
          <p className="text-2xl font-bold text-orange-600">
            {new Set(lessonsData.map(l => l.classId)).size}
          </p>
        </div>
      </div>

      {/* No data message */}
      {lessonsData.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No lessons found for this school.</p>
          {role === "admin" && (
            <p className="text-sm mt-2">Click the &quot;+&quot; button above to create your first lesson.</p>
          )}
        </div>
      )}

      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={lessonsData} />
      
      {/* PAGINATION */}
      <Pagination count={count} page={p} />
    </div>
  );
};

export default LessonListPage;