
import Footer from "@/components/hompage/Footer";
import SchoolNavbar from "@/components/hompage/SchoolNavber";
import prisma from "@/lib/db";
import { getSchoolSettings } from "@/lib/getSchoolData";


export const metadata = { title: "একাডেমিক" };

export default async function AcademicPage() {
  const [settings, classes, subjects, teachers] = await Promise.all([
    getSchoolSettings(),
    prisma.class.findMany({
      include: {
        grade: true,
        supervisor: { select: { name: true, surname: true, designation: true } },
        _count: { select: { students: true, subjectTeachers: true } },
      },
      orderBy: { grade: { level: "asc" } },
    }),
    prisma.subject.findMany({
      include: { _count: { select: { teachers: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.employee.findMany({
      where: { role: "TEACHER" },
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
            একাডেমিক কার্যক্রম
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight">
            শ্রেণি, বিষয় ও শিক্ষক
          </h1>
          <p className="mt-5 text-sky-100/90 text-lg max-w-2xl mx-auto leading-relaxed">
            জাতীয় পাঠ্যক্রম অনুসারে আধুনিক পদ্ধতিতে শিক্ষাদান — সেশন {currentYear}
          </p>
          {/* Quick stats */}
          <div className="mt-10 inline-flex flex-wrap justify-center gap-6 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-8 py-5">
            {[
              { label: "মোট শ্রেণি", value: classes.length },
              { label: "বিষয়", value: subjects.length },
              { label: "শিক্ষক", value: teachers.length + "+" },
              { label: "শিক্ষার্থী", value: classes.reduce((a, c) => a + c._count.students, 0) + "+" },
            ].map((s) => (
              <div key={s.label} className="text-center min-w-[70px]">
                <p className="text-2xl font-extrabold text-white">{s.value}</p>
                <p className="text-xs text-sky-200 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tab nav (visual only, JS-free) ── */}
      <nav className="bg-white border-b border-gray-100 sticky top-[64px] z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto">
          {[
            { label: "শ্রেণিসমূহ", href: "#classes" },
            { label: "বিষয়সমূহ", href: "#subjects" },
            { label: "শিক্ষকমণ্ডলী", href: "#teachers" },
            { label: "রুটিন ও সময়সূচি", href: "#routine" },
          ].map((t) => (
            <a key={t.href} href={t.href}
              className="flex-shrink-0 text-sm font-semibold text-gray-500 hover:text-[#1a365d] px-4 py-4 border-b-2 border-transparent hover:border-[#1a365d] transition-colors whitespace-nowrap">
              {t.label}
            </a>
          ))}
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 space-y-20">

        {/* ── Classes ── */}
        <section id="classes">
          <SectionHeader
            tag="শ্রেণিসমূহ"
            title="সকল শ্রেণি ও বিভাগ"
            subtitle={`সেশন ${currentYear} — মোট ${classes.length}টি শ্রেণি`}
          />

          {classes.length === 0 ? (
            <EmptyState icon="🏫" message="কোনো শ্রেণি নেই" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
              {classes.map((cls, idx) => {
                const hues = ["blue", "emerald", "purple", "rose", "amber", "sky", "teal", "orange"];
                const hue = hues[idx % hues.length];
                const colorMap: Record<string, { bar: string; badge: string; text: string; bg: string }> = {
                  blue:    { bar: "bg-blue-600",    badge: "bg-blue-600",    text: "text-blue-700",    bg: "bg-blue-50" },
                  emerald: { bar: "bg-emerald-600", badge: "bg-emerald-600", text: "text-emerald-700", bg: "bg-emerald-50" },
                  purple:  { bar: "bg-purple-600",  badge: "bg-purple-600",  text: "text-purple-700",  bg: "bg-purple-50" },
                  rose:    { bar: "bg-rose-500",    badge: "bg-rose-500",    text: "text-rose-700",    bg: "bg-rose-50" },
                  amber:   { bar: "bg-amber-500",   badge: "bg-amber-500",   text: "text-amber-700",   bg: "bg-amber-50" },
                  sky:     { bar: "bg-sky-500",     badge: "bg-sky-500",     text: "text-sky-700",     bg: "bg-sky-50" },
                  teal:    { bar: "bg-teal-600",    badge: "bg-teal-600",    text: "text-teal-700",    bg: "bg-teal-50" },
                  orange:  { bar: "bg-orange-500",  badge: "bg-orange-500",  text: "text-orange-700",  bg: "bg-orange-50" },
                };
                const c = colorMap[hue];
                return (
                  <div key={cls.id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden group">
                    <div className={`h-1.5 ${c.bar}`} />
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-lg ${c.bg} ${c.text} mb-2`}>
                            গ্রেড {cls.grade.level}
                          </span>
                          <h3 className="text-xl font-extrabold text-[#1a365d] group-hover:text-sky-700 transition-colors">
                            {cls.name}
                          </h3>
                        </div>
                        <div className={`w-12 h-12 rounded-xl ${c.badge} flex items-center justify-center text-white font-extrabold text-lg flex-shrink-0`}>
                          {cls.grade.level}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <Chip icon="👨‍🎓" label="শিক্ষার্থী" value={`${cls._count.students} জন`} />
                        <Chip icon="📚" label="বিষয়" value={`${cls._count.subjectTeachers}টি`} />
                        <Chip icon="👥" label="ধারণক্ষমতা" value={`${cls.capacity} জন`} />
                        {cls.supervisor && (
                          <Chip icon="👨‍🏫" label="শ্রেণি শিক্ষক"
                            value={`${cls.supervisor.name} ${cls.supervisor.surname}`} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Subjects ── */}
        <section id="subjects">
          <SectionHeader
            tag="বিষয়সমূহ"
            title="পাঠ্যক্রমের বিষয়সমূহ"
            subtitle={`মোট ${subjects.length}টি বিষয় পড়ানো হয়`}
          />
          {subjects.length === 0 ? (
            <EmptyState icon="📚" message="কোনো বিষয় নেই" />
          ) : (
            <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {subjects.map((sub) => (
                <div key={sub.id}
                  className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md hover:border-[#1a365d]/20 transition-all group text-center">
                  <div className="w-12 h-12 rounded-xl bg-[#1a365d]/8 flex items-center justify-center mx-auto mb-3 group-hover:bg-[#1a365d]/15 transition-colors">
                    <svg className="w-6 h-6 text-[#1a365d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-[#1a365d] text-sm group-hover:text-sky-600 transition-colors">{sub.name}</h3>
                  <p className="text-xs text-gray-400 mt-1">{sub._count.teachers} জন শিক্ষক</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Teachers ── */}
        <section id="teachers">
          <SectionHeader
            tag="শিক্ষকমণ্ডলী"
            title="আমাদের অভিজ্ঞ শিক্ষকবৃন্দ"
            subtitle="দক্ষ ও অভিজ্ঞ শিক্ষকমণ্ডলী"
          />
          {teachers.length === 0 ? (
            <EmptyState icon="👨‍🏫" message="কোনো শিক্ষক নেই" />
          ) : (
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {teachers.map((t) => {
                const initials = (t.name[0] + (t.surname[0] ?? "")).toUpperCase();
                const bgColors = ["bg-blue-600", "bg-emerald-600", "bg-purple-600", "bg-rose-500", "bg-amber-500", "bg-sky-600", "bg-teal-600", "bg-orange-500"];
                const bg = bgColors[t.name.charCodeAt(0) % bgColors.length];
                return (
                  <div key={t.id}
                    className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all text-center group">
                    <div className={`w-16 h-16 rounded-2xl ${bg} text-white font-extrabold text-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform`}>
                      {initials}
                    </div>
                    <h3 className="font-bold text-gray-800 text-sm">{t.name} {t.surname}</h3>
                    {t.designation && (
                      <p className="text-xs text-sky-600 font-medium mt-0.5">{t.designation}</p>
                    )}
                    {t.subjects.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1 justify-center">
                        {t.subjects.slice(0, 2).map((s) => (
                          <span key={s.name} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                            {s.name}
                          </span>
                        ))}
                        {t.subjects.length > 2 && (
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                            +{t.subjects.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Routine info ── */}
        <section id="routine">
          <SectionHeader
            tag="সময়সূচি"
            title="দৈনিক রুটিন ও নিয়মাবলি"
            subtitle="বিদ্যালয়ের নিয়মিত সময়সূচি"
          />
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* School timings */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-[#1a365d] mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm">🕗</span>
                বিদ্যালয়ের সময়
              </h3>
              <div className="space-y-3 text-sm">
                {[
                  { label: "প্রাতঃ শাখা", time: "সকাল ৭:৩০ — দুপুর ১২:৩০" },
                  { label: "দিবা শাখা", time: "দুপুর ১২:৩০ — বিকাল ৫:০০" },
                  { label: "সাপ্তাহিক ছুটি", time: "শুক্রবার" },
                ].map((r) => (
                  <div key={r.label} className="flex justify-between border-b border-gray-50 pb-2.5 last:border-0 last:pb-0">
                    <span className="text-gray-600">{r.label}</span>
                    <span className="font-semibold text-[#1a365d]">{r.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Class days */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-[#1a365d] mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm">📅</span>
                ক্লাসের দিন
              </h3>
              <div className="grid grid-cols-5 gap-2">
                {["সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র"].map((d, i) => (
                  <div key={d}
                    className={`rounded-xl py-3 text-center text-xs font-bold ${i < 4 ? "bg-[#1a365d] text-white" : "bg-gray-100 text-gray-400 line-through"}`}>
                    {d}
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-gray-400">শনিবার বিশেষ ক্লাস / পরীক্ষার ক্ষেত্রে খোলা থাকে।</p>
            </div>

            {/* Exam schedule */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-[#1a365d] mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-sm">📝</span>
                পরীক্ষা পদ্ধতি
              </h3>
              <div className="space-y-3 text-sm">
                {[
                  { label: "প্রথম সাময়িক", time: "মার্চ — এপ্রিল" },
                  { label: "দ্বিতীয় সাময়িক", time: "জুলাই — আগস্ট" },
                  { label: "বার্ষিক পরীক্ষা", time: "নভেম্বর — ডিসেম্বর" },
                ].map((r) => (
                  <div key={r.label} className="flex justify-between border-b border-gray-50 pb-2.5 last:border-0">
                    <span className="text-gray-600">{r.label}</span>
                    <span className="font-semibold text-[#1a365d] text-xs">{r.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      <Footer settings={settings} />
    </main>
  );
}

/* ── Reusable sub-components ── */

function SectionHeader({ tag, title, subtitle }: { tag: string; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
      <div>
        <span className="inline-block bg-[#1a365d]/8 text-[#1a365d] text-xs font-bold tracking-wider uppercase px-3 py-1 rounded-full mb-2">
          {tag}
        </span>
        <h2 className="text-3xl font-extrabold text-[#1a365d]">{title}</h2>
        <p className="text-gray-500 text-sm mt-1">{subtitle}</p>
      </div>
    </div>
  );
}

function Chip({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-xl p-2.5 text-center">
      <p className="text-base">{icon}</p>
      <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
      <p className="text-xs font-bold text-gray-700 mt-0.5 truncate">{value}</p>
    </div>
  );
}

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="mt-10 bg-white rounded-2xl border border-dashed border-gray-300 p-14 text-center text-gray-400">
      <p className="text-5xl mb-3">{icon}</p>
      <p className="font-medium">{message}</p>
    </div>
  );
}