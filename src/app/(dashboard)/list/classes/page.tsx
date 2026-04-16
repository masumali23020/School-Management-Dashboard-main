// app/(dashboard)/class/page.tsx (স্কুল ভিত্তিক সিকিউরিটি সহ)

import Image from "next/image";
import FormModal from "@/components/FormModal";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/db";
import { Class, Prisma, Subject, ClassSubjectTeacher, Employee } from "@prisma/client";

import FormContainer from "@/components/FormContainer";

import { itemPerPage } from "@/lib/setting";
import ClassDetailModal from "@/components/Classdetailmodal";
import { getUserRoleAuth } from "@/lib/logsessition";

// Extended type with relations
type ClassWithRelations = {
  id: number;
  name: string;
  capacity: number;
  supervisor: Pick<Employee, 'id' | 'name' | 'surname' | 'email' | 'phone'> | null;
  grade: { level: number };
  subjectTeachers: (Pick<ClassSubjectTeacher, 'id' | 'academicYear'> & {
    subject: Pick<Subject, 'id' | 'name'>;
    teacher: Pick<Employee, 'id' | 'name' | 'surname'>;
  })[];
};

const ClassListPage = async ({ 
  searchParams 
}: { 
  searchParams: { [key: string]: string | undefined } 
}) => {
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

  const renderRow = (item: ClassWithRelations) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="flex items-center gap-4 p-4">
        <div>
          <ClassDetailModal item={item} />
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

  // Build query with school filter
  const query: Prisma.ClassWhereInput = {
    schoolId: schoolId, // 🔥 Only show classes from current school
  };

  // Apply search filters from URL params
  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "search":
            query.OR = [
              { name: { contains: value, mode: "insensitive" } },
              { grade: { level: parseInt(value) || undefined } }
            ];
            break;
          case "gradeId":
            query.gradeId = parseInt(value);
            break;
          case "supervisorId":
            query.supervisorId = value;
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
      orderBy: {
        grade: {
          level: 'asc'
        }
      }
    }),
    prisma.class.count({ where: query }),
  ]);

  // Calculate statistics
  const totalClasses = count;
  const totalSubjectsAssigned = classesData.reduce(
    (acc, cls) => acc + cls.subjectTeachers.length, 
    0
  );
  const totalCapacity = classesData.reduce(
    (acc, cls) => acc + cls.capacity, 
    0
  );
  const averageClassSize = totalClasses > 0 
    ? Math.round(totalCapacity / totalClasses) 
    : 0;

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 mb-4">
        <div className="bg-lamaSkyLight p-3 rounded-lg flex items-center gap-2">
          <div className="bg-lamaSky w-10 h-10 rounded-full flex items-center justify-center">
            <Image src="/class.png" alt="" width={20} height={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Classes</p>
            <p className="text-xl font-semibold">{totalClasses}</p>
          </div>
        </div>
        
        <div className="bg-lamaYellowLight p-3 rounded-lg flex items-center gap-2">
          <div className="bg-lamaYellow w-10 h-10 rounded-full flex items-center justify-center">
            <Image src="/teacher.png" alt="" width={20} height={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Subjects Assigned</p>
            <p className="text-xl font-semibold">{totalSubjectsAssigned}</p>
          </div>
        </div>

        <div className="bg-green-50 p-3 rounded-lg flex items-center gap-2">
          <div className="bg-green-500 w-10 h-10 rounded-full flex items-center justify-center">
            <Image src="/student.png" alt="" width={20} height={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Capacity</p>
            <p className="text-xl font-semibold">{totalCapacity}</p>
          </div>
        </div>

        <div className="bg-purple-50 p-3 rounded-lg flex items-center gap-2">
          <div className="bg-purple-500 w-10 h-10 rounded-full flex items-center justify-center">
            <Image src="/statistics.png" alt="" width={20} height={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Avg Class Size</p>
            <p className="text-xl font-semibold">{averageClassSize}</p>
          </div>
        </div>
      </div>

      {/* Warning for no data */}
      {classesData.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-teal-600 text-2xl">At first create some grade levels.</p>
          <p>No classes found for your school.</p>
          {role === "admin" && (
            <p className="text-sm mt-2">
              Click the &quot;+&quot; button above to create your first class.
            </p>
          )}
        </div>
      )}

      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={classesData} />
      
      {/* PAGINATION */}
      <Pagination count={count} page={p} />
    </div>
  );
};

export default ClassListPage;