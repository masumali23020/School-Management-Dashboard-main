// app/[schoolSlug]/page.tsx

import EventsSection from "@/components/hompage/Eventssection";
import Footer from "@/components/hompage/Footer";
import HeroSlider from "@/components/hompage/Heroslider";
import NoticeBoard from "@/components/hompage/Noticeboard";
import SchoolNavbar from "@/components/hompage/SchoolNavber";
import StatsSection from "@/components/hompage/Statssection";

import { getAnnouncements, getEvents, getSchoolSettings, getSliders } from "@/lib/getSchoolData";
import prisma from "@/lib/db";
import { notFound } from "next/navigation";

export default async function HomePage({ params }: { params: { schoolSlug: string } }) {
  // ১. ইউআরএল-এর স্ল্যাগ দিয়ে ডাটাবেজ থেকে স্কুল খুঁজে বের করা
  const school = await prisma.school.findUnique({
    where: { slug: params.schoolSlug }, // অবশ্যই 'slug' দিয়ে সার্চ করবেন
    select: { id: true, schoolName: true }
  });

  // যদি ডাটাবেজে এই স্ল্যাগ না থাকে, তবে ৪-০-৪ পেজে পাঠিয়ে দিন
  if (!school) {
    notFound(); 
  }

  const schoolIdStr = String(school.id);

  // ২. নির্দিষ্ট স্কুলের আইডি দিয়ে ডাটা লোড করা (লগইন থাকুক বা না থাকুক)
  // এটি করার ফলে লিঙ্ক শেয়ার করলে যে কেউ ডাটা দেখতে পারবে
  const [settings, sliders, announcements, events] = await Promise.all([
    getSchoolSettings(schoolIdStr),
    getSliders(schoolIdStr),
    getAnnouncements(schoolIdStr),
    getEvents(schoolIdStr),
  ]);

  return (
    <main className="min-h-screen bg-slate-50">
      {/* ৩. এখন এই কম্পোনেন্টগুলো ওই নির্দিষ্ট স্কুলের ডাটা দেখাবে */}
      <SchoolNavbar settings={settings} />
      
      <HeroSlider 
        sliders={sliders} 
        schoolName={settings?.schoolName ?? "Our School"} 
      />
      
      <StatsSection />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          <EventsSection events={events} />
        </div>
        <div className="lg:col-span-1">
          <NoticeBoard announcements={announcements} />
        </div>
      </section>
      
      <Footer settings={settings} />
    </main>
  );
}