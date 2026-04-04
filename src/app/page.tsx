export default function MainLandingPage() {
  return (
    <div className="text-center py-20">
      <h1>স্বাগতম আমাদের স্কুল ম্যানেজমেন্ট প্ল্যাটফর্মে</h1>
      <p>আপনার স্কুলের নাম দিয়ে সার্চ করুন অথবা নতুন স্কুল রেজিস্টার করুন।</p>
      <div className="mt-10">
        <a href="/login" className="bg-blue-600 text-white px-6 py-2 rounded">লগইন করুন</a>
      </div>
    </div>
  );
}