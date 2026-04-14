const ACCOUNT_MESSAGES: Record<string, string> = {
  SCHOOL_DISABLED: "Your account has been suspended. Please contact your school authority.",
  SUBSCRIPTION_EXPIRED: "Your school's subscription has expired. Please renew to continue.",
  PLAN_LIMIT_REACHED: "Your school's current plan limit is reached. Please upgrade your plan.",
  SCHOOL_NOT_FOUND: "School account not found. Please contact support.",
};

export default function MainLandingPage({
  searchParams,
}: {
  searchParams?: { account?: string };
}) {
  const accountReason = searchParams?.account;
  const notice = accountReason ? ACCOUNT_MESSAGES[accountReason] : null;

  return (
    <div className="text-center py-20">
      {notice && (
        <div className="mx-auto mb-6 max-w-2xl rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {notice}
        </div>
      )}
      <h1>স্বাগতম আমাদের স্কুল ম্যানেজমেন্ট প্ল্যাটফর্মে</h1>
      <p>আপনার স্কুলের নাম দিয়ে সার্চ করুন অথবা নতুন স্কুল রেজিস্টার করুন।</p>
      <div className="mt-10">
        <a href="/login" className="bg-blue-600 text-white px-6 py-2 rounded">লগইন করুন</a>
      </div>
    </div>
  );
}