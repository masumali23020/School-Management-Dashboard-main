import Image from "next/image";

import Pagination from "../../../../components/Pagination";
import Table from "../../../../components/Table";
import TableSearch from "../../../../components/TableSearch";

import prisma from "../../../../lib/db";
import { Announcement, Class, Prisma } from "@prisma/client";
import { itemPerPage } from "../../../../lib/setting";

import FormContainer from "../../../../components/FormContainer";
import { getUserRoleAuth } from "@/lib/logsessition";

type AnnouncementType = Announcement & { class: Class | null };

const AnnouncementListPage = async ({ 
  searchParams 
}: { 
  searchParams: { [key: string]: string | undefined } 
}) => {
  const { page, ...queryParams } = searchParams;
  const { role, userId: currentUserId, schoolId } = await getUserRoleAuth();

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
    { header: "Title", accessor: "title" },
    { header: "Class", accessor: "class" },
    { header: "Date", accessor: "date", className: "hidden md:table-cell" },
    ...(role === "admin"
      ? [{ header: "Actions", accessor: "action" }]
      : []),
  ];

  const renderRow = (item: AnnouncementType) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="flex items-center gap-4 p-4">{item.title}</td>
      <td>{Array.isArray(item.class) ? item.class[0]?.name : item.class?.name || "All Classes"}</td>
      <td className="hidden md:table-cell">
        {new Intl.DateTimeFormat("en-US").format(item.date)}
      </td>
      <td>
        <div className="flex items-center gap-2">
          {role === "admin" && (
            <>
              <FormContainer table="announcement" type="update" data={item} />
              <FormContainer table="announcement" type="delete" id={item.id} />
            </>
          )}
        </div>
      </td>
    </tr>
  );

  // ── Query Building with School Filter ──
  const query: Prisma.AnnouncementWhereInput = {
    schoolId: schoolId, // 🔥 Only announcements from this school
  };

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "search":
            query.title = { contains: value, mode: "insensitive" };
            break;
          case "classId":
            query.classId = parseInt(value);
            break;
          default:
            break;
        }
      }
    }
  }

  // ROLE CONDITIONS
  if (role !== "admin") {
    const roleConditions = {
      teacher: { lessons: { some: { teacherId: currentUserId! } } },
      student: { students: { some: { id: currentUserId! } } },
      parent: { students: { some: { parentId: currentUserId! } } },
    };

    query.OR = [
      { classId: null }, // Public announcements
      {
        class: roleConditions[role as keyof typeof roleConditions] || {},
      },
    ];
  }

  const [announcementsData, count] = await prisma.$transaction([
    prisma.announcement.findMany({
      where: query,
      include: {
        class: true,
      },
      take: itemPerPage,
      skip: itemPerPage * (p - 1),
      orderBy: { date: "desc" },
    }),
    prisma.announcement.count({ where: query }),
  ]);

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          All Announcements
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
            {role === "admin" && (
              <FormContainer table="announcement" type="create" />
            )}
          </div>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 mb-4">
        <div className="bg-lamaSkyLight p-3 rounded-lg">
          <p className="text-xs text-gray-500">Total Announcements</p>
          <p className="text-xl font-semibold">{count}</p>
        </div>
        <div className="bg-lamaYellowLight p-3 rounded-lg">
          <p className="text-xs text-gray-500">Public Announcements</p>
          <p className="text-xl font-semibold">
            {announcementsData.filter(a => a.classId === null).length}
          </p>
        </div>
        <div className="bg-lamaPurpleLight p-3 rounded-lg">
          <p className="text-xs text-gray-500">Class Specific</p>
          <p className="text-xl font-semibold">
            {announcementsData.filter(a => a.classId !== null).length}
          </p>
        </div>
        <div className="bg-lamaGreenLight p-3 rounded-lg">
          <p className="text-xs text-gray-500">This Month</p>
          <p className="text-xl font-semibold">
            {announcementsData.filter(a => {
              const now = new Date();
              const date = new Date(a.date);
              return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            }).length}
          </p>
        </div>
      </div>

      {/* No data message */}
      {announcementsData.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No announcements found for this school.</p>
          {role === "admin" && (
            <p className="text-sm mt-2">Click the &quot;+&quot; button above to create your first announcement.</p>
          )}
        </div>
      )}

      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={announcementsData} />
      
      {/* PAGINATION */}
      <Pagination count={count} page={p} />
    </div>
  );
};

export default AnnouncementListPage;