import Image from "next/image";
import FormContainer from "../../../../components/FormContainer";
import Pagination from "../../../../components/Pagination";
import Table from "../../../../components/Table";
import TableSearch from "../../../../components/TableSearch";

import { itemPerPage } from "../../../../lib/setting";
import prisma from "../../../../lib/db";
import {  Grade, Prisma } from "@prisma/client";
import { getUserRoleAuth } from "@/lib/logsessition";




type EventList = Grade

const renderRow = async(item: EventList) =>{ 
  const { role } =await getUserRoleAuth();

  return(
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="flex items-center gap-4 p-4">{item.level}</td>
      
      <td>
        <div className="flex items-center gap-2">
          {role === "admin" && (
            <>
              <FormContainer table="grade" type="update" data={item} />
              <FormContainer table="grade" type="delete" id={item.id} />
            </>
          )}
        </div>
      </td>
    </tr>
  )};



const GradePage = async ({ searchParams }: { searchParams: { [key: string]: string | undefined } }) => {
  const { page, ...queryParams } = searchParams;

  const p = page ? parseInt(page) : 1;
  const { role, userId: currentUserId } = await getUserRoleAuth()

  const columns = [
    {
      header: "Level",
      accessor: "level",
    },
    
    ...(role === "admin") ? [
      {
        header: "Actions",
        accessor: "action",
      },
    ]
      : [],

  ];

  // url params conditions 

  const query: Prisma.GradeWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {

          case "search":
             query.level = Number(value) || undefined;
            break;
          default:
            break;
        }
      }
    }
  }



 


  const [eventsData, count] = await prisma.$transaction([
    prisma.grade.findMany({
      where: query,
    
      take: itemPerPage,
      skip: itemPerPage * (p - 1),



    }),
    prisma.grade.count({ where: query })
  ])




  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Grade</h1>
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
      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={eventsData} />
      {/* PAGINATION */}
      <Pagination count={count} page={p} />
    </div>
  );
};

export default GradePage;
