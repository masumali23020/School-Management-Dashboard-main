// app/[schoolSlug]/events/page.tsx

import Footer from "@/components/hompage/Footer";
import SchoolNavbar from "@/components/hompage/SchoolNavber";
import prisma from "@/lib/db";
import { getSchoolSettings } from "@/lib/getSchoolData";
import { notFound } from "next/navigation";

export const metadata = { title: "ইভেন্ট" };

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("bn-BD", { day: "numeric", month: "long", year: "numeric" }).format(new Date(date));
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("bn-BD", { hour: "2-digit", minute: "2-digit" }).format(new Date(date));
}

const colors = [
  { bar: "bg-blue-600", badge: "bg-blue-600", light: "bg-blue-50 text-blue-700" },
  { bar: "bg-emerald-600", badge: "bg-emerald-600", light: "bg-emerald-50 text-emerald-700" },
  { bar: "bg-purple-600", badge: "bg-purple-600", light: "bg-purple-50 text-purple-700" },
  { bar: "bg-rose-600", badge: "bg-rose-600", light: "bg-rose-50 text-rose-700" },
  { bar: "bg-amber-500", badge: "bg-amber-500", light: "bg-amber-50 text-amber-700" },
  { bar: "bg-sky-600", badge: "bg-sky-600", light: "bg-sky-50 text-sky-700" },
];

export default async function EventsPage({ params }: { params: { schoolSlug: string } }) {
  // ১. স্ল্যাগ দিয়ে স্কুল খুঁজে বের করা (পাবলিক অ্যাক্সেস)
  const school = await prisma.school.findUnique({
    where: { slug: params.schoolSlug },
    select: { id: true, schoolName: true }
  });

  if (!school) {
    notFound();
  }

  const schoolId = school.id;

  // ২. স্কুল সেটিংস ডাটা ফেচিং
  const settings = await getSchoolSettings(Number(schoolId));

  if (!settings) {
    return <div>লোড হচ্ছে...</div>;
  }

  // ৩. ইভেন্ট ডাটা ফেচিং (নির্দিষ্ট স্কুলের)
  const [upcoming, past] = await Promise.all([
    prisma.event.findMany({
      where: { 
        schoolId: schoolId,
        isPublic: true, 
        endTime: { gte: new Date() } 
      },
      include: { class: true },
      orderBy: { startTime: "asc" },
    }),
    prisma.event.findMany({
      where: { 
        schoolId: schoolId,
        isPublic: true, 
        endTime: { lt: new Date() } 
      },
      include: { class: true },
      orderBy: { startTime: "desc" },
      take: 6,
    }),
  ]);

  const currentYear = settings?.academicSession ?? new Date().getFullYear().toString();

  return (
    <main className="min-h-screen bg-slate-50">
      <SchoolNavbar settings={settings} />

      {/* Hero - Admission Page এর মতো */}
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
              ইভেন্ট — সেশন {currentYear}
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight">
              সকল <span className="text-sky-300">ইভেন্ট</span>
            </h1>
            <p className="mt-5 text-sky-100/90 text-lg max-w-2xl mx-auto leading-relaxed">
              বিদ্যালয়ের সকল আসন্ন ও অতীত কার্যক্রম এখানে দেখুন
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 space-y-16">
        {/* Upcoming Events */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-2xl font-bold text-[#1a365d]">আসন্ন ইভেন্ট</h2>
            <span className="ml-auto bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full">
              {upcoming.length}টি
            </span>
          </div>

          {upcoming.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-14 text-center text-gray-400">
              <p className="text-5xl mb-3">📅</p>
              <p className="font-medium">কোনো আসন্ন ইভেন্ট নেই</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcoming.map((event, idx) => {
                const c = colors[idx % colors.length];
                return (
                  <article
                    key={event.id}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all hover:-translate-y-0.5 group"
                  >
                    <div className={`h-1.5 ${c.bar}`} />
                    <div className="p-5">
                      <div className="flex items-start gap-4">
                        <div
                          className={`flex-shrink-0 ${c.badge} text-white rounded-xl p-2 w-14 text-center`}
                        >
                          <p className="text-[10px] font-bold uppercase tracking-wide opacity-80">
                            {new Intl.DateTimeFormat("en", { month: "short" }).format(
                              new Date(event.startTime)
                            )}
                          </p>
                          <p className="text-2xl font-extrabold leading-tight">
                            {new Date(event.startTime).getDate()}
                          </p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-[#1a365d] text-sm group-hover:text-sky-600 transition-colors line-clamp-2">
                            {event.title}
                          </h3>
                          <p className="text-gray-500 text-xs mt-1.5 line-clamp-3 leading-relaxed">
                            {event.description}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-50 flex flex-wrap gap-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <svg
                            className="w-3.5 h-3.5 text-sky-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          {formatDate(event.startTime)}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg
                            className="w-3.5 h-3.5 text-emerald-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          {formatTime(event.startTime)} — {formatTime(event.endTime)}
                        </span>
                        <span
                          className={`ml-auto px-2 py-0.5 rounded-full font-semibold ${
                            event.class
                              ? "bg-amber-50 text-amber-600"
                              : "bg-sky-50 text-sky-600"
                          }`}
                        >
                          {event.class ? `শ্রেণি: ${event.class.name}` : "সার্বজনীন"}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Past Events */}
        {past.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-8">
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              <h2 className="text-2xl font-bold text-gray-500">অতীত ইভেন্ট</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {past.map((event, idx) => {
                const c = colors[idx % colors.length];
                return (
                  <article
                    key={event.id}
                    className="bg-white/60 rounded-2xl border border-gray-100 overflow-hidden opacity-75 hover:opacity-100 transition-opacity"
                  >
                    <div className={`h-1 ${c.bar} opacity-40`} />
                    <div className="p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 bg-gray-100 text-gray-500 rounded-xl p-2 w-14 text-center">
                          <p className="text-[10px] font-bold uppercase tracking-wide">
                            {new Intl.DateTimeFormat("en", { month: "short" }).format(
                              new Date(event.startTime)
                            )}
                          </p>
                          <p className="text-xl font-extrabold leading-tight">
                            {new Date(event.startTime).getDate()}
                          </p>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-600 text-sm line-clamp-2">
                            {event.title}
                          </h3>
                          <p className="text-gray-400 text-xs mt-1">
                            {formatDate(event.startTime)}{" "}
                            {event.class && ` • ${event.class.name}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <Footer settings={settings} />
    </main>
  );
}