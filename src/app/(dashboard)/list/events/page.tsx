import Image from "next/image";
import FormContainer from "../../../../components/FormContainer";
import Pagination from "../../../../components/Pagination";
import Table from "../../../../components/Table";
import TableSearch from "../../../../components/TableSearch";

import { itemPerPage } from "../../../../lib/setting";
import prisma from "../../../../lib/db";
import { Class, Event, Prisma } from "@prisma/client";
import { getUserRoleAuth } from "@/lib/logsessition";

// টাইপ ডিফিনিশন আরও নিখুঁত করা হয়েছে
type EventList = Event & { class: Class | null };

const EventListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { page, ...queryParams } = searchParams;
  const p = page ? parseInt(page) : 1;

  // ইউজার ডাটা একবারই ফেচ করা হচ্ছে
  const { role, userId: currentUserId, schoolId } = await getUserRoleAuth();

  // renderRow ফাংশনটি এখন মূল কম্পোনেন্টের ভেতরে যাতে 'role' সরাসরি এক্সেস করা যায়
  const renderRow = (item: EventList) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="flex items-center gap-4 p-4">{item.title}</td>
      <td>{item.class?.name || "All Classes"}</td>
      <td className="hidden md:table-cell">
        {new Intl.DateTimeFormat("en-GB").format(item.startTime)}
      </td>
      <td className="hidden md:table-cell">
        {item.startTime.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })}
      </td>
      <td className="hidden md:table-cell">
        {item.endTime.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })}
      </td>
      <td>
        <div className="flex items-center gap-2">
          {role === "admin" && (
            <>
              <FormContainer table="event" type="update" data={item} />
              <FormContainer table="event" type="delete" id={item.id} />
            </>
          )}
        </div>
      </td>
    </tr>
  );

  const columns = [
    { header: "Title", accessor: "title" },
    { header: "Class", accessor: "class" },
    { header: "Date", accessor: "date", className: "hidden md:table-cell" },
    { header: "Start Time", accessor: "startTime", className: "hidden md:table-cell" },
    { header: "End Time", accessor: "endTime", className: "hidden md:table-cell" },
    ...(role === "admin" ? [{ header: "Actions", accessor: "action" }] : []),
  ];

  // ── Query Building ──
  const query: Prisma.EventWhereInput = {
    schoolId: schoolId ? Number(schoolId) : undefined, // SaaS isolation
  };

  if (queryParams.search) {
    query.title = { contains: queryParams.search, mode: "insensitive" };
  }

  // Role Based filtering logic
  const roleConditions = {
    teacher: { lessons: { some: { teacherId: currentUserId! } } },
    student: { students: { some: { id: currentUserId! } } },
    parent: { students: { some: { parentId: currentUserId! } } },
  };

  if (role !== "admin") {
    query.OR = [
      { classId: null }, // সবার জন্য ইভেন্ট
      { class: roleConditions[role as keyof typeof roleConditions] || {} },
    ];
  }

  const [eventsData, count] = await prisma.$transaction([
    prisma.event.findMany({
      where: query,
      include: { class: true },
      take: itemPerPage,
      skip: itemPerPage * (p - 1),
      orderBy: { startTime: "asc" },
    }),
    prisma.event.count({ where: query }),
  ]);

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Events</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/filter.png" alt="filter" width={14} height={14} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/sort.png" alt="sort" width={14} height={14} />
            </button>
            {role === "admin" && <FormContainer table="event" type="create" />}
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

export default EventListPage;