import Image from "next/image";
import FormModal from "../../../../components/FormModal";
import Pagination from "../../../../components/Pagination";
import Table from "../../../../components/Table";
import TableSearch from "../../../../components/TableSearch";

import { Prisma, Subject, Teacher } from "@prisma/client";
import prisma from "../../../../lib/db";
import { itemPerPage } from "../../../../lib/setting";
import FormContainer from "../../../../components/FormContainer";
import { getUserRole } from "../../../../lib/utlis";
type SubjectType = Subject & { teachers: Teacher[]} 



const SubjectListPage = async({searchParams}: {searchParams: {[key: string]: string | undefined}}) => {
  const { page, ...queryParams } = searchParams;
  const { role } = await getUserRole()

  const p = page ? parseInt(page) : 1;
  const columns = [
  {
    header: "Subject Name",
    accessor: "name",
  },
  {
    header: "Teachers",
    accessor: "teachers",
    className: "hidden md:table-cell",
  },
  {
    header: "Actions",
    accessor: "action",
  },
];

 const renderRow = (item: SubjectType) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="flex items-center gap-4 p-4">{item.name}</td>
      <td className="hidden md:table-cell">
        {item.teachers.map((teacher) => teacher.name  ).join(",")}
      </td>
      <td>
        <div className="flex items-center gap-2">
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

// url params conditions 

  const query: Prisma.SubjectWhereInput = {};

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



  const [subjectsData, count] = await prisma.$transaction([
      prisma.subject.findMany({
        where:query,
    include: {
      teachers: true,
    },
    take: itemPerPage,
    skip: itemPerPage * (p - 1),
 
   

  }),
  prisma.subject.count({where:query})
  ])



  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Subjects</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/filter.png" alt="" width={14} height={14} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/sort.png" alt="" width={14} height={14} />
            </button>
            {role === "admin" &&
            <>
           
             <FormContainer table="subject" type="create" /> 
            </>}
          </div>
        </div>
      </div>
      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={subjectsData} />
      {/* PAGINATION */}
      <Pagination count={count} page={p}/>
    </div>
  );
};

export default SubjectListPage;
