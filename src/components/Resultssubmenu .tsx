// components/Resultssubmenu.tsx
"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, FileText, ClipboardList, Send } from "lucide-react";

type Props = {
  schoolId?: number;
  role?: string;
};

export default function ResultsSubMenu({ schoolId, role }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const isParentActive =
    pathname === "/list/results" || pathname.startsWith("/list/results/");

  const isExamActive = pathname.startsWith("/list/results/exams");
  const isAssignmentActive = pathname.startsWith("/list/results/assignments");
  const isPublishActive = pathname.startsWith("/list/results/publish");

  // Only navigate if NOT already on that page — prevents remount/state reset
  const handleNavClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      if (pathname === href || pathname.startsWith(href)) {
        e.preventDefault(); // already here — do nothing
      }
    },
    [pathname]
  );

  // Role-based visibility
  const canManageResults = role === "ADMIN" || role === "TEACHER";
  const canViewResults = role === "STUDENT" || role === "PARENT";

  // If no permission, don't render
  if (!canManageResults && !canViewResults) {
    return null;
  }

  return (
    <div className="flex flex-col">
      {/* Parent "Results" row */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center justify-center lg:justify-start gap-4 text-gray-500 py-2 md:px-2 rounded-md transition-colors w-full
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

      {/* Submenu items */}
      {isOpen && (
        <div className="flex flex-col mt-0.5 ml-0 lg:ml-6 gap-0.5">
          
          {/* Exams - visible to all */}
          <Link
            href={canManageResults ? "/list/results/exams" : "/result/my-results"}
            onClick={(e) => handleNavClick(e, "/list/results/exams")}
            className={`flex items-center justify-center lg:justify-start gap-2 py-1.5 md:px-2 rounded-md text-sm transition-colors
              ${isExamActive
                ? "bg-lamaYellow text-yellow-800 font-semibold"
                : "text-gray-500 hover:bg-lamaSkyLight"}`}
          >
            <FileText className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="hidden lg:block">
              {canManageResults ? "Exam Results" : "My Exam Results"}
            </span>
          </Link>

          {/* Assignments - visible to all */}
          <Link
            href={canManageResults ? "/list/results/assignments" : "/result/my-assignments"}
            onClick={(e) => handleNavClick(e, "/list/results/assignments")}
            className={`flex items-center justify-center lg:justify-start gap-2 py-1.5 md:px-2 rounded-md text-sm transition-colors
              ${isAssignmentActive
                ? "bg-lamaYellow text-yellow-800 font-semibold"
                : "text-gray-500 hover:bg-lamaSkyLight"}`}
          >
            <ClipboardList className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="hidden lg:block">
              {canManageResults ? "Assignment Results" : "My Assignment Results"}
            </span>
          </Link>

          {/* Publish Results - only for ADMIN and TEACHER */}
          {canManageResults && (
            <Link
              href="/list/results/publish"
              onClick={(e) => handleNavClick(e, "/list/results/publish")}
              className={`flex items-center justify-center lg:justify-start gap-2 py-1.5 md:px-2 rounded-md text-sm transition-colors
                ${isPublishActive
                  ? "bg-lamaYellow text-yellow-800 font-semibold"
                  : "text-gray-500 hover:bg-lamaSkyLight"}`}
            >
              <Send className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="hidden lg:block">Publish Results</span>
            </Link>
          )}

          {/* School info (optional - for debugging) */}
          {process.env.NODE_ENV === "development" && schoolId && (
            <div className="text-xs text-gray-400 px-2 pt-2 border-t border-gray-100 mt-1">
              School ID: {schoolId}
            </div>
          )}
        </div>
      )}
    </div>
  );
}