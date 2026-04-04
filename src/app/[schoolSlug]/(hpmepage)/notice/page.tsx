
import Footer from "@/components/hompage/Footer";
import SchoolNavbar from "@/components/hompage/SchoolNavber";
import prisma from "@/lib/db";
import { getSchoolSettings } from "@/lib/getSchoolData";

export const metadata = { title: "নোটিশ বোর্ড" };

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("bn-BD", {
    day: "numeric", month: "long", year: "numeric",
  }).format(new Date(date));
}

function getRelativeTime(date: Date) {
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "আজ";
  if (days === 1) return "গতকাল";
  if (days < 7) return `${days} দিন আগে`;
  if (days < 30) return `${Math.floor(days / 7)} সপ্তাহ আগে`;
  return `${Math.floor(days / 30)} মাস আগে`;
}

export default async function NoticesPage() {
  const [settings, notices] = await Promise.all([
    getSchoolSettings(),
    prisma.announcement.findMany({
      where: { isPublic: true },
      orderBy: { date: "desc" },
      include: { class: { select: { name: true } } },
    }),
  ]);

  // Group by month
  const grouped = notices.reduce<Record<string, typeof notices>>((acc, notice) => {
    const key = new Intl.DateTimeFormat("bn-BD", { month: "long", year: "numeric" }).format(new Date(notice.date));
    if (!acc[key]) acc[key] = [];
    acc[key].push(notice);
    return acc;
  }, {});

  return (
    <main className="min-h-screen bg-slate-50">
      <SchoolNavbar settings={settings} />

      {/* Hero */}
      <section className="bg-[#1a365d] text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block bg-sky-400/20 border border-sky-400/40 text-sky-300 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-4">
            বিজ্ঞপ্তি
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold">নোটিশ বোর্ড</h1>
          <p className="mt-4 text-sky-100 text-base max-w-xl mx-auto">
            বিদ্যালয়ের সকল সরকারি বিজ্ঞপ্তি ও ঘোষণাসমূহ
          </p>
          <div className="mt-6 inline-flex items-center gap-2 bg-white/10 text-white text-sm px-4 py-2 rounded-full backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            মোট {notices.length}টি নোটিশ
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14">
        {notices.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-16 text-center text-gray-400">
            <p className="text-5xl mb-3">📋</p>
            <p className="font-medium">কোনো নোটিশ নেই</p>
          </div>
        ) : (
          <div className="space-y-12">
            {Object.entries(grouped).map(([month, items]) => (
              <section key={month}>
                {/* Month header */}
                <div className="flex items-center gap-4 mb-5">
                  <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    {month}
                  </h2>
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                    {items.length}টি
                  </span>
                </div>

                <div className="space-y-3">
                  {items.map((notice, idx) => (
                    <article
                      key={notice.id}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#1a365d]/20 transition-all group cursor-pointer overflow-hidden"
                    >
                      <div className="flex items-stretch">
                        {/* Left accent + number */}
                        <div className="w-14 flex-shrink-0 bg-[#1a365d]/5 flex flex-col items-center justify-center py-4 border-r border-gray-100 group-hover:bg-[#1a365d]/10 transition-colors">
                          <span className="text-lg font-extrabold text-[#1a365d]">
                            {new Date(notice.date).getDate()}
                          </span>
                          <span className="text-[10px] text-gray-400 font-medium">
                            {new Intl.DateTimeFormat("bn-BD", { month: "short" }).format(new Date(notice.date))}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 px-5 py-4 min-w-0">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <h3 className="font-bold text-gray-800 group-hover:text-[#1a365d] transition-colors text-sm sm:text-base leading-snug">
                              {notice.title}
                            </h3>
                            <div className="flex flex-wrap gap-1.5 flex-shrink-0">
                              {notice.classId ? (
                                <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-semibold border border-amber-100">
                                  {notice.class?.name ?? "শ্রেণি"}
                                </span>
                              ) : (
                                <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-semibold border border-emerald-100">
                                  সার্বজনীন
                                </span>
                              )}
                              <span className="text-[10px] bg-gray-50 text-gray-400 px-2 py-0.5 rounded-full border border-gray-100">
                                {getRelativeTime(notice.date)}
                              </span>
                            </div>
                          </div>
                          <p className="mt-2 text-gray-500 text-sm leading-relaxed line-clamp-2">
                            {notice.description}
                          </p>
                          <p className="mt-2 text-xs text-gray-400">
                            {formatDate(notice.date)}
                          </p>
                        </div>

                        {/* Arrow */}
                        <div className="flex-shrink-0 flex items-center px-4 text-gray-300 group-hover:text-[#1a365d] transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <Footer settings={settings} />
    </main>
  );
}