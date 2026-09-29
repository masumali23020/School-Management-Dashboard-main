import { Assignment, Class, Employee, Exam, Prisma, Subject } from "@prisma/client";
import Image from "next/image";

import prisma from "../../../../lib/db";
import { itemPerPage } from "../../../../lib/setting";
import TableSearch from "../../../../components/TableSearch";
import Table from "../../../../components/Table";
import Pagination from "../../../../components/Pagination";
import FormContainer from "../../../../components/FormContainer";
import { getUserRoleAuth } from "@/lib/logsessition";

type ExamListPageProps = Exam & {
  lesson: {
    subject: Subject;
    class: Class;
    teacher: Employee;
  };
};

const ExamListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { role, userId: currentUserId, schoolId } = await getUserRoleAuth();
  
  const { page, ...queryParams } = searchParams;
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
    {
      header: "Exam Name",
      accessor: "name",
    },
    {
      header: "Subject",
      accessor: "subject",
    },
    {
      header: "Class",
      accessor: "class",
      className: "hidden md:table-cell",
    },
    {
      header: "Session",
      accessor: "session",
      className: "hidden md:table-cell",
    },
    {
      header: "Teacher",
      accessor: "teacher",
      className: "hidden md:table-cell",
    },
    {
      header: "Start Time",
      accessor: "startTime",
      className: "hidden md:table-cell",
    },
    {
      header: "End Time",
      accessor: "endTime",
      className: "hidden md:table-cell",
    },
    ...(role === "admin" || role === "teacher"
      ? [
          {
            header: "Actions",
            accessor: "action",
          },
        ]
      : []),
  ];
  
  const renderRow = (item: ExamListPageProps) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="p-3 font-medium">{item.title}</td>
      <td className="p-3">{item.lesson.subject.name}</td>
      <td className="p-3 hidden md:table-cell">{item.lesson.class.name}</td>
      <td className="p-3 hidden md:table-cell">
        {new Date(item.startTime).getFullYear()} - {new Date(item.endTime).getFullYear()}
      </td>
      <td className="p-3 hidden md:table-cell">
        {item.lesson.teacher.name} {item.lesson.teacher.surname}
      </td>
      <td className="p-3 hidden md:table-cell">
        {new Intl.DateTimeFormat("en-US").format(new Date(item.startTime))}
      </td>
      <td className="p-3 hidden md:table-cell">
        {new Intl.DateTimeFormat("en-US").format(new Date(item.endTime))}
      </td>
      <td>
        <div className="flex items-center gap-2">
          {(role === "admin" || role === "teacher") && (
            <>
              <FormContainer table="exam" type="update" data={item} />
              <FormContainer table="exam" type="delete" id={item.id} />
            </>
          )}
        </div>
      </td>
    </tr>
  );

 // URL PARAMS CONDITION

const lessonFilter: Prisma.LessonWhereInput = {
  class: {
    schoolId,
  },
};

let searchValue: string | undefined;

// ---------------- PARAMS ----------------
if (queryParams) {
  for (const [key, value] of Object.entries(queryParams)) {
    if (!value) continue;

    switch (key) {
      case "classId":
        lessonFilter.classId = parseInt(value);
        break;

      case "teacherId":
        lessonFilter.teacherId = value;
        break;

      case "search":
        searchValue = value;
        break;
    }
  }
}

// ---------------- FINAL QUERY ----------------
const query: Prisma.ExamWhereInput = {
  lesson: lessonFilter,
};

// ---------------- SEARCH ----------------
if (searchValue) {
  query.AND = [
    {
      OR: [
        {
          title: {
            contains: searchValue,
            mode: "insensitive",
          },
        },
        {
          lesson: {
            subject: {
              name: {
                contains: searchValue,
                mode: "insensitive",
              },
            },
          },
        },
        {
          lesson: {
            class: {
              name: {
                contains: searchValue,
                mode: "insensitive",
              },
            },
          },
        },
      ],
    },
  ];
}

  // ROLE CONDITIONS

switch (role) {
  // 👑 ADMIN (Employee)
  case "admin":
    break;

  case "teacher":
    lessonFilter.teacherId = currentUserId!;
    break;

  case "student":
lessonFilter.class = {
  ...(lessonFilter.class as Prisma.ClassWhereInput || {}),
  students: {
    some: {
      id: currentUserId!,
    },
  },
};

  case "parent":
 lessonFilter.class = {
  ...(lessonFilter.class as Prisma.ClassWhereInput || {}),
  students: {
    some: {
      parentId: currentUserId!,
    },
  },
};

  default:
    break;
}


  const [data, count] = await prisma.$transaction([
    prisma.exam.findMany({
      where: query,
      include: {
        lesson: {
          include: {
            subject: { select: { name: true } },
            teacher: { select: { name: true, surname: true } },
            class: { select: { name: true } },
          },
        },
      },
      take: itemPerPage,
      skip: itemPerPage * (p - 1),
      orderBy: {
        startTime: "asc",
      },
    }),
    prisma.exam.count({ where: query }),
  ]);

  // Stats summary data
  const totalExams = count;
  const uniqueSubjects = new Set(data.map(exam => exam.lesson.subject.name)).size;
  const uniqueClasses = new Set(data.map(exam => exam.lesson.class.name)).size;
  const uniqueTeachers = new Set(data.map(exam => exam.lesson.teacherId)).size;

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          All Exams
        </h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/filter.png" alt="" width={14} height={14} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/sort.png" alt="" width={14} height={14} />
            </button>
            {(role === "admin" || role === "teacher") && (
              <FormContainer table="exam" type="create" />
            )}
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 mb-4">
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-xs text-gray-500">Total Exams</p>
          <p className="text-2xl font-bold text-blue-600">{totalExams}</p>
        </div>
        <div className="bg-green-50 p-3 rounded-lg">
          <p className="text-xs text-gray-500">Subjects</p>
          <p className="text-2xl font-bold text-green-600">{uniqueSubjects}</p>
        </div>
        <div className="bg-purple-50 p-3 rounded-lg">
          <p className="text-xs text-gray-500">Classes</p>
          <p className="text-2xl font-bold text-purple-600">{uniqueClasses}</p>
        </div>
        <div className="bg-orange-50 p-3 rounded-lg">
          <p className="text-xs text-gray-500">Teachers</p>
          <p className="text-2xl font-bold text-orange-600">{uniqueTeachers}</p>
        </div>
      </div>

      {/* No data message */}
      {data.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No exams found for this school.</p>
          {(role === "admin" || role === "teacher") && (
            <p className="text-sm mt-2">Click the &quot;+&quot; button above to create your first exam.</p>
          )}
        </div>
      )}

      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={data} />
      
      {/* PAGINATION */}
      <Pagination page={p} count={count} />
    </div>
  );
};

export default ExamListPage;