import Link from "next/link";
import Footer from "@/components/hompage/Footer";
import SchoolNavbar from "@/components/hompage/SchoolNavber";
import prisma from "@/lib/db";
import { getSchoolSettings } from "@/lib/getSchoolData";
import { getPublicAdmissionPageData } from "@/lib/admission/public-data";
import { getSchoolHomePath } from "@/lib/admission/routes";
import { notFound } from "next/navigation";

const steps = [
  {
    num: "০১",
    title: "অনলাইন আবেদন",
    desc: "ওয়েবসাইট থেকে ভর্তির আবেদন ফরম পূরণ করুন এবং প্রয়োজনীয় তথ্য দিন।",
    icon: "📋",
    color: "bg-blue-600",
  },
  {
    num: "০২",
    title: "ভর্তি ফি পরিশোধ",
    desc: "bKash বা নির্ধারিত পদ্ধতিতে ভর্তি ফি পরিশোধ করুন এবং Transaction ID জমা দিন।",
    icon: "💳",
    color: "bg-emerald-600",
  },
  {
    num: "০৩",
    title: "কাগজপত্র যাচাই",
    desc: "প্রয়োজনীয় কাগজপত্র আপলোড বা অফিসে জমা দিন। অ্যাডমিন যাচাই করবেন।",
    icon: "📁",
    color: "bg-purple-600",
  },
  {
    num: "০৪",
    title: "অনুমোদন ও ফলাফল",
    desc: "আবেদন পর্যালোচনার পর অনুমোদন বা প্রত্যাখ্যানের তথ্য SMS/ফোনে জানানো হবে।",
    icon: "📢",
    color: "bg-amber-500",
  },
  {
    num: "০৫",
    title: "ভর্তি নিশ্চিত",
    desc: "অনুমোদিত শিক্ষার্থীর ভর্তি নিশ্চিত হলে রোল নম্বর ও ক্লাস বরাদ্দ করা হবে।",
    icon: "✅",
    color: "bg-rose-500",
  },
];

const documents = [
  { label: "জন্ম নিবন্ধন সনদের ফটোকপি", required: true },
  { label: "পূর্ববর্তী বিদ্যালয়ের ছাড়পত্র (TC)", required: true },
  { label: "পূর্ববর্তী পরীক্ষার মার্কশিট", required: true },
  { label: "পিতা/মাতার জাতীয় পরিচয়পত্র", required: true },
  { label: "শিক্ষার্থীর ৪ কপি পাসপোর্ট সাইজ ছবি", required: true },
  { label: "পিতা/মাতার ২ কপি পাসপোর্ট সাইজ ছবি", required: true },
  { label: "টিকা কার্ড / স্বাস্থ্য সনদ", required: false },
  { label: "বিশেষ কোটার ক্ষেত্রে প্রমাণপত্র", required: false },
];

function buildFaqs(
  feeRange: { min: number; max: number },
  openClassCount: number,
  classNames: string[]
) {
  const feeAnswer =
    feeRange.min > 0 && feeRange.max > 0
      ? feeRange.min === feeRange.max
        ? `ভর্তি ফি ৳${feeRange.min.toLocaleString("bn-BD")} (সকল শ্রেণি)।`
        : `শ্রেণি ভেদে ভর্তি ফি ৳${feeRange.min.toLocaleString("bn-BD")} থেকে ৳${feeRange.max.toLocaleString("bn-BD")} পর্যন্ত।`
      : "ভর্তি ফি শ্রেণি অনুযায়ী নির্ধারিত। বিস্তারিত 'আসন তথ্য' বিভাগে দেখুন।";

  const classAnswer =
    classNames.length > 0
      ? `বর্তমানে ${classNames.join(", ")} শ্রেণিতে ভর্তি চলছে।`
      : "বর্তমানে কোনো খোলা ভর্তি সেশন নেই। পরবর্তী বিজ্ঞপ্তির জন্য অপেক্ষা করুন।";

  return [
    {
      q: "অনলাইনে আবেদন করা যাবে?",
      a: openClassCount > 0
        ? "হ্যাঁ, 'এখনই আবেদন করুন' বাটনে ক্লিক করে অনলাইনে আবেদন করতে পারবেন।"
        : "বর্তমানে অনলাইন ভর্তি বন্ধ আছে। নতুন সেশন খোলা হলে এখানে আবেদন বাটন দেখা যাবে।",
    },
    {
      q: "ভর্তি ফি কত?",
      a: feeAnswer,
    },
    {
      q: "কোন কোন শ্রেণিতে ভর্তি চলছে?",
      a: classAnswer,
    },
    {
      q: "পেমেন্ট কীভাবে করব?",
      a: "আবেদন জমা দেওয়ার পর পেমেন্ট পেজে bKash নম্বর ও নির্দেশনা দেখতে পাবেন। Transaction ID দিয়ে পেমেন্ট নিশ্চিত করুন।",
    },
    {
      q: "আসন খালি আছে কি?",
      a: "এই পেজে শ্রেণিভিত্তিক মোট আসন, নিশ্চিত আসন ও বাকি আসন রিয়েল-টাইমে দেখানো হয়।",
    },
    {
      q: "আবেদনের পর কী হবে?",
      a: "পেমেন্ট যাচাই → অ্যাডমিন পর্যালোচনা → অনুমোদন → ভর্তি নিশ্চিত — এই ধাপগুলো অনুসরণ করা হয়।",
    },
  ];
}

