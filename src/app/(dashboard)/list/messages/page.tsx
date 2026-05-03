// app/list/students/page.tsx
import prisma from "@/lib/db"; // আপনার Prisma client এর পাথ অনুযায়ী পরিবর্তন করুন
import StudentListClient from "./StudentListClient";

const StudentListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { page, classId, sectionId, search } = searchParams;
  const p = page ? parseInt(page) : 1;

  // Prisma Filter Query তৈরি করা
  const query: any = {};

  if (classId) {
    query.classId = parseInt(classId);
  }

  // যদি আপনার মডেলে Section সরাসরি থাকে তবে এটি কাজ করবে
  if (sectionId) {
    query.class = {
        id: parseInt(sectionId) // অথবা আপনার ডাটাবেস স্ট্রাকচার অনুযায়ী
    };
  }

  if (search) {
    query.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { username: { contains: search, mode: "insensitive" } },
    ];
  }

  // ডাটাবেস থেকে একই সাথে স্টুডেন্ট, কাউন্ট এবং ক্লাসের লিস্ট আনা
  const [students, count, classes] = await prisma.$transaction([
    prisma.student.findMany({
      where: query,
      include: {
        class: true,
        parent: true,
      },
      take: 10,
      skip: 10 * (p - 1),
    }),
    prisma.student.count({ where: query }),
    prisma.class.findMany({
        select: { id: true, name: true }
    }),
  ]);

  return (
    <StudentListClient
      students={JSON.parse(JSON.stringify(students))}
      count={count}

      role="admin" // আপনার Auth logic অনুযায়ী এটি পরিবর্তন করুন
      page={p}
    />
  );
};

export default StudentListPage;