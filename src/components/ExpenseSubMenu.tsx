// components/expensesubMenu.tsx
"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, Layers, LayoutGrid } from "lucide-react";

type Props = {
  schoolId?: number;
  role?: string;
};

export default function ExpenseSubMenu({ schoolId, role }: Props) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Parent active if current path starts with either sub-route
  const isParentActive = 
    pathname.startsWith("/list/expense-categories") || 
    pathname.startsWith("/list/expenses");

  const isCategoriesActive = pathname.startsWith("/list/expense-categories");
  const isexpensesActive = pathname.startsWith("/list/expenses");

  const handleNavClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      if (pathname === href) {
        e.preventDefault(); 
      }
    },
    [pathname]
  );

  // Permissions logic (Updated to match your likely needs for expenses)
  const canManageexpenses = role === "ADMIN" || role === "STAFF";

  if (!canManageexpenses) {
    return null;
  }

  return (
    <div className="flex flex-col">
      {/* Parent "Collection Management" Row */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center justify-center lg:justify-start gap-4 text-gray-500 py-2 md:px-2 rounded-md transition-colors w-full
          ${isParentActive ? "bg-lamaSky text-blue-700 font-semibold" : "hover:bg-lamaSkyLight"}`}
      >
        <Image src="/result.png" alt="" width={20} height={20} />
        <span className="hidden lg:flex items-center justify-between flex-1">
          <span>Expences</span>
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
          
          {/* Collection Categories */}
          <Link
            href="/list/expense-categories"
            onClick={(e) => handleNavClick(e, "/list/expense-categories")}
            className={`flex items-center justify-center lg:justify-start gap-2 py-1.5 md:px-2 rounded-md text-sm transition-colors
              ${isCategoriesActive
                ? "bg-lamaYellow text-yellow-800 font-semibold"
                : "text-gray-500 hover:bg-lamaSkyLight"}`}
          >
            <LayoutGrid className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="hidden lg:block">Categories</span>
          </Link>

          {/* expenses */}
          <Link
            href="/list/expenses"
            onClick={(e) => handleNavClick(e, "/list/expenses")}
            className={`flex items-center justify-center lg:justify-start gap-2 py-1.5 md:px-2 rounded-md text-sm transition-colors
              ${isexpensesActive
                ? "bg-lamaYellow text-yellow-800 font-semibold"
                : "text-gray-500 hover:bg-lamaSkyLight"}`}
          >
            <Layers className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="hidden lg:block">expenses</span>
          </Link>

          {/* Debug Info */}
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