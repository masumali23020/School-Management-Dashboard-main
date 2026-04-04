// app/(dashboard)/subject/page.tsx

import Image from "next/image";
import FormModal from "@/components/FormModal";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/db";
import { Prisma, Subject, ClassSubjectTeacher, Class, Employee } from "@prisma/client";
import { itemPerPage } from "@/lib/setting";
import Link from "next/link";
import FormContainer from "@/components/FormContainer";
import { getUserRoleAuth } from "@/lib/logsessition";

// Extended type with relations
type SubjectWithRelations = Subject & {
  teachers: Employee[];
  classTeachers: (ClassSubjectTeacher & {
    class: Class;
    teacher: Employee;
  })[];
  _count?: {
    lessons: number;
    classTeachers: number;
  };
};

const SubjectListPage = async ({ 
  searchParams 
}: { 
  searchParams: { [key: string]: string | undefined } 
}) => {
  const { page, ...queryParams } = searchParams;
  const { role } = await getUserRoleAuth();

  const p = page ? parseInt(page) : 1;

  // Columns definition
  const columns = [
    {
      header: "Subject Name",
      accessor: "name",
    },
    // {
    //   header: "Subject Code",
    //   accessor: "code",
    //   className: "hidden md:table-cell",
    // },
    {
      header: "Total Teachers",
      accessor: "teacherCount",
      className: "hidden lg:table-cell",
    },
    {
      header: "Classes & Teachers",
      accessor: "classes",
      className: "hidden xl:table-cell",
    },
    {
      header: "Total Lessons",
      accessor: "lessons",
      className: "hidden lg:table-cell",
    },
    ...(role === "admin" ? [
      {
        header: "Actions",
        accessor: "action",
      },
    ] : []),
  ];

  const renderRow = (item: SubjectWithRelations) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="flex items-center gap-4 p-4">
        <div>
          <h3 className="font-semibold">{item.name}</h3>
        </div>
      </td>
      {/* <td className="hidden md:table-cell">
        {item.code || '—'}
      </td> */}
      <td className="hidden lg:table-cell">
        <div className="flex items-center">
          <span className="bg-lamaSkyLight px-2 py-1 rounded-full text-xs font-medium">
            {item.classTeachers?.length || 0} Teachers
          </span>
        </div>
      </td>
      <td className="hidden xl:table-cell max-w-md">
        <div className="flex flex-col gap-2">
          {item.classTeachers && item.classTeachers.length > 0 ? (
            item.classTeachers.slice(0, 3).map((ct, index) => (
              <div key={ct.id} className="text-xs bg-gray-50 p-2 rounded border border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-lamaSky">{ct.class.name}</span>
                  <span className="text-gray-500 text-[10px]">({ct.academicYear})</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-gray-600">Teacher:</span>
                  <span className="font-medium">{ct.teacher.name} {ct.teacher.surname}</span>
                </div>
              </div>
            ))
          ) : (
            <span className="text-gray-400 italic">No classes assigned</span>
          )}
          {item.classTeachers && item.classTeachers.length > 3 && (
            <div className="text-xs text-gray-500 mt-1">
              +{item.classTeachers.length - 3} more classes
            </div>
          )}
        </div>
      </td>
      <td className="hidden lg:table-cell">
        <span className="bg-lamaYellowLight px-2 py-1 rounded-full text-xs font-medium">
          {item._count?.lessons || 0} Lessons
        </span>
      </td>
      <td>
        <div className="flex items-center gap-2">
          {/* View Details Link */}
          <Link href={`/subject/${item.id}`}>
            <button className="w-7 h-7 flex items-center justify-center rounded-full bg-lamaSkyLight">
              <Image src="/view.png" alt="" width={14} height={14} />
            </button>
          </Link>
          
          {/* Actions for Admin */}
          {role === "admin" && (
            <>
              <FormContainer table="subject" type="update" data={item} />
              <FormContainer table="subject" type="delete" id={item.id} />
            </>
          )}
        </div>
      </td>
    </tr>
  );

  // Build query
  const query: Prisma.SubjectWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "search":
            query.OR = [
              { name: { contains: value, mode: "insensitive" } },
             
            ];
            break;
          case "classId":
            query.classTeachers = {
              some: {
                classId: parseInt(value)
              }
            };
            break;
          case "teacherId":
            query.classTeachers = {
              some: {
                teacherId: value
              }
            };
            break;
          default:
            break;
        }
      }
    }
  }

  // Fetch subjects with all relations
  const [subjectsData, count] = await prisma.$transaction([
    prisma.subject.findMany({
      where: query,
      include: {
        teachers: true,
        classTeachers: {
          include: {
            class: {
              include: {
                grade: true
              }
            },
            teacher: true,
          },
          orderBy: [
            { academicYear: 'desc' },
            { class: { name: 'asc' } }
          ],
        },
        _count: {
          select: {
            lessons: true,
            classTeachers: true,
          },
        },
      },
      take: itemPerPage,
      skip: itemPerPage * (p - 1),
      orderBy: {
        name: 'asc',
      },
    }),
    prisma.subject.count({ where: query }),
  ]);

  // Get statistics for the header
  const totalTeachers = subjectsData.reduce(
    (acc, subject) => acc + (subject.classTeachers?.length || 0), 
    0
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP SECTION */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Subjects</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            {/* Filter Button */}
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/filter.png" alt="" width={14} height={14} />
            </button>
            {/* Sort Button */}
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/sort.png" alt="" width={14} height={14} />
            </button>
            {/* Create Buttons for Admin */}
            {role === "admin" && (
              <div className="flex gap-2">
                <FormContainer table="subject" type="create" />
                <FormContainer table="classSubjectTeacher" type="create" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="flex flex-wrap gap-4 mt-4 mb-4">
        <div className="bg-lamaSkyLight p-3 rounded-lg flex items-center gap-2 flex-1 min-w-[150px]">
          <div className="bg-lamaSky w-10 h-10 rounded-full flex items-center justify-center">
            <Image src="/subject.png" alt="" width={20} height={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Subjects</p>
            <p className="text-xl font-semibold">{count}</p>
          </div>
        </div>
        
        <div className="bg-lamaYellowLight p-3 rounded-lg flex items-center gap-2 flex-1 min-w-[150px]">
          <div className="bg-lamaYellow w-10 h-10 rounded-full flex items-center justify-center">
            <Image src="/teacher.png" alt="" width={20} height={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Assignments</p>
            <p className="text-xl font-semibold">{totalTeachers}</p>
          </div>
        </div>
        
        <div className="bg-lamaPurpleLight p-3 rounded-lg flex items-center gap-2 flex-1 min-w-[150px]">
          <div className="bg-lamaPurple w-10 h-10 rounded-full flex items-center justify-center">
            <Image src="/lesson.png" alt="" width={20} height={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Active Classes</p>
            <p className="text-xl font-semibold">
              {new Set(subjectsData.flatMap(s => s.classTeachers.map(ct => ct.classId))).size}
            </p>
          </div>
        </div>
      </div>

      {/* FILTER TABS (Optional) */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        <button className="px-3 py-1 bg-lamaSky text-white rounded-full text-xs whitespace-nowrap">
          All Subjects
        </button>
        <button className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs whitespace-nowrap">
          With Teachers
        </button>
        <button className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs whitespace-nowrap">
          No Teachers
        </button>
        <button className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs whitespace-nowrap">
          Science
        </button>
        <button className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs whitespace-nowrap">
          Arts
        </button>
        <button className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs whitespace-nowrap">
          Commerce
        </button>
      </div>

      {/* TABLE */}
      <Table columns={columns} renderRow={renderRow} data={subjectsData} />
      
      {/* PAGINATION */}
      <Pagination count={count} page={p} />
    </div>
  );
};

export default SubjectListPage;