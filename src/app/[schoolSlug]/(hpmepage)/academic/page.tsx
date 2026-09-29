// app/[schoolSlug]/academic/page.tsx

import Footer from "@/components/hompage/Footer";
import SchoolNavbar from "@/components/hompage/SchoolNavber";
import prisma from "@/lib/db";
import { getSchoolSettings } from "@/lib/getSchoolData";
import { notFound } from "next/navigation";
import Image from "next/image";

export const metadata = { title: "একাডেমিক" };

export default async function AcademicPage({ params }: { params: { schoolSlug: string } }) {
  // ১. স্ল্যাগ দিয়ে স্কুল খুঁজে বের করা (পাবলিক অ্যাক্সেস)
  const school = await prisma.school.findUnique({
    where: { slug: params.schoolSlug },
    select: { id: true, schoolName: true }
  });

  if (!school) {
    notFound();
  }

  const schoolId = school.id;

  // ২. প্যারালাল ডাটা ফেচিং
  const [settings, classes, subjects, teachers] = await Promise.all([
    getSchoolSettings(Number(schoolId)),
    
    prisma.class.findMany({
      where: { schoolId: schoolId }, 
      include: {
        grade: true,
        supervisor: { select: { name: true, surname: true, designation: true, img: true } },
        _count: { select: { students: true, subjectTeachers: true } },
      },
      orderBy: { grade: { level: "asc" } },
    }),

    prisma.subject.findMany({
      where: { schoolId: schoolId }, 
      include: { _count: { select: { teachers: true } } },
      orderBy: { name: "asc" },
    }),

    prisma.employee.findMany({
      where: { 
        schoolId: schoolId, 
        role: "TEACHER" 
      },
      include: { subjects: { select: { name: true } } },
      orderBy: { name: "asc" },
      take: 8,
    }),
  ]);

  const currentYear = settings?.academicSession ?? new Date().getFullYear().toString();

  // ডাটা লোড না হলে লোডিং দেখাবে
  if (!settings) {
    return <div>লোড হচ্ছে...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <SchoolNavbar settings={settings} />

      {/* Hero Section - Admission Page এর মতো */}
      <section className="relative bg-[#1a365d] overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 70% 50%, rgba(56,189,248,0.15) 0%, transparent 60%)",
          }}
        />
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full border border-white/5" />
        <div className="absolute -bottom-10 -left-10 w-60 h-60 rounded-full border border-white/5" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <div className="text-center">
            <span className="inline-block bg-sky-400/20 border border-sky-400/40 text-sky-300 text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-5">
              {settings?.schoolName || "একাডেমিক কার্যক্রম"} — সেশন {currentYear}
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight">
              শ্রেণি, <span className="text-sky-300">বিষয় ও শিক্ষক</span>
            </h1>
            <p className="mt-5 text-sky-100/90 text-lg max-w-2xl mx-auto leading-relaxed">
              জাতীয় পাঠ্যক্রম অনুসারে আধুনিক পদ্ধতিতে শিক্ষাদান
            </p>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-10 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { label: "মোট শ্রেণি", value: classes.length },
            { label: "মোট বিষয়", value: subjects.length },
            { label: "মোট শিক্ষক", value: teachers.length + "+" },
            { label: "মোট শিক্ষার্থী", value: classes.reduce((a, c) => a + c._count.students, 0) },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-extrabold text-[#1a365d]">{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Classes Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-[#1a365d]">আমাদের শ্রেণিসমূহ</h2>
          <p className="text-gray-500 mt-2 text-sm">শ্রেণি ভিত্তিক তথ্য ও ক্লাস টিচার</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.length > 0 ? (
            classes.map((cls) => (
              <div key={cls.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-[#1a365d]">{cls.name}</h3>
                  <span className="text-xs bg-sky-100 text-sky-600 px-2 py-1 rounded-full">
                    গ্রেড {cls.grade.level}
                  </span>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="text-lg">👨‍🏫</span>
                    <span>ক্লাস টিচার: {cls.supervisor?.name || "নির্ধারিত নয়"} {cls.supervisor?.surname || ""}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="text-lg">👥</span>
                    <span>শিক্ষার্থী: {cls._count.students} জন</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="text-lg">📚</span>
                    <span>বিষয় সংখ্যা: {cls._count.subjectTeachers}টি</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 col-span-3 text-center py-10">কোন শ্রেণি পাওয়া যায়নি</p>
          )}
        </div>
      </section>

      {/* Subjects Section */}
      <section className="bg-white border-y border-gray-100 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#1a365d]">পাঠ্য বিষয়সমূহ</h2>
          <p className="text-gray-500 mt-2 text-sm">আমাদের শিক্ষাক্রমের অন্তর্ভুক্ত বিষয়</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {subjects.length > 0 ? (
              subjects.map((sub) => (
                <div key={sub.id} className="bg-slate-50 rounded-xl p-4 text-center hover:shadow-md transition-shadow border border-gray-100">
                  <p className="font-bold text-[#1a365d]">{sub.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{sub._count.teachers} জন শিক্ষক</p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 col-span-5 text-center py-10">কোন বিষয় পাওয়া যায়নি</p>
            )}
          </div>
        </div>
      </section>

      {/* Teachers Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-[#1a365d]">আমাদের শিক্ষকবৃন্দ</h2>
          <p className="text-gray-500 mt-2 text-sm">দক্ষ ও অভিজ্ঞ শিক্ষকমণ্ডলী</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {teachers.length > 0 ? (
            teachers.map((teacher) => (
              <div key={teacher.id} className="text-center group">
                <div className="relative w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden border-4 border-white shadow-md group-hover:shadow-lg transition-shadow">
                  <Image 
                    src={teacher.img || "/noAvatar.png"} 
                    alt={teacher.name} 
                    fill 
                    className="object-cover"
                  />
                </div>
                <h4 className="font-bold text-gray-800">{teacher.name} {teacher.surname}</h4>
                <p className="text-sky-600 text-sm mt-1">{teacher.designation || "শিক্ষক"}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {teacher.subjects.map(s => s.name).join(", ") || "বিষয় নির্ধারিত নয়"}
                </p>
              </div>
            ))
          ) : (
            <p className="text-gray-500 col-span-4 text-center py-10">কোন শিক্ষক পাওয়া যায়নি</p>
          )}
        </div>
      </section>

      <Footer settings={settings} />
    </main>
  );
}