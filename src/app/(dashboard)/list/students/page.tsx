// app/list/students/page.tsx
import { Prisma } from "@prisma/client";
import { itemPerPage } from "../../../../lib/setting";
import prisma from "../../../../lib/db";
import { getUserRoleAuth } from "@/lib/logsessition";
import StudentListClient from "./StudentListClient";

const StudentListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { page, ...queryParams } = searchParams;
  let p = page ? parseInt(page) : 1;

  const { role, schoolId } = await getUserRoleAuth();

  if (!schoolId) {
    return (
      <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
        <div className="text-center text-red-500">
          <p>Error: No school associated with this account.</p>
        </div>
      </div>
    );
  }

  const query: Prisma.StudentWhereInput = {
    schoolId: Number(schoolId),
  };

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "classId":
            query.classId = parseInt(value);
            break;
          case "search":
            query.OR = [
              { name: { contains: value, mode: "insensitive" } },
              { phone: { contains: value, mode: "insensitive" } },
              { email: { contains: value, mode: "insensitive" } },
              { username: { contains: value, mode: "insensitive" } },
            ];
            break;
        }
      }
    }
  }

  const [students, count] = await prisma.$transaction([
    prisma.student.findMany({
      where: query,
      include: {
        class: true,
        parent: {
          select: {
            phone: true,
            name: true,
          },
        },
      },
      take: itemPerPage,
      skip: itemPerPage * (p - 1),
    }),
    prisma.student.count({ where: query }),
  ]);

  // Convert to plain objects
  const plainStudents = JSON.parse(JSON.stringify(students));

  return (
    <StudentListClient
      students={plainStudents}
      count={count}
      role={role}
      page={p}
    />
  );
};

export default StudentListPage;