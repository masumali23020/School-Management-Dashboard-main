"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, FileText, ClipboardList } from "lucide-react";

export default function ResultsSubMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const isParentActive =
    pathname === "/list/results" || pathname.startsWith("/list/results/");

  const isExamActive = pathname.startsWith("/list/results/exams");
  const isAssignmentActive = pathname.startsWith("/list/results/assignments");

  // Only navigate if NOT already on that page — prevents remount/state reset
  const handleNavClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      if (pathname === href || pathname.startsWith(href)) {
        e.preventDefault(); // already here — do nothing
      }
    },
    [pathname]
  );

  return (
    <div className="flex flex-col">
      {/* Parent "Results" row */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center justify-center lg:justify-start gap-4 text-gray-500 py-2 md:px-2 rounded-md transition-colors
          ${isParentActive ? "bg-lamaSky text-blue-700 font-semibold" : "hover:bg-lamaSkyLight"}`}
      >
        <Image src="/result.png" alt="" width={20} height={20} />
        <span className="hidden lg:flex items-center justify-between flex-1">
          <span>Results</span>
          {isOpen ? (
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
          )}
        </span>
      </button>

      {/* Two static category links */}
      {isOpen && (
        <div className="flex flex-col mt-0.5 ml-0 lg:ml-6 gap-0.5">

          <Link
            href="/list/results/exams"
            onClick={(e) => handleNavClick(e, "/list/results/exams")}
            className={`flex items-center justify-center lg:justify-start gap-2 py-1.5 md:px-2 rounded-md text-sm transition-colors
              ${isExamActive
                ? "bg-lamaYellow text-yellow-800 font-semibold"
                : "text-gray-500 hover:bg-lamaSkyLight"}`}
          >
            <FileText className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="hidden lg:block">Exams</span>
          </Link>

          <Link
            href="/list/results/assignments"
            onClick={(e) => handleNavClick(e, "/list/results/assignments")}
            className={`flex items-center justify-center lg:justify-start gap-2 py-1.5 md:px-2 rounded-md text-sm transition-colors
              ${isAssignmentActive
                ? "bg-lamaYellow text-yellow-800 font-semibold"
                : "text-gray-500 hover:bg-lamaSkyLight"}`}
          >
            <ClipboardList className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="hidden lg:block">Assignments</span>
          </Link>

        </div>
      )}
    </div>
  );
}