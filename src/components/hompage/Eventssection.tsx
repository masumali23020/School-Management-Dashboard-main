import { Event } from "@prisma/client";
import Link from "next/link";

interface EventsSectionProps {
  events: Event[];
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("bn-BD", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("bn-BD", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

const eventColors = [
  "bg-blue-600",
  "bg-emerald-600",
  "bg-purple-600",
  "bg-rose-600",
  "bg-amber-600",
  "bg-sky-600",
];

export default function EventsSection({ events }: EventsSectionProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#1a365d]">আসন্ন ইভেন্ট</h2>
          <p className="text-gray-500 text-sm mt-1">বিদ্যালয়ের সকল কার্যক্রম ও অনুষ্ঠানসমূহ</p>
        </div>
        <Link
          href="/events"
          className="text-sm font-medium text-sky-600 hover:text-sky-700 flex items-center gap-1"
        >
          সব দেখুন
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center text-gray-400">
          <p className="text-4xl mb-2">📅</p>
          <p className="text-sm">কোনো আসন্ন ইভেন্ট নেই</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {events.map((event, idx) => (
            <div
              key={event.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group"
            >
              {/* Color bar */}
              <div className={`h-1.5 ${eventColors[idx % eventColors.length]}`} />
              <div className="p-5">
                <div className="flex items-start gap-4">
                  {/* Date badge */}
                  <div className={`flex-shrink-0 rounded-xl ${eventColors[idx % eventColors.length]} text-white text-center p-2 w-14`}>
                    <p className="text-xs font-semibold opacity-80 uppercase tracking-wide">
                      {new Intl.DateTimeFormat("en", { month: "short" }).format(new Date(event.startTime))}
                    </p>
                    <p className="text-2xl font-extrabold leading-tight">
                      {new Date(event.startTime).getDate()}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[#1a365d] text-base group-hover:text-sky-600 transition-colors line-clamp-2">
                      {event.title}
                    </h3>
                    <p className="text-gray-500 text-xs mt-1 line-clamp-2">{event.description}</p>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDate(event.startTime)}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formatTime(event.startTime)}
                      </span>
                      {!event.classId && (
                        <span className="bg-sky-50 text-sky-600 px-2 py-0.5 rounded-full font-medium">
                          সার্বজনীন
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}