export default async function AdmissionLandingPage({
  schoolSlug,
  basePath,
}: {
  schoolSlug: string;
  basePath: string;
}) {
  const contactPath = `${getSchoolHomePath(schoolSlug)}/contact`;

  const school = await prisma.school.findUnique({
    where: { slug: schoolSlug },
    select: { id: true, schoolName: true },
  });

  if (!school) notFound();

  const [settings, pageData] = await Promise.all([
    getSchoolSettings(Number(school.id)),
    getPublicAdmissionPageData(schoolSlug),
  ]);

  if (!settings) {
    return <div>লোড হচ্ছে...</div>;
  }

  const sessionYear =
    pageData?.primarySession?.academicYear ??
    settings.academicSession ??
    new Date().getFullYear().toString();

  const enabled = pageData?.enabled ?? false;
  const canApply = pageData?.canApply ?? false;
  const allClasses = pageData?.allClasses ?? [];
  const openClasses = pageData?.openClasses ?? [];
  const notices = pageData?.notices ?? [];
  const importantDates = pageData?.importantDates ?? [];
  const admissionSetting = pageData?.setting;
  const feeRange = pageData?.feeRange ?? { min: 0, max: 0 };
  const stats = pageData?.stats;

  const faqs = buildFaqs(
    feeRange,
    openClasses.length,
    allClasses.map((c) => c.className)
  );

  const displayClasses = allClasses.length > 0 ? allClasses : [];

  return (
    <main className="min-h-screen bg-slate-50">
      <SchoolNavbar settings={settings} />

      {/* ── Hero ── */}
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-white">
              <span className="inline-block bg-sky-400/20 border border-sky-400/40 text-sky-300 text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-5">
                ভর্তি — সেশন {sessionYear}
              </span>
              <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight">
                আমাদের বিদ্যালয়ে
                <br />
                <span className="text-sky-300">ভর্তি হোন</span>
              </h1>
              <p className="mt-5 text-sky-100/90 text-lg leading-relaxed">
                {canApply
                  ? `${openClasses.length}টি শ্রেণিতে ভর্তি চলছে। আজই অনলাইনে আবেদন করুন।`
                  : enabled
                  ? "ভর্তি সিস্টেম সক্রিয়, তবে বর্তমানে খোলা আসন নেই।"
                  : stats && stats.activeSessionCount > 0
                  ? "ভর্তি সেশন চলছে। শীঘ্রই অনলাইন আবেদন খোলা হবে।"
                  : "ভর্তি বর্তমানে বন্ধ। পরবর্তী বিজ্ঞপ্তির জন্য অপেক্ষা করুন।"}
              </p>

              {stats && (
                <div className="mt-6 flex flex-wrap gap-3">
                  <span className="bg-white/10 text-sky-100 text-xs px-3 py-1.5 rounded-full">
                    {stats.activeSessionCount} সক্রিয় সেশন
                  </span>
                  <span className="bg-white/10 text-sky-100 text-xs px-3 py-1.5 rounded-full">
                    {stats.openClassCount} খোলা শ্রেণি
                  </span>
                  <span className="bg-white/10 text-sky-100 text-xs px-3 py-1.5 rounded-full">
                    {stats.totalApplications} আবেদন
                  </span>
                </div>
              )}

              <div className="mt-8 flex flex-wrap gap-3">
                {canApply ? (
                  <Link
                    href={`${basePath}/admission/apply`}
                    className="bg-sky-400 hover:bg-sky-300 text-[#1a365d] font-bold px-6 py-3 rounded-xl transition-colors text-sm shadow-lg"
                  >
                    এখনই আবেদন করুন
                  </Link>
                ) : (
                  <span className="bg-white/20 text-white/80 font-semibold px-6 py-3 rounded-xl text-sm">
                    ভর্তি বর্তমানে বন্ধ
                  </span>
                )}
                <a
                  href="#process"
                  className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm backdrop-blur-sm"
                >
                  প্রক্রিয়া দেখুন
                </a>
                <Link
                  href={`${basePath}/admission/search`}
                  className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm backdrop-blur-sm"
                >
                  আবেদন খুঁজুন
                </Link>
              </div>
            </div>

            {/* Notices box — server data */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                <h2 className="text-white font-bold">ভর্তি বিজ্ঞপ্তি</h2>
              </div>
              <div className="space-y-3">
                {notices.length === 0 ? (
                  <div className="bg-white/10 rounded-xl p-4 border border-white/10">
                    <p className="text-sky-200/80 text-sm">কোনো সক্রিয় বিজ্ঞপ্তি নেই।</p>
                  </div>
                ) : (
                  notices.map((n, i) => (
                    <div
                      key={`${n.title}-${i}`}
                      className="bg-white/10 rounded-xl p-4 border border-white/10"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-white font-semibold text-sm">{n.title}</h3>
                        <span
                          className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            n.tag === "গুরুত্বপূর্ণ"
                              ? "bg-rose-400/30 text-rose-200"
                              : "bg-emerald-400/30 text-emerald-200"
                          }`}
                        >
                          {n.tag}
                        </span>
                      </div>
                      <p className="text-sky-200/80 text-xs mt-1">{n.date}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                <p className="text-sky-200 text-xs">আরো তথ্যের জন্য সরাসরি যোগাযোগ করুন</p>
                <Link
                  href={contactPath}
                  className="text-sky-300 text-xs font-semibold hover:text-white transition-colors"
                >
                  যোগাযোগ →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 space-y-20">
        {/* ── Admission Process ── */}
        <section id="process">
          <div className="text-center mb-12">
            <span className="inline-block bg-[#1a365d]/8 text-[#1a365d] text-xs font-bold tracking-wider uppercase px-3 py-1 rounded-full mb-3">
              ভর্তি প্রক্রিয়া
            </span>
            <h2 className="text-3xl font-extrabold text-[#1a365d]">কীভাবে ভর্তি হবেন?</h2>
            <p className="text-gray-500 text-sm mt-2">সহজ ৫টি ধাপে অনলাইন ভর্তি প্রক্রিয়া</p>
          </div>

          <div className="relative">
            <div className="hidden lg:block absolute top-10 left-[10%] right-[10%] h-0.5 bg-gray-200 z-0" />
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-6 relative z-10">
              {steps.map((step) => (
                <div key={step.num} className="flex flex-col items-center text-center">
                  <div
                    className={`w-20 h-20 rounded-2xl ${step.color} text-white text-3xl flex items-center justify-center shadow-lg mb-4 relative`}
                  >
                    {step.icon}
                    <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border-2 border-gray-100 text-[#1a365d] text-[10px] font-extrabold flex items-center justify-center shadow-sm">
                      {step.num.slice(-1)}
                    </span>
                  </div>
                  <h3 className="font-bold text-[#1a365d] text-sm">{step.title}</h3>
                  <p className="text-gray-500 text-xs mt-2 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Class availability — live from server ── */}
        <section>
          <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
            <div>
              <span className="inline-block bg-[#1a365d]/8 text-[#1a365d] text-xs font-bold tracking-wider uppercase px-3 py-1 rounded-full mb-2">
                আসন তথ্য
              </span>
              <h2 className="text-3xl font-extrabold text-[#1a365d]">শ্রেণিভিত্তিক আসন সংখ্যা</h2>
              <p className="text-xs text-gray-400 mt-1">ডেটা সার্ভার থেকে রিয়েল-টাইম আপডেট হয়</p>
            </div>
            <span className="text-sm text-gray-400">সেশন {sessionYear}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayClasses.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed bg-white p-8 text-center text-muted-foreground">
                {!enabled
                  ? "ভর্তি সিস্টেম বর্তমানে বন্ধ আছে।"
                  : "বর্তমানে কোনো সক্রিয় ভর্তি সেশন নেই।"}
              </div>
            )}
            {displayClasses.map((ac) => {
              const total = ac.seatCapacity;
              const filled = ac.confirmedCount;
              const available = ac.availableSeats;
              const pct = total > 0 ? Math.min(100, Math.round((filled / total) * 100)) : 0;
              const statusColor =
                available === 0 ? "bg-rose-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500";
              const statusText =
                available === 0 ? "পূর্ণ" : pct >= 70 ? "সীমিত আসন" : "আসন আছে";
              const statusBadge =
                available === 0
                  ? "bg-rose-50 text-rose-600"
                  : pct >= 70
                  ? "bg-amber-50 text-amber-600"
                  : "bg-emerald-50 text-emerald-700";

              return (
                <div
                  key={ac.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5 group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs text-gray-400 font-medium">
                        {ac.sessionName} · Grade {ac.gradeLevel}
                      </p>
                      <h3 className="font-extrabold text-[#1a365d] text-lg">{ac.className}</h3>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusBadge}`}>
                      {statusText}
                    </span>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                      <span>নিশ্চিত {pct}%</span>
                      <span>{available} আসন বাকি</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${statusColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="bg-slate-50 rounded-xl py-2.5">
                      <p className="font-extrabold text-[#1a365d] text-lg">{total}</p>
                      <p className="text-gray-400 text-[10px] mt-0.5">মোট</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl py-2.5">
                      <p className="font-extrabold text-amber-600 text-lg">{ac.pendingCount}</p>
                      <p className="text-gray-400 text-[10px] mt-0.5">আবেদন</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl py-2.5">
                      <p className="font-extrabold text-lg text-emerald-600">
                        ৳{ac.admissionFee.toLocaleString("bn-BD")}
                      </p>
                      <p className="text-gray-400 text-[10px] mt-0.5">ভর্তি ফি</p>
                    </div>
                  </div>

                  {ac.isApplyOpen && (
                    <Link
                      href={`${basePath}/admission/apply`}
                      className="mt-4 block text-center text-xs font-bold text-sky-600 hover:text-sky-800"
                    >
                      এই শ্রেণিতে আবেদন করুন →
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Payment info from server ── */}
        {admissionSetting?.bkashNumber && (
          <section className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8">
            <h2 className="text-2xl font-extrabold text-[#1a365d] mb-4">পেমেন্ট তথ্য</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-5 border border-emerald-100">
                <p className="text-xs text-gray-400 mb-1">bKash নম্বর (Personal)</p>
                <p className="text-2xl font-extrabold text-emerald-700">
                  {admissionSetting.bkashNumber}
                </p>
              </div>
              {admissionSetting.paymentInstruction && (
                <div className="bg-white rounded-xl p-5 border border-emerald-100">
                  <p className="text-xs text-gray-400 mb-2">পেমেন্ট নির্দেশনা</p>
                  <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                    {admissionSetting.paymentInstruction}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Documents + Dates ── */}
        <section>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            <div>
              <span className="inline-block bg-[#1a365d]/8 text-[#1a365d] text-xs font-bold tracking-wider uppercase px-3 py-1 rounded-full mb-3">
                প্রয়োজনীয় কাগজপত্র
              </span>
              <h2 className="text-3xl font-extrabold text-[#1a365d] mb-2">কী কী লাগবে?</h2>
              <p className="text-gray-500 text-sm mb-6">
                আবেদনের সময় নিচের কাগজপত্র অবশ্যই সাথে নিয়ে আসুন।
              </p>

              <div className="space-y-3">
                {documents.map((doc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:border-[#1a365d]/20 transition-colors"
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                        doc.required ? "bg-[#1a365d] text-white" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {doc.required ? "✓" : "○"}
                    </div>
                    <span className="text-sm text-gray-700 font-medium flex-1">{doc.label}</span>
                    {doc.required ? (
                      <span className="text-[10px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
                        আবশ্যক
                      </span>
                    ) : (
                      <span className="text-[10px] bg-gray-50 text-gray-400 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
                        ঐচ্ছিক
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <div className="bg-[#1a365d] rounded-2xl p-6 text-white">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <span>📆</span> গুরুত্বপূর্ণ তারিখ
                </h3>
                <div className="space-y-3">
                  {importantDates.length === 0 ? (
                    <p className="text-sky-200 text-sm">কোনো নির্ধারিত তারিখ নেই।</p>
                  ) : (
                    importantDates.map((d) => (
                      <div
                        key={d.label}
                        className="flex justify-between items-center border-b border-white/10 pb-3 last:border-0 last:pb-0 gap-4"
                      >
                        <span className="text-sky-100 text-sm">{d.label}</span>
                        <span className="font-bold text-white text-sm bg-white/10 px-3 py-1 rounded-full whitespace-nowrap">
                          {d.date}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {pageData?.announcements && pageData.announcements.length > 0 && (
                <div className="bg-sky-50 border border-sky-200 rounded-2xl p-6">
                  <h3 className="font-bold text-[#1a365d] mb-3 flex items-center gap-2">
                    <span>📢</span> সর্বশেষ ঘোষণা
                  </h3>
                  <ul className="space-y-3">
                    {pageData.announcements.map((a) => (
                      <li key={a.id} className="text-sm">
                        <p className="font-semibold text-[#1a365d]">{a.title}</p>
                        <p className="text-gray-600 mt-1 line-clamp-2">{a.description}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="bg-sky-50 border border-sky-200 rounded-2xl p-6">
                <h3 className="font-bold text-[#1a365d] mb-2 flex items-center gap-2">
                  <span>💡</span> জরুরি তথ্য
                </h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-sky-500 mt-0.5">•</span>
                    অনলাইন আবেদনের পর অবশ্যই ভর্তি ফি পরিশোধ করুন।
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-sky-500 mt-0.5">•</span>
                    Transaction ID ভুল দিলে আবেদন যাচাই হবে না।
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-sky-500 mt-0.5">•</span>
                    আসন সংখ্যা রিয়েল-টাইমে আপডেট হয় — আগে আবেদন করলে সুবিধা।
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ — dynamic from server stats ── */}
        <section>
          <div className="text-center mb-10">
            <span className="inline-block bg-[#1a365d]/8 text-[#1a365d] text-xs font-bold tracking-wider uppercase px-3 py-1 rounded-full mb-3">
              সাধারণ প্রশ্ন
            </span>
            <h2 className="text-3xl font-extrabold text-[#1a365d]">প্রায়শই জিজ্ঞাসিত প্রশ্নাবলি</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl mx-auto">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:border-[#1a365d]/20 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-[#1a365d] text-white text-xs font-extrabold flex items-center justify-center mt-0.5">
                    ?
                  </span>
                  <div>
                    <h3 className="font-bold text-[#1a365d] text-sm">{faq.q}</h3>
                    <p className="text-gray-500 text-sm mt-2 leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section
          id="apply"
          className="bg-[#1a365d] rounded-3xl p-10 sm:p-14 text-center text-white relative overflow-hidden"
        >
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: "radial-gradient(circle at 30% 50%, #38bdf8 0%, transparent 50%)",
            }}
          />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-extrabold">ভর্তির জন্য প্রস্তুত?</h2>
            <p className="mt-4 text-sky-100/90 text-lg max-w-xl mx-auto">
              {canApply
                ? "অনলাইনে আবেদন করুন অথবা সরাসরি অফিসে যোগাযোগ করুন।"
                : "বর্তমানে অনলাইন ভর্তি বন্ধ। যোগাযোগ করে তথ্য নিন।"}
            </p>
            <div className="mt-8 flex flex-wrap gap-4 justify-center">
              {canApply && (
                <Link
                  href={`${basePath}/admission/apply`}
                  className="bg-sky-400 hover:bg-sky-300 text-[#1a365d] font-bold px-8 py-3 rounded-xl transition-colors shadow-lg text-sm"
                >
                  অনলাইন আবেদন করুন
                </Link>
              )}
              <Link
                href={contactPath}
                className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-8 py-3 rounded-xl transition-colors text-sm backdrop-blur-sm"
              >
                যোগাযোগ করুন
              </Link>
              <a
                href={`tel:${settings?.phone ?? ""}`}
                className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-8 py-3 rounded-xl transition-colors text-sm backdrop-blur-sm"
              >
                📞 {settings?.phone ?? "ফোন করুন"}
              </a>
            </div>
            {settings?.address && (
              <p className="mt-6 text-sky-200 text-sm flex items-center justify-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                {settings.address}
              </p>
            )}
          </div>
        </section>
      </div>

      <Footer settings={settings} />
    </main>
  );
}
