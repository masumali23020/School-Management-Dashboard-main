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
    getSchoolSettings(String(schoolId)), 
    
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

  return (
    <main className="min-h-screen bg-slate-50">
      <SchoolNavbar settings={settings} />

      {/* ── Hero ── */}
      <section className="relative bg-[#1a365d] overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #38bdf8 0%, transparent 50%), radial-gradient(circle at 80% 20%, #818cf8 0%, transparent 40%)" }} />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-20 text-center text-white">
          <span className="inline-block bg-sky-400/20 border border-sky-400/40 text-sky-300 text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-5">
            {settings?.schoolName || "একাডেমিক কার্যক্রম"}
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight">
            শ্রেণি, বিষয় ও শিক্ষক
          </h1>
          <p className="mt-5 text-sky-100/90 text-lg max-w-2xl mx-auto leading-relaxed">
            জাতীয় পাঠ্যক্রম অনুসারে আধুনিক পদ্ধতিতে শিক্ষাদান — সেশন {currentYear}
          </p>
          
          <div className="mt-10 inline-flex flex-wrap justify-center gap-6 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-8 py-5">
            {[
              { label: "মোট শ্রেণি", value: classes.length },
              { label: "বিষয়", value: subjects.length },
              { label: "শিক্ষক", value: teachers.length + "+" },
              { label: "শিক্ষার্থী", value: classes.reduce((a, c) => a + c._count.students, 0) },
            ].map((s) => (
              <div key={s.label} className="text-center min-w-[70px]">
                <p className="text-2xl font-extrabold text-white">{s.value}</p>
                <p className="text-xs text-sky-200 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Content Sections (আগের ডিজাইন অনুযায়ী) ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 space-y-20">
        
        {/* Classes List */}
        <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-8 flex items-center gap-3">
            <span className="w-2 h-8 bg-sky-500 rounded-full"></span> আমাদের শ্রেণিসমূহ
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((cls) => (
              <div key={cls.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-xl font-bold text-[#1a365d] mb-3">শ্রেণি: {cls.name}</h3>
                <div className="space-y-2 text-sm text-slate-600">
                  <p>👨‍🏫 ক্লাস টিচার: {cls.supervisor?.name} {cls.supervisor?.surname}</p>
                  <p>👥 শিক্ষার্থী: {cls._count.students} জন</p>
                  <p>📚 বিষয় সংখ্যা: {cls._count.subjectTeachers}টি</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Subjects Grid */}
        <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-8 flex items-center gap-3">
            <span className="w-2 h-8 bg-indigo-500 rounded-full"></span> পাঠ্য বিষয়সমূহ
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {subjects.map((sub) => (
              <div key={sub.id} className="bg-white border border-slate-200 p-4 rounded-xl text-center shadow-sm">
                <p className="font-bold text-slate-700">{sub.name}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Teachers Preview */}
        <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-10 flex items-center gap-3">
            <span className="w-2 h-8 bg-emerald-500 rounded-full"></span> আমাদের শিক্ষকবৃন্দ
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {teachers.map((teacher) => (
              <div key={teacher.id} className="text-center group">
                <div className="relative w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden border-4 border-white shadow-md">
                  <Image 
                    src={teacher.img || "/noAvatar.png"} 
                    alt={teacher.name} 
                    fill 
                    className="object-cover"
                  />
                </div>
                <h4 className="font-bold text-slate-900">{teacher.name} {teacher.surname}</h4>
                <p className="text-xs text-sky-600 mb-1">{teacher.designation || "শিক্ষক"}</p>
                <p className="text-[10px] text-slate-400">
                  {teacher.subjects.map(s => s.name).join(", ")}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <Footer settings={settings} />
    </main>
  );
}