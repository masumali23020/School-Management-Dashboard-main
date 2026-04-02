
import Footer from "@/components/hompage/Footer";
import SchoolNavbar from "@/components/hompage/SchoolNavber";
import prisma from "@/lib/db";
import { getSchoolSettings } from "@/lib/getSchoolData";
import Link from "next/link";

export const metadata = { title: "ভর্তি তথ্য" };

const steps = [
  {
    num: "০১",
    title: "আবেদন ফরম সংগ্রহ",
    desc: "বিদ্যালয়ের অফিস থেকে অথবা ওয়েবসাইট থেকে ভর্তির আবেদন ফরম সংগ্রহ করুন।",
    icon: "📋",
    color: "bg-blue-600",
    light: "bg-blue-50 text-blue-700",
  },
  {
    num: "০২",
    title: "কাগজপত্র জমা",
    desc: "প্রয়োজনীয় সকল কাগজপত্র পূরণ করে অফিসে জমা দিন।",
    icon: "📁",
    color: "bg-emerald-600",
    light: "bg-emerald-50 text-emerald-700",
  },
  {
    num: "০৩",
    title: "ভর্তি পরীক্ষা",
    desc: "নির্ধারিত তারিখে ভর্তি পরীক্ষায় অংশ নিন। পরীক্ষার তথ্য ফোনে জানানো হবে।",
    icon: "✏️",
    color: "bg-purple-600",
    light: "bg-purple-50 text-purple-700",
  },
  {
    num: "০৪",
    title: "ফলাফল প্রকাশ",
    desc: "পরীক্ষার ৩ কার্যদিবসের মধ্যে ফলাফল নোটিশ বোর্ডে প্রকাশিত হবে।",
    icon: "📢",
    color: "bg-amber-500",
    light: "bg-amber-50 text-amber-700",
  },
  {
    num: "০৫",
    title: "ভর্তি নিশ্চিত",
    desc: "নির্বাচিত শিক্ষার্থীরা নির্ধারিত সময়ের মধ্যে ভর্তি ফি পরিশোধ করে ভর্তি নিশ্চিত করুন।",
    icon: "✅",
    color: "bg-rose-500",
    light: "bg-rose-50 text-rose-700",
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

const faqs = [
  {
    q: "ভর্তি পরীক্ষা কি বাধ্যতামূলক?",
    a: "হ্যাঁ, প্রথম শ্রেণি থেকে নবম শ্রেণি পর্যন্ত ভর্তি পরীক্ষায় অংশ নেওয়া বাধ্যতামূলক।",
  },
  {
    q: "ভর্তির বয়সসীমা কত?",
    a: "প্রথম শ্রেণির জন্য ন্যূনতম ৬ বছর এবং সর্বোচ্চ ৮ বছর। অন্য শ্রেণির ক্ষেত্রে শ্রেণি অনুযায়ী নির্ধারিত।",
  },
  {
    q: "ভর্তি ফি কত?",
    a: "শ্রেণি ভেদে ভর্তি ফি ভিন্ন। বিস্তারিত জানতে অফিসে যোগাযোগ করুন।",
  },
  {
    q: "মাসিক বেতন কত?",
    a: "শ্রেণি ভেদে মাসিক বেতন নির্ধারিত। ফি স্ট্রাকচার অফিস থেকে সংগ্রহ করুন।",
  },
  {
    q: "বৃত্তি বা ছাড়ের সুবিধা আছে কি?",
    a: "মেধাবী ও আর্থিকভাবে অসচ্ছল শিক্ষার্থীদের জন্য বিশেষ ছাড়ের ব্যবস্থা আছে। বিস্তারিত জানতে প্রধান শিক্ষকের সাথে কথা বলুন।",
  },
  {
    q: "কোন কোন শ্রেণিতে ভর্তি নেওয়া হয়?",
    a: "প্রথম থেকে দশম শ্রেণি পর্যন্ত ভর্তি নেওয়া হয়। আসন খালি সাপেক্ষে মধ্যবর্তী শ্রেণিতেও ভর্তি হওয়া যায়।",
  },
];

const notices = [
  { title: "ভর্তি পরীক্ষার তারিখ ঘোষণা", date: "শীঘ্রই প্রকাশিত হবে", tag: "গুরুত্বপূর্ণ" },
  { title: "আবেদন ফরম বিতরণ শুরু", date: "ডিসেম্বর ১ তারিখ থেকে", tag: "চলমান" },
];

export default async function AdmissionPage() {
  const [settings, classes] = await Promise.all([
    getSchoolSettings(),
    prisma.class.findMany({
      include: {
        grade: true,
        _count: { select: { students: true } },
        feeStructures: {
          include: { feeType: true },
          take: 3,
        },
      },
      orderBy: { grade: { level: "asc" } },
    }),
  ]);

  const currentYear = settings?.academicSession ?? new Date().getFullYear().toString();

  return (
    <main className="min-h-screen bg-slate-50">
      <SchoolNavbar settings={settings} />

      {/* ── Hero ── */}
      <section className="relative bg-[#1a365d] overflow-hidden">
        <div className="absolute inset-0"
          style={{ backgroundImage: "radial-gradient(ellipse at 70% 50%, rgba(56,189,248,0.15) 0%, transparent 60%)" }} />
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full border border-white/5" />
        <div className="absolute -bottom-10 -left-10 w-60 h-60 rounded-full border border-white/5" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-white">
              <span className="inline-block bg-sky-400/20 border border-sky-400/40 text-sky-300 text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-5">
                ভর্তি — সেশন {currentYear}
              </span>
              <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight">
                আমাদের বিদ্যালয়ে<br />
                <span className="text-sky-300">ভর্তি হোন</span>
              </h1>
              <p className="mt-5 text-sky-100/90 text-lg leading-relaxed">
                সঠিক শিক্ষা পরিবেশে আপনার সন্তানের ভবিষ্যত গড়ে তুলুন। আজই ভর্তির জন্য আবেদন করুন।
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#apply"
                  className="bg-sky-400 hover:bg-sky-300 text-[#1a365d] font-bold px-6 py-3 rounded-xl transition-colors text-sm shadow-lg">
                  এখনই আবেদন করুন
                </a>
                <a href="#process"
                  className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm backdrop-blur-sm">
                  প্রক্রিয়া দেখুন
                </a>
              </div>
            </div>

            {/* Notices box */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                <h2 className="text-white font-bold">ভর্তি বিজ্ঞপ্তি</h2>
              </div>
              <div className="space-y-3">
                {notices.map((n) => (
                  <div key={n.title} className="bg-white/10 rounded-xl p-4 border border-white/10">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-white font-semibold text-sm">{n.title}</h3>
                      <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${n.tag === "গুরুত্বপূর্ণ" ? "bg-rose-400/30 text-rose-200" : "bg-emerald-400/30 text-emerald-200"}`}>
                        {n.tag}
                      </span>
                    </div>
                    <p className="text-sky-200/80 text-xs mt-1">{n.date}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                <p className="text-sky-200 text-xs">আরো তথ্যের জন্য সরাসরি যোগাযোগ করুন</p>
                <Link href="/contact" className="text-sky-300 text-xs font-semibold hover:text-white transition-colors">
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
            <p className="text-gray-500 text-sm mt-2">সহজ ৫টি ধাপে ভর্তি প্রক্রিয়া সম্পন্ন করুন</p>
          </div>

          <div className="relative">
            {/* Connector line (hidden on mobile) */}
            <div className="hidden lg:block absolute top-10 left-[10%] right-[10%] h-0.5 bg-gray-200 z-0" />
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-6 relative z-10">
              {steps.map((step) => (
                <div key={step.num} className="flex flex-col items-center text-center">
                  <div className={`w-20 h-20 rounded-2xl ${step.color} text-white text-3xl flex items-center justify-center shadow-lg mb-4 relative`}>
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

        {/* ── Class availability ── */}
        <section>
          <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
            <div>
              <span className="inline-block bg-[#1a365d]/8 text-[#1a365d] text-xs font-bold tracking-wider uppercase px-3 py-1 rounded-full mb-2">
                আসন তথ্য
              </span>
              <h2 className="text-3xl font-extrabold text-[#1a365d]">শ্রেণিভিত্তিক আসন সংখ্যা</h2>
            </div>
            <span className="text-sm text-gray-400">সেশন {currentYear}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {classes.map((cls, idx) => {
              const filled = cls._count.students;
              const total = cls.capacity;
              const pct = total > 0 ? Math.min(100, Math.round((filled / total) * 100)) : 0;
              const available = total - filled;
              const statusColor = pct >= 90 ? "bg-rose-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500";
              const statusText = pct >= 90 ? "প্রায় পূর্ণ" : pct >= 70 ? "সীমিত আসন" : "আসন আছে";
              const statusBadge = pct >= 90 ? "bg-rose-50 text-rose-600" : pct >= 70 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-700";

              return (
                <div key={cls.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5 group">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs text-gray-400 font-medium">গ্রেড {cls.grade.level}</p>
                      <h3 className="font-extrabold text-[#1a365d] text-lg">{cls.name}</h3>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusBadge}`}>
                      {statusText}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                      <span>পূর্ণ {pct}%</span>
                      <span>{available} আসন বাকি</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${statusColor}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-center text-sm">
                    <div className="bg-slate-50 rounded-xl py-2.5">
                      <p className="font-extrabold text-[#1a365d] text-lg">{total}</p>
                      <p className="text-gray-400 text-[10px] mt-0.5">মোট আসন</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl py-2.5">
                      <p className={`font-extrabold text-lg ${available === 0 ? "text-rose-500" : "text-emerald-600"}`}>
                        {available}
                      </p>
                      <p className="text-gray-400 text-[10px] mt-0.5">খালি আসন</p>
                    </div>
                  </div>

                  {/* Fee summary if available */}
                  {cls.feeStructures.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-50">
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-2">ফি বিবরণ</p>
                      <div className="space-y-1">
                        {cls.feeStructures.map((fs) => (
                          <div key={fs.id} className="flex justify-between text-xs">
                            <span className="text-gray-500">{fs.feeType.name}</span>
                            <span className="font-bold text-[#1a365d]">৳ {fs.amount.toLocaleString("bn-BD")}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Documents ── */}
        <section>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            <div>
              <span className="inline-block bg-[#1a365d]/8 text-[#1a365d] text-xs font-bold tracking-wider uppercase px-3 py-1 rounded-full mb-3">
                প্রয়োজনীয় কাগজপত্র
              </span>
              <h2 className="text-3xl font-extrabold text-[#1a365d] mb-2">কী কী লাগবে?</h2>
              <p className="text-gray-500 text-sm mb-6">আবেদনের সময় নিচের কাগজপত্র অবশ্যই সাথে নিয়ে আসুন।</p>

              <div className="space-y-3">
                {documents.map((doc, idx) => (
                  <div key={idx}
                    className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:border-[#1a365d]/20 transition-colors">
                    <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${doc.required ? "bg-[#1a365d] text-white" : "bg-gray-100 text-gray-500"}`}>
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

            {/* Important dates + contact */}
            <div className="space-y-5">
              <div className="bg-[#1a365d] rounded-2xl p-6 text-white">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <span>📆</span> গুরুত্বপূর্ণ তারিখ
                </h3>
                <div className="space-y-3">
                  {[
                    { label: "আবেদন ফরম বিতরণ", date: "ডিসেম্বর ১" },
                    { label: "আবেদনের শেষ তারিখ", date: "ডিসেম্বর ৩১" },
                    { label: "ভর্তি পরীক্ষা", date: "জানুয়ারি ৫–৭" },
                    { label: "ফলাফল প্রকাশ", date: "জানুয়ারি ১০" },
                    { label: "ভর্তির শেষ তারিখ", date: "জানুয়ারি ১৫" },
                  ].map((d) => (
                    <div key={d.label} className="flex justify-between items-center border-b border-white/10 pb-3 last:border-0 last:pb-0">
                      <span className="text-sky-100 text-sm">{d.label}</span>
                      <span className="font-bold text-white text-sm bg-white/10 px-3 py-1 rounded-full">{d.date}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-sky-50 border border-sky-200 rounded-2xl p-6">
                <h3 className="font-bold text-[#1a365d] mb-2 flex items-center gap-2">
                  <span>💡</span> জরুরি তথ্য
                </h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-sky-500 mt-0.5">•</span>
                    ভর্তি পরীক্ষায় বাংলা, গণিত ও সাধারণ জ্ঞান থেকে প্রশ্ন আসে।
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-sky-500 mt-0.5">•</span>
                    আবেদন ফরম সঠিকভাবে পূরণ না হলে বাতিল বলে গণ্য হবে।
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-sky-500 mt-0.5">•</span>
                    ভর্তির দিন অবশ্যই অভিভাবকের উপস্থিতি আবশ্যক।
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section>
          <div className="text-center mb-10">
            <span className="inline-block bg-[#1a365d]/8 text-[#1a365d] text-xs font-bold tracking-wider uppercase px-3 py-1 rounded-full mb-3">
              সাধারণ প্রশ্ন
            </span>
            <h2 className="text-3xl font-extrabold text-[#1a365d]">প্রায়শই জিজ্ঞাসিত প্রশ্নাবলি</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl mx-auto">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:border-[#1a365d]/20 hover:shadow-md transition-all">
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
        <section id="apply" className="bg-[#1a365d] rounded-3xl p-10 sm:p-14 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "radial-gradient(circle at 30% 50%, #38bdf8 0%, transparent 50%)" }} />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-extrabold">ভর্তির জন্য প্রস্তুত?</h2>
            <p className="mt-4 text-sky-100/90 text-lg max-w-xl mx-auto">
              আজই আমাদের সাথে যোগাযোগ করুন বা সরাসরি অফিসে আসুন।
            </p>
            <div className="mt-8 flex flex-wrap gap-4 justify-center">
              <Link href="/contact"
                className="bg-sky-400 hover:bg-sky-300 text-[#1a365d] font-bold px-8 py-3 rounded-xl transition-colors shadow-lg text-sm">
                যোগাযোগ করুন
              </Link>
              <a href={`tel:${settings?.phone ?? ""}`}
                className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-8 py-3 rounded-xl transition-colors text-sm backdrop-blur-sm">
                📞 {settings?.phone ?? "ফোন করুন"}
              </a>
            </div>
            {settings?.address && (
              <p className="mt-6 text-sky-200 text-sm flex items-center justify-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
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