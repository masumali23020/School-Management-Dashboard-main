import Image from "next/image";
import Link from "next/link";

import Pagination from "../../../../components/Pagination";
import Table from "../../../../components/Table";
import TableSearch from "../../../../components/TableSearch";
import { Parent, Prisma, Student } from "@prisma/client";
import prisma from "../../../../lib/db";
import { itemPerPage } from "../../../../lib/setting";
import { getUserRole } from "../../../../lib/utlis";
import FormContainer from "../../../../components/FormContainer";

type ParentListPageType = Parent & { 
  students: Student[] 
};

const ParentListPage = async({searchParams}: {searchParams: {[key: string]: string | undefined}}) => {
  const { page, ...queryParams } = searchParams;
  const {role} = await getUserRole()

  const p = page ? parseInt(page) : 1;
  
const columns = [
  {
    header: "Info",
    accessor: "info",
  },
  {
    header: "Parent ID",
    accessor: "parentId",
    className: "hidden md:table-cell",
  },
  {
    header: "Students",
    accessor: "students",
    className: "hidden md:table-cell",
  },
  {
    header: "Phone",
    accessor: "phone",
    className: "hidden lg:table-cell",
  },
  {
    header: "Address",
    accessor: "address",
    className: "hidden lg:table-cell",
  },
  {
    header: "Email",
    accessor: "email",
    className: "hidden lg:table-cell",
  },
  ...(role === "admin" ) ? [ {
    header: "Actions",
    accessor: "action",
  }]:[],
];

   const renderRow = (item: ParentListPageType) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="flex items-center gap-4 p-4">
        <div className="flex flex-col">
          <h3 className="font-semibold">{item.name} {item.surname}</h3>
          <p className="text-xs text-gray-500">{item.username}</p>
        </div>
      </td>
      <td className="hidden md:table-cell">{item.id}</td>
      <td className="hidden md:table-cell">
        {item.students.map(student => student.name).join(", ")}
      </td>
      <td className="hidden md:table-cell">{item.phone}</td>
      <td className="hidden md:table-cell">{item.address}</td>
      <td className="hidden md:table-cell">{item.email}</td>
      <td>
        <div className="flex items-center gap-2">
          <Link href={`/list/parents/${item.id}`}>
            <button className="w-7 h-7 flex items-center justify-center rounded-full bg-lamaSky">
              <Image src="/view.png" alt="" width={16} height={16} />
            </button>
          </Link>
          {role === "admin" && (
            <>
              <FormContainer table="parent" type="update" data={item} />
              <FormContainer table="parent" type="delete" id={item.id} />
            </>
          )}
        </div>
      </td>
    </tr>
  );

// url params conditions 
  const query: Prisma.ParentWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "search":
            query.OR = [
              { name: { contains: value, mode: "insensitive" } },
              { surname: { contains: value, mode: "insensitive" } },
              { email: { contains: value, mode: "insensitive" } },
              { phone: { contains: value, mode: "insensitive" } },
            ];
            break;
          case "studentId":
            query.students = {
              some: {
                id: value,
              },
            };
            break;
          default:
            break;
        }
      }
    }
  }

  const [parentData, count] = await prisma.$transaction([
    prisma.parent.findMany({
      where: query,
      include: {
        students: true,
      },
      take: itemPerPage,
      skip: itemPerPage * (p - 1),
      orderBy: {
        createdAt: "desc"
      },
    }),
    prisma.parent.count({where: query})
  ]);

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Parents ({count})</h1>
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
              <FormContainer table="parent" type="create" />
            )}
          </div>
        </div>
      </div>
      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={parentData} />
      {/* PAGINATION */}
      <Pagination page={p} count={count} />
    </div>
  );
};

export default ParentListPage;