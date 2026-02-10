
import Image from 'next/image';
import Navbar from '../components/Navbar';
import SignInPage from './sign-in/[[...sign-in]]/page';

const Homepage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-blue-200">
      {/* Navbar */}
      <Navbar />
      <SignInPage />

      {/* Hero Section */}
      <section className="w-full bg-gradient-to-br from-blue-600 to-blue-400 py-16 px-4 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex-1 flex flex-col items-start justify-center text-left max-w-xl">
          <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 leading-tight drop-shadow-lg">একাডেমিক থেকে এডমিশন<br />শিখো’র সাথে</h1>
          <p className="text-lg md:text-2xl text-blue-100 mb-8 max-w-2xl">স্কুল, একাডেমিক ও এডমিশন প্রস্তুতির জন্য দেশের সেরা ডিজিটাল লার্নিং প্ল্যাটফর্ম।</p>
          <button className="bg-yellow-400 hover:bg-yellow-300 text-blue-900 font-bold py-3 px-8 rounded-full shadow-lg transition">একাডেমিক প্রোগ্রাম দেখো</button>
        </div>
        <div className="flex-1 flex justify-center">
          <Image src="/hero-illustration.png" alt="Hero Illustration" width={420} height={320} className="rounded-2xl shadow-2xl object-contain bg-white/10" />
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="w-full max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center hover:shadow-2xl transition-shadow">
          <Image src="/live_class.png" alt="Live & Recorded Classes" width={64} height={64} className="mb-4" />
          <h3 className="text-xl font-bold text-blue-700 mb-2 text-center">লাইভ ও রেকর্ডেড ক্লাস</h3>
          <p className="text-gray-600 text-center">সেরা মেন্টরদের লাইভ ও রেকর্ডেড ক্লাসে পড়া হবে আরও সহজ।</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center hover:shadow-2xl transition-shadow">
          <Image src="/animated_video.png" alt="Animated Videos" width={64} height={64} className="mb-4" />
          <h3 className="text-xl font-bold text-blue-700 mb-2 text-center">অ্যানিমেটেড ভিডিও</h3>
          <p className="text-gray-600 text-center">বিষয়ভিত্তিক অ্যানিমেটেড ভিডিওতে কঠিন বিষয়ও হবে সহজ।</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center hover:shadow-2xl transition-shadow">
          <Image src="/mcq_test.png" alt="MCQ Test" width={64} height={64} className="mb-4" />
          <h3 className="text-xl font-bold text-blue-700 mb-2 text-center">MCQ টেস্ট</h3>
          <p className="text-gray-600 text-center">প্র্যাকটিস ও লাইভ MCQ টেস্টে প্রস্তুতি হবে আরও মজবুত।</p>
        </div>
      </section>

      {/* Notice & News Section */}
      <section className="w-full px-4 py-12 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Notice Board */}
        <div className="bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl shadow-xl p-8 flex flex-col items-start hover:shadow-2xl transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white text-2xl shadow"><svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor' className='w-6 h-6'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 16h-1v-4h-1m1-4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z' /></svg></span>
            <h3 className="text-2xl font-bold text-blue-800 tracking-wide">Notice Board</h3>
          </div>
          <ul className="space-y-4 text-blue-900 text-base font-medium">
            <li className="flex items-center gap-2"><span className="w-2 h-2 bg-blue-500 rounded-full inline-block"></span>School Reopens On 1st September 2025</li>
            <li className="flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span>Mid-Term Exams Start From 15th September</li>
            <li className="flex items-center gap-2"><span className="w-2 h-2 bg-yellow-500 rounded-full inline-block"></span>Parent-Teacher Meeting On 25th September</li>
          </ul>
        </div>
        {/* News */}
        <div className="bg-gradient-to-br from-pink-100 to-purple-50 rounded-2xl shadow-xl p-8 flex flex-col items-start hover:shadow-2xl transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-pink-500 text-white text-2xl shadow"><svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor' className='w-6 h-6'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 11H5m14 0a7 7 0 11-14 0 7 7 0 0114 0z' /></svg></span>
            <h3 className="text-2xl font-bold text-pink-700 tracking-wide">Latest News</h3>
          </div>
          <ul className="space-y-4 text-pink-900 text-base font-medium">
            <li className="flex items-center gap-2"><span className="w-2 h-2 bg-blue-400 rounded-full inline-block"></span>Our School Won The Inter-School Science Competition!</li>
            <li className="flex items-center gap-2"><span className="w-2 h-2 bg-pink-400 rounded-full inline-block"></span>New Computer Lab Inaugurated Last Week</li>
            <li className="flex items-center gap-2"><span className="w-2 h-2 bg-purple-400 rounded-full inline-block"></span>Admissions Open For 2025-26 Session</li>
          </ul>
        </div>
      </section>

      {/* Photo Gallery & Events Section */}
      <section className="w-full px-4 py-12 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Photo Gallery */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-200 rounded-2xl shadow-xl p-8 flex flex-col items-start hover:shadow-2xl transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-400 text-white text-2xl shadow"><svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor' className='w-6 h-6'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 10l4.553-2.276A2 2 0 0020 6.382V5a2 2 0 00-2-2H6a2 2 0 00-2 2v1.382a2 2 0 00.447 1.342L9 10m6 0v4m0 0l-3 3m3-3l3 3m-3-3H9m6 0H9' /></svg></span>
            <h3 className="text-2xl font-bold text-blue-700 tracking-wide">Photo Gallery</h3>
          </div>
          <div className="grid grid-cols-3 gap-3 md:gap-5 w-full">
            <Image src="/diagram-export-2-24-2025-7_44_09-AM.png" alt="Gallery 1" width={120} height={120} className="rounded-xl object-cover w-full h-24 md:h-32 shadow" />
            <Image src="/class.png" alt="Gallery 2" width={120} height={120} className="rounded-xl object-cover w-full h-24 md:h-32 shadow" />
            <Image src="/event.png" alt="Gallery 3" width={120} height={120} className="rounded-xl object-cover w-full h-24 md:h-32 shadow" />
            <Image src="/student.png" alt="Gallery 4" width={120} height={120} className="rounded-xl object-cover w-full h-24 md:h-32 shadow" />
            <Image src="/teacher.png" alt="Gallery 5" width={120} height={120} className="rounded-xl object-cover w-full h-24 md:h-32 shadow" />
            <Image src="/parent.png" alt="Gallery 6" width={120} height={120} className="rounded-xl object-cover w-full h-24 md:h-32 shadow" />
          </div>
        </div>
        {/* Events */}
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-200 rounded-2xl shadow-xl p-8 flex flex-col items-start hover:shadow-2xl transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-yellow-400 text-white text-2xl shadow"><svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor' className='w-6 h-6'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' /></svg></span>
            <h3 className="text-2xl font-bold text-yellow-700 tracking-wide">Upcoming Events</h3>
          </div>
          <ul className="space-y-4 text-yellow-900 text-base font-medium">
            <li className="flex items-center gap-2"><span className="w-2 h-2 bg-blue-500 rounded-full inline-block"></span>Annual Sports Day - 10th October</li>
            <li className="flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span>Science Fair - 22nd October</li>
            <li className="flex items-center gap-2"><span className="w-2 h-2 bg-yellow-500 rounded-full inline-block"></span>Art Exhibition - 5th November</li>
          </ul>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-blue-800 text-white py-4 text-center mt-8 shadow-inner">
        <div className="container mx-auto">
          <p className="text-sm">&copy; {new Date().getFullYear()} Bright Future School. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;