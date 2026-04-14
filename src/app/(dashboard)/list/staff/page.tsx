import Image from "next/image";
import Link from "next/link";

import Pagination from "../../../../components/Pagination";
import Table from "../../../../components/Table";
import TableSearch from "../../../../components/TableSearch";
import {  Employee,  Prisma,  } from "@prisma/client";
import prisma from "../../../../lib/db";
import { itemPerPage } from "../../../../lib/setting";

import FormContainer from "../../../../components/FormContainer";
import { getUserRoleAuth } from "@/lib/logsessition";
type StaffPagePageType = Employee ;



const StaffPagePage = async({searchParams}: {searchParams: {[key: string]: string | undefined}}) => {
  const { page, ...queryParams } = searchParams;


  const p = page ? parseInt(page) : 1;
   // Get the logged-in user with their school information
  const { role, schoolId } = await getUserRoleAuth();

 
  
const columns = [
  {
    header: "Info",
    accessor: "info",
  },
  {
    header: "Staff ID",
    accessor: "staffId",
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
...(role === "admin" ) ? [ {
    header: "Actions",
    accessor: "action",
  }]:[],
];
   const renderRow = (item: StaffPagePageType) =>  (
        <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="flex items-center gap-4 p-4">
        <Image
          src={item.img || "/avatar.png"}
          alt=""
          width={40}
          height={40}
          className="md:hidden xl:block w-10 h-10 rounded-full object-cover"
        />
        <div className="flex flex-col">
          <h3 className="font-semibold">{item.name}</h3>
          <p className="text-xs text-gray-500">{item?.schoolId}</p>
        </div>
      </td>
      <td className="hidden md:table-cell">{item.username}</td>
      {/* <td className="hidden md:table-cell">{item.class.name[0]}</td> */}
      <td className="hidden md:table-cell">{item.phone}</td>
      <td className="hidden md:table-cell">{item.address}</td>
      <td>
        <div className="flex items-center gap-2">
          <Link href={`/list/staff/${item.id}`}>
            <button className="w-7 h-7 flex items-center justify-center rounded-full bg-lamaSky">
              <Image src="/view.png" alt="" width={16} height={16} />
            </button>
          </Link>
          {role === "admin" && (
            // <button className="w-7 h-7 flex items-center justify-center rounded-full bg-lamaPurple">
            //   <Image src="/delete.png" alt="" width={16} height={16} />
            // </button>
            <FormContainer table="staff" type="delete" id={item.id} />
          )}
        </div>
      </td>
    </tr>
        
    )

// url params conditions 

  const query: Prisma.EmployeeWhereInput = {
    
     schoolId: Number(schoolId),
     role: "STAFF",
  };

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "staffId":
            query.name = {
                contains: value,
                mode: "insensitive",
                
            };
            break;
          case "search":
            query.name = { contains: value, mode: "insensitive" };
            break;
          default:
            break;
        }
      }
    }
  }

    // If no schoolId, return empty or error
  if (!schoolId) {
    return (
      <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
        <div className="text-center text-red-500">
          <p>Error: No school associated with this account.</p>
          <p>Please contact administrator.</p>
        </div>
      </div>
    );
  }



  const [staffData, count] = await prisma.$transaction([
      prisma.employee.findMany({
        where:query,
        include:{
            school:true,

        },
    
    take: itemPerPage,
    skip: itemPerPage * (p - 1),
    orderBy:{
      createdAt: "desc"
    },
   

  }),
  prisma.employee.count({where:query})
  ])


  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Staff ({count})</h1>
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
              // <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              //   <Image src="/plus.png" alt="" width={14} height={14} />
              // </button>
              <FormContainer table="staff" type="create" />
            )}
          </div>
        </div>
      </div>
      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={staffData} />
      {/* PAGINATION */}
      <Pagination page={p} count={count} />
    </div>
  );
};

export default StaffPagePage;
