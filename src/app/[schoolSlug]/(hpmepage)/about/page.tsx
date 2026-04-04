import Footer from "@/components/hompage/Footer";
import SchoolNavbar from "@/components/hompage/SchoolNavber";
import { getSchoolSettings } from "@/lib/getSchoolData";


export const metadata = { title: "আমাদের সম্পর্কে" };

const features = [
  { icon: "🏛️", title: "প্রতিষ্ঠার ইতিহাস", desc: "দীর্ঘ ৩০ বছরেরও বেশি সময় ধরে শিক্ষার আলো ছড়িয়ে আসছে এই প্রতিষ্ঠান।" },
  { icon: "🎯", title: "আমাদের লক্ষ্য", desc: "জ্ঞান, নৈতিকতা ও দক্ষতার সমন্বয়ে আলোকিত মানুষ তৈরি করা।" },
  { icon: "📖", title: "একাডেমিক কার্যক্রম", desc: "জাতীয় পাঠ্যক্রম অনুসারে আধুনিক পদ্ধতিতে শিক্ষাদান।" },
  { icon: "🤝", title: "সম্প্রদায়ের সাথে", desc: "অভিভাবক ও সমাজের সাথে নিবিড় সম্পর্ক বজায় রেখে শিক্ষার মান উন্নয়ন।" },
];

const stats = [
  { label: "প্রতিষ্ঠাকাল", value: "১৯৯৪" },
  { label: "মোট শিক্ষার্থী", value: "১,২০০+" },
  { label: "অভিজ্ঞ শিক্ষক", value: "৬৫+" },
  { label: "পাসের হার", value: "৯৮%" },
];

const team = [
  { name: "মো. আবদুল করিম", role: "প্রধান শিক্ষক", initials: "আক" },
  { name: "নাসরিন আক্তার", role: "সহকারী প্রধান শিক্ষক", initials: "না" },
  { name: "রফিকুল ইসলাম", role: "অফিস সহকারী", initials: "রই" },
];

export default async function AboutPage() {
  const settings = await getSchoolSettings();

  return (
    <main className="min-h-screen bg-slate-50">
      <SchoolNavbar settings={settings} />

      {/* Hero */}
      <section className="bg-[#1a365d] text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block bg-sky-400/20 border border-sky-400/40 text-sky-300 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-5">
            আমাদের সম্পর্কে
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight">
            {settings?.schoolName ?? "আমাদের বিদ্যালয়"}
          </h1>
          <p className="mt-5 text-sky-100 text-lg max-w-2xl mx-auto leading-relaxed">
            জ্ঞান, মূল্যবোধ ও দক্ষতার সমন্বয়ে আলোকিত মানুষ গড়ার লক্ষ্যে আমরা নিরলসভাবে কাজ করে যাচ্ছি।
          </p>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-10 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-extrabold text-[#1a365d]">{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-[#1a365d]">আমাদের বৈশিষ্ট্যসমূহ</h2>
          <p className="text-gray-500 mt-2 text-sm">কেন আমাদের বিদ্যালয় আলাদা</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div key={f.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow text-center">
              <span className="text-4xl">{f.icon}</span>
              <h3 className="mt-4 font-bold text-[#1a365d] text-base">{f.title}</h3>
              <p className="mt-2 text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* School details + Vision */}
      <section className="bg-white border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div>
            <h2 className="text-3xl font-bold text-[#1a365d] mb-6">বিদ্যালয়ের তথ্য</h2>
            <dl className="space-y-4">
              {[
                { label: "বিদ্যালয়ের নাম", value: settings?.schoolName },
                { label: "সংক্ষিপ্ত নাম", value: settings?.shortName },
                { label: "EIIN নম্বর", value: settings?.eiinNumber },
                { label: "ঠিকানা", value: settings?.address },
                { label: "ফোন", value: settings?.phone },
                { label: "ইমেইল", value: settings?.email },
                { label: "ওয়েবসাইট", value: settings?.website },
                { label: "একাডেমিক সেশন", value: settings?.academicSession },
              ]
                .filter((item) => item.value)
                .map((item) => (
                  <div key={item.label} className="flex gap-4 text-sm border-b border-gray-50 pb-3">
                    <dt className="w-40 flex-shrink-0 text-gray-500 font-medium">{item.label}</dt>
                    <dd className="text-gray-800 font-semibold">{item.value}</dd>
                  </div>
                ))}
            </dl>
          </div>
          <div className="bg-[#1a365d]/5 rounded-3xl p-8 border border-[#1a365d]/10">
            <h3 className="text-xl font-bold text-[#1a365d] mb-4">আমাদের দর্শন</h3>
            <p className="text-gray-600 leading-relaxed text-sm">
              আমরা বিশ্বাস করি প্রতিটি শিক্ষার্থীর মধ্যে অসীম সম্ভাবনা নিহিত আছে। সঠিক পরিবেশ ও দিকনির্দেশনায় সেই সম্ভাবনাকে বিকশিত করাই আমাদের লক্ষ্য।
            </p>
            <p className="mt-4 text-gray-600 leading-relaxed text-sm">
              আমাদের শিক্ষকরা শুধু পাঠদানকারী নন, তারা মেন্টর — প্রতিটি শিক্ষার্থীর সামগ্রিক বিকাশে তারা প্রতিশ্রুতিবদ্ধ।
            </p>
            <div className="mt-6 pt-6 border-t border-[#1a365d]/10">
              <p className="text-[#1a365d] font-bold text-lg">&quot;শিক্ষাই জাতির মেরুদণ্ড&quot;</p>
              <p className="text-gray-500 text-xs mt-1">— আমাদের মূলমন্ত্র</p>
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-[#1a365d]">পরিচালনা পরিষদ</h2>
          <p className="text-gray-500 mt-2 text-sm">আমাদের অভিজ্ঞ নেতৃত্ব</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {team.map((member) => (
            <div key={member.name} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center hover:shadow-md transition-shadow">
              <div className="w-16 h-16 rounded-full bg-[#1a365d] text-white font-bold text-xl flex items-center justify-center mx-auto mb-4">
                {member.initials}
              </div>
              <h3 className="font-bold text-gray-800">{member.name}</h3>
              <p className="text-sky-600 text-sm mt-1">{member.role}</p>
            </div>
          ))}
        </div>
      </section>

      <Footer settings={settings} />
    </main>
  );
}