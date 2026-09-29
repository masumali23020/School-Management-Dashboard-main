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

export default function FeetypeSubMenu({ schoolId, role }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const isParentActive =
    pathname === "/list/salary" || pathname.startsWith("/list/fees");

  const isExamActive = pathname.startsWith("/list/salary/fees");
  const isAssignmentActive = pathname.startsWith("/list/salary");
//   const isPublishActive = pathname.startsWith("/list/salary/publish");

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
  const canManageFee = role === "ADMIN" || role === "CASHIER";
  const canViewSalary = role === "ADMIN" || role === "CASHIER";

  // If no permission, don't render
  if (!canManageFee && !canViewSalary) {
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
          <span>Fee Mangements</span>
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
          
          {/* Fee - visible to all */}
          <Link
            href={canManageFee ? "/list/fees" : "/result/my-results"}
            onClick={(e) => handleNavClick(e, "/list/fees")}
            className={`flex items-center justify-center lg:justify-start gap-2 py-1.5 md:px-2 rounded-md text-sm transition-colors
              ${isExamActive
                ? "bg-lamaYellow text-yellow-800 font-semibold"
                : "text-gray-500 hover:bg-lamaSkyLight"}`}
          >
            <FileText className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="hidden lg:block">
              {canManageFee ? "Student Fees" : "My Student Fees"}
            </span>
          </Link>

          {/* Salary - visible to all */}
          <Link
            href={canManageFee ? "/list/salary" : "/salary/my-assignments"}
            onClick={(e) => handleNavClick(e, "/list/salary")}
            className={`flex items-center justify-center lg:justify-start gap-2 py-1.5 md:px-2 rounded-md text-sm transition-colors
              ${isAssignmentActive
                ? "bg-lamaYellow text-yellow-800 font-semibold"
                : "text-gray-500 hover:bg-lamaSkyLight"}`}
          >
            <ClipboardList className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="hidden lg:block">
              {canManageFee ? "EmployeeSalary" : "My Salary"}
            </span>
          </Link>

          

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