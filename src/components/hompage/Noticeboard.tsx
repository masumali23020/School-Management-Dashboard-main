import { Announcement } from "@prisma/client";
import Link from "next/link";

interface NoticeBoardProps {
  announcements: Announcement[];
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("bn-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export default function NoticeBoard({ announcements }: NoticeBoardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-[#1a365d] px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
          <h2 className="text-white font-bold text-base">নোটিশ বোর্ড</h2>
        </div>
        <Link href="/notices" className="text-sky-300 hover:text-white text-xs transition-colors">
          সব নোটিশ →
        </Link>
      </div>

      {/* Notices */}
      <div className="divide-y divide-gray-50">
        {announcements.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <p className="text-3xl mb-2">📋</p>
            <p className="text-sm">কোনো নোটিশ নেই</p>
          </div>
        ) : (
          announcements.map((notice, idx) => (
            <div key={notice.id} className="px-5 py-4 hover:bg-slate-50 transition-colors group cursor-pointer">
              <div className="flex items-start gap-3">
                {/* Index badge */}
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1a365d]/10 text-[#1a365d] text-xs font-bold flex items-center justify-center mt-0.5">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 group-hover:text-[#1a365d] line-clamp-2 transition-colors">
                    {notice.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notice.description}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {formatDate(notice.date)}
                    </span>
                    {!notice.classId && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-medium">
                        সার্বজনীন
                      </span>
                    )}
                    {notice.classId && (
                      <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-medium">
                        শ্রেণি-নির্দিষ্ট
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {announcements.length > 0 && (
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
          <Link
            href="/notices"
            className="w-full text-center block text-sm text-[#1a365d] font-medium hover:underline"
          >
            সকল নোটিশ দেখুন
          </Link>
        </div>
      )}
    </div>
  );
}