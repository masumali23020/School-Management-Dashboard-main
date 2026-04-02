import EventsSection from "@/components/hompage/Eventssection";
import Footer from "@/components/hompage/Footer";
import HeroSlider from "@/components/hompage/Heroslider";
import NoticeBoard from "@/components/hompage/Noticeboard";
import SchoolNavbar from "@/components/hompage/SchoolNavber";
import StatsSection from "@/components/hompage/Statssection";
import { getAnnouncements, getEvents, getSchoolSettings, getSliders } from "@/lib/getSchoolData";

export default async function HomePage() {
  const [settings, sliders, announcements, events] = await Promise.all([
    getSchoolSettings(),
    getSliders(),
    getAnnouncements(),
    getEvents(),
  ]);

  return (
    <main className="min-h-screen bg-slate-50">
      <SchoolNavbar settings={settings} />
      <HeroSlider sliders={sliders} schoolName={settings?.schoolName ?? "Our School"} />
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