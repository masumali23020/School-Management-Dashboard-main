// app/(dashboard)/subject/[id]/page.tsx

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/db";
import { getUserRole } from "@/lib/utlis";
import FormModal from "@/components/FormModal";
import FormContainer from "@/components/FormContainer";

const SubjectDetailPage = async ({ params }: { params: { id: string } }) => {
  const { role } = await getUserRole();
  const subjectId = parseInt(params.id);

  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    include: {
      teachers: true,
      classTeachers: {
        include: {
          class: {
            include: {
              grade: true,
              students: true,
            },
          },
          teacher: true,
          lessons: {
            include: {
              _count: {
                select: {
                  exams: true,
                  assignments: true,
                },
              },
            },
          },
        },
        orderBy: {
          class: {
            name: 'asc',
          },
        },
      },
      lessons: {
        include: {
          class: true,
          teacher: true,
        },
        take: 10,
      },
    },
  });

  if (!subject) {
    notFound();
  }

  return (
    <div className="bg-white p-6 rounded-md flex-1 m-4 mt-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/subject" className="bg-lamaSkyLight p-2 rounded-full">
            <Image src="/back.png" alt="Back" width={20} height={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">{subject.name}</h1>
            <p className="text-gray-500 text-sm">Code: {subject.code || 'N/A'}</p>
          </div>
        </div>
        {role === "admin" && (
          <div className="flex gap-2">
            <FormContainer table="subject" type="update" data={subject} />
            <FormContainer table="subject" type="delete" id={subject.id} />
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-lamaSkyLight p-4 rounded-lg">
          <p className="text-sm text-gray-500">Total Classes</p>
          <p className="text-2xl font-semibold">{subject.classTeachers.length}</p>
        </div>
        <div className="bg-lamaYellowLight p-4 rounded-lg">
          <p className="text-sm text-gray-500">Total Teachers</p>
          <p className="text-2xl font-semibold">
            {new Set(subject.classTeachers.map(ct => ct.teacherId)).size}
          </p>
        </div>
        <div className="bg-lamaPurpleLight p-4 rounded-lg">
          <p className="text-sm text-gray-500">Total Lessons</p>
          <p className="text-2xl font-semibold">{subject.lessons.length}</p>
        </div>
        <div className="bg-lamaSkyLight p-4 rounded-lg">
          <p className="text-sm text-gray-500">Academic Year</p>
          <p className="text-2xl font-semibold">2024</p>
        </div>
      </div>

      {/* Class-Teacher Assignments */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Class & Teacher Assignments</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subject.classTeachers.map((assignment) => (
            <div key={assignment.id} className="border rounded-lg p-4 hover:shadow-md transition">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg">{assignment.class.name}</h3>
                <span className="bg-lamaSky text-white text-xs px-2 py-1 rounded">
                  Grade {assignment.class.grade.level}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Image src="/teacher.png" alt="" width={16} height={16} />
                  <span className="font-medium">{assignment.teacher.name} {assignment.teacher.surname}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Image src="/lesson.png" alt="" width={16} height={16} />
                  <span>{assignment.lessons.length} Lessons</span>
                </div>
                <div className="flex items-center gap-2">
                  <Image src="/student.png" alt="" width={16} height={16} />
                  <span>{assignment.class.students.length} Students</span>
                </div>
                <div className="flex items-center gap-2">
                  <Image src="/calendar.png" alt="" width={16} height={16} />
                  <span className="text-gray-500">Year: {assignment.academicYear}</span>
                </div>
              </div>
              {role === "admin" && (
                <div className="mt-3 flex justify-end gap-2">
                  <FormContainer table="classSubjectTeacher" type="update" data={assignment} />
                  <FormContainer table="classSubjectTeacher" type="delete" id={assignment.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Lessons */}
      {subject.lessons.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Recent Lessons</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Lesson Name</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Class</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Teacher</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Day</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Time</th>
                </tr>
              </thead>
              <tbody>
                {subject.lessons.map((lesson) => (
                  <tr key={lesson.id} className="border-t">
                    <td className="px-4 py-2">{lesson.name}</td>
                    <td className="px-4 py-2">{lesson.class?.name || 'N/A'}</td>
                    <td className="px-4 py-2">
                      {lesson.teacher?.name} {lesson.teacher?.surname}
                    </td>
                    <td className="px-4 py-2">{lesson.day}</td>
                    <td className="px-4 py-2">
                      {new Date(lesson.startTime).toLocaleTimeString()} - {new Date(lesson.endTime).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectDetailPage;