// app/(dashboard)/class/page.tsx (আপডেট)

import Image from "next/image";
import FormModal from "@/components/FormModal";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/db";
import { Class, Prisma, Teacher, Subject, ClassSubjectTeacher } from "@prisma/client";

import FormContainer from "@/components/FormContainer";
import { getUserRole } from "@/lib/utlis";
import { itemPerPage } from "@/lib/setting";
import ClassDetailModal from "@/components/Classdetailmodal";

// Extended type with relations
type ClassWithRelations = Class & { 
  supervisor: Teacher | null;
  grade: { level: number };
  subjectTeachers: (ClassSubjectTeacher & {
    subject: Subject;
    teacher: Teacher;
  })[];
};



const ClassListPage = async ({ searchParams }: { searchParams: { [key: string]: string | undefined } }) => {
  const { page, ...queryParams } = searchParams;
  const { role } = await getUserRole();

  const p = page ? parseInt(page) : 1;
  const renderRow = (item: ClassWithRelations) => (
  <tr
    key={item.id}
    className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
  >
    {/* Class Name → now opens detail modal on click */}
    <td className="flex items-center gap-4 p-4">
      <div>
        <ClassDetailModal item={item} />  {/* ← REPLACE the old <h3> with this */}
      </div>
    </td>

    <td className="hidden md:table-cell">Grade {item.grade.level}</td>
    <td className="hidden md:table-cell">{item.capacity}</td>
    <td className="hidden lg:table-cell">
      {item.supervisor ? `${item.supervisor.name} ${item.supervisor.surname || ''}` : '—'}
    </td>
    <td className="hidden xl:table-cell max-w-xs">
      <div className="flex flex-col gap-1">
        {item.subjectTeachers && item.subjectTeachers.length > 0 ? (
          item.subjectTeachers.map((st, index) => (
            <div key={st.id} className="text-xs bg-gray-100 p-1 rounded">
              <span className="font-medium">{st.subject.name}:</span>{' '}
              <span>{st.teacher.name} {st.teacher.surname}</span>
              <span className="text-gray-500 ml-1">({st.academicYear})</span>
            </div>
          ))
        ) : (
          <span className="text-gray-400">No subjects assigned</span>
        )}
      </div>
    </td>
    <td>
      <div className="flex items-center gap-2">
        {role === "admin" && (
          <>
            <FormContainer 
              table="classSubjectTeacher" 
              type="create" 
              data={{ classId: item.id }} 
            />
            <FormContainer table="class" type="update" data={item} />
            <FormContainer table="class" type="delete" id={item.id} />
          </>
        )}
      </div>
    </td>
  </tr>
);

  // Columns definition
  const columns = [
    {
      header: "Class Name",
      accessor: "name",
    },
    {
      header: "Grade",
      accessor: "grade",
      className: "hidden md:table-cell",
    },
    {
      header: "Capacity",
      accessor: "capacity",
      className: "hidden md:table-cell",
    },
    {
      header: "Supervisor",
      accessor: "supervisor",
      className: "hidden lg:table-cell",
    },
    {
      header: "Subjects & Teachers",
      accessor: "subjects",
      className: "hidden xl:table-cell",
    },
    ...(role === "admin" ? [
      {
        header: "Actions",
        accessor: "action",
      },
    ] : []),
  ];

 

  // Build query
  const query: Prisma.ClassWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "search":
            query.name = { contains: value, mode: "insensitive" };
            break;
          default:
            break;
        }
      }
    }
  }

  // Fetch classes with all relations
  const [classesData, count] = await prisma.$transaction([
    prisma.class.findMany({
      where: query,
      include: {
        supervisor: true,
        grade: true,
        subjectTeachers: {
          include: {
            subject: true,
            teacher: true,
          },
          orderBy: {
            subject: {
              name: 'asc'
            }
          }
        },
      },
      take: itemPerPage,
      skip: itemPerPage * (p - 1),
    }),
    prisma.class.count({ where: query }),
  ]);

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Classes</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/filter.png" alt="" width={14} height={14} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/sort.png" alt="" width={14} height={14} />
            </button>
            {role === "admin" && (
              <div className="flex gap-2">
                <FormContainer table="class" type="create" />
                <FormContainer table="classSubjectTeacher" type="create" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="flex gap-4 mt-4 mb-4">
        <div className="bg-lamaSkyLight p-3 rounded-lg flex items-center gap-2">
          <div className="bg-lamaSky w-10 h-10 rounded-full flex items-center justify-center">
            <Image src="/class.png" alt="" width={20} height={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Classes</p>
            <p className="text-xl font-semibold">{count}</p>
          </div>
        </div>
        <div className="bg-lamaYellowLight p-3 rounded-lg flex items-center gap-2">
          <div className="bg-lamaYellow w-10 h-10 rounded-full flex items-center justify-center">
            <Image src="/teacher.png" alt="" width={20} height={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Subjects Assigned</p>
            <p className="text-xl font-semibold">
              {classesData.reduce((acc, cls) => acc + cls.subjectTeachers.length, 0)}
            </p>
          </div>
        </div>
      </div>

      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={classesData} />
      
      {/* PAGINATION */}
      <Pagination count={count} page={p} />
    </div>
  );
};

export default ClassListPage;