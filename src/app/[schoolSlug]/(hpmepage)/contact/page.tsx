// app/[schoolSlug]/contact/page.tsx

import Footer from "@/components/hompage/Footer";
import SchoolNavbar from "@/components/hompage/SchoolNavber";
import prisma from "@/lib/db";
import { getSchoolSettings } from "@/lib/getSchoolData";
import { notFound } from "next/navigation";

export const metadata = { title: "যোগাযোগ" };

const contactItems = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    label: "ঠিকানা",
    key: "address" as const,
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    ),
    label: "ফোন",
    key: "phone" as const,
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    label: "ইমেইল",
    key: "email" as const,
    color: "bg-purple-50 text-purple-600",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
      </svg>
    ),
    label: "ওয়েবসাইট",
    key: "website" as const,
    color: "bg-sky-50 text-sky-600",
  },
];

export default async function ContactPage({ params }: { params: { schoolSlug: string } }) {
  // ১. স্ল্যাগ দিয়ে স্কুল খুঁজে বের করা (পাবলিক অ্যাক্সেস) - Home Page এর মতো
  const school = await prisma.school.findUnique({
    where: { slug: params.schoolSlug },
    select: { id: true, schoolName: true }
  });

  if (!school) {
    notFound();
  }

  const schoolId = school.id;

  // ২. স্কুল সেটিংস ডাটা ফেচিং (পাবলিক)
  const settings = await getSchoolSettings(Number(schoolId));

  if (!settings) {
    return <div>লোড হচ্ছে...</div>;
  }

  const currentYear = settings?.academicSession ?? new Date().getFullYear().toString();

  return (
    <main className="min-h-screen bg-slate-50">
      <SchoolNavbar settings={settings} />

      {/* Hero - Home Page এর মতো স্টাইল */}
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
              যোগাযোগ — সেশন {currentYear}
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight">
              আমাদের সাথে <span className="text-sky-300">যোগাযোগ করুন</span>
            </h1>
            <p className="mt-5 text-sky-100/90 text-lg max-w-2xl mx-auto leading-relaxed">
              যেকোনো প্রশ্ন, মতামত বা তথ্যের জন্য আমাদের সাথে যোগাযোগ করুন।
              আমরা ২৪ ঘন্টার মধ্যে উত্তর দেব।
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          {/* Contact info cards */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-bold text-[#1a365d] mb-6">যোগাযোগের তথ্য</h2>

         {contactItems.map((item) => {
  // settings অবজেক্টকে Indexable টাইপে কাস্ট করা
  const schoolSettings = settings as any; 
  
  // চেক করা যে কি-টি আমাদের সেটিংসে আছে কি না
  // যেহেতু website আপনার স্কিমাতে নেই, তাই এটি সচরাচর slug বা অন্য কিছু হতে পারে
  let value: string | null = null;

  if (item.key === "website") {
    value = settings.slug; // ওয়েবসাইট হিসেবে স্কুলের স্ল্যাগ বা ইউআরএল দেখানো
  } else {
    value = schoolSettings[item.key];
  }

  if (!value) return null;

  return (
    <div
      key={item.key}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4 hover:shadow-md transition-shadow"
    >
      <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${item.color} flex items-center justify-center`}>
        {item.icon}
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {item.label}
        </p>
        <p className="mt-1 text-gray-800 font-medium text-sm leading-relaxed">
          {value}
        </p>
      </div>
    </div>
  );
})}

            {/* Facebook */}
            {/* {settings?.facebookPage && (
              <a
                href={settings.facebookPage}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#1877F2] text-white rounded-2xl p-5 flex items-center gap-4 hover:bg-[#166FE5] transition-colors block"
              >
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">
                    Facebook
                  </p>
                  <p className="mt-0.5 font-bold text-sm">আমাদের পেজ ভিজিট করুন</p>
                </div>
              </a>
            )} */}

            {/* EIIN */}
            {settings?.eiinNumber && (
              <div className="bg-[#1a365d]/5 rounded-2xl border border-[#1a365d]/10 p-5">
                <p className="text-xs font-semibold text-[#1a365d]/60 uppercase tracking-wider">
                  EIIN নম্বর
                </p>
                <p className="mt-1 text-[#1a365d] font-bold text-xl">{settings.eiinNumber}</p>
              </div>
            )}
          </div>

          {/* Contact form */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <h2 className="text-xl font-bold text-[#1a365d] mb-6">বার্তা পাঠান</h2>
              <form className="space-y-5" action="#" method="POST">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1.5">
                      আপনার নাম
                    </label>
                    <input
                      type="text"
                      name="name"
                      placeholder="মো. রাহিম উদ্দিন"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a365d]/30 focus:border-[#1a365d]/50 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1.5">
                      ফোন নম্বর
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      placeholder="০১XXXXXXXXX"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a365d]/30 focus:border-[#1a365d]/50 transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1.5">
                    ইমেইল (ঐচ্ছিক)
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="example@email.com"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a365d]/30 focus:border-[#1a365d]/50 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1.5">
                    বিষয়
                  </label>
                  <select
                    name="subject"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1a365d]/30 focus:border-[#1a365d]/50 transition bg-white"
                  >
                    <option value="">বিষয় নির্বাচন করুন</option>
                    <option value="admission">ভর্তি সংক্রান্ত</option>
                    <option value="academic">একাডেমিক তথ্য</option>
                    <option value="fee">বেতন সংক্রান্ত</option>
                    <option value="other">অন্যান্য</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1.5">
                    বার্তা
                  </label>
                  <textarea
                    name="message"
                    rows={5}
                    placeholder="আপনার বার্তা এখানে লিখুন..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a365d]/30 focus:border-[#1a365d]/50 transition resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#1a365d] text-white font-bold py-3 rounded-xl hover:bg-[#1e4080] active:scale-[0.98] transition-all text-sm flex items-center justify-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                  বার্তা পাঠান
                </button>
              </form>
            </div>

            {/* Office hours */}
            <div className="mt-5 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-[#1a365d] mb-4 flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-sky-500"
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
                অফিস সময়সূচি
              </h3>
              <div className="space-y-2 text-sm">
                {[
                  { day: "রবিবার — বৃহস্পতিবার", time: "সকাল ৮:০০ — বিকাল ৪:০০" },
                  { day: "শুক্রবার", time: "বন্ধ" },
                  { day: "শনিবার", time: "সকাল ৯:০০ — দুপুর ১:০০" },
                ].map((row) => (
                  <div
                    key={row.day}
                    className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0"
                  >
                    <span className="text-gray-600 font-medium">{row.day}</span>
                    <span
                      className={`font-semibold ${
                        row.time === "বন্ধ" ? "text-rose-500" : "text-emerald-600"
                      }`}
                    >
                      {row.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Map Section */}
      {settings?.address && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <iframe
              title="School Location"
              className="w-full h-96 rounded-xl"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(
                settings.address
              )}&output=embed`}
              allowFullScreen
              loading="lazy"
            />
          </div>
        </section>
      )}

      <Footer settings={settings} />
    </main>
  );
}