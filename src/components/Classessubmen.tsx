"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";

type ClassItem = {
  id: number;
  name: string;
  gradeLevel: number;
};

type Props = {
  classes: ClassItem[];
};

export default function ClassesSubMenu({ classes }: Props) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isParentActive =
    pathname === "/list/classes" || pathname.startsWith("/list/classes/");

  return (
    <div className="flex flex-col">
      {/* ── Parent "Classes" row ── */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center justify-center lg:justify-start gap-4 text-gray-500 py-2 md:px-2 rounded-md transition-colors
          ${
            isParentActive
              ? "bg-lamaSky text-blue-700 font-semibold"
              : "hover:bg-lamaSkyLight"
          }`}
      >
        <Image src="/class.png" alt="" width={20} height={20} />

        {/* Label + chevron — only visible on large screens */}
        <span className="hidden lg:flex items-center justify-between flex-1">
          <span>Classes</span>
          {isOpen ? (
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
          )}
        </span>
      </button>

      {/* ── Subcategory list ── */}
      {isOpen && (
        <div className="flex flex-col mt-0.5 ml-0 lg:ml-6 gap-0.5">
          {/* "All Classes" link */}
          <ClassLink
            href="/list/classes"
            label="All Classes"
            isActive={pathname === "/list/classes"}
          />

          {/* One link per class from DB */}
          {classes.map((cls) => (
            <ClassLink
              key={cls.id}
              href={`/list/classes/${cls.id}`}
              label={cls.name}
              isActive={pathname === `/list/classes/${cls.id}`}
              badge={`G${cls.gradeLevel}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Small helper ────────────────────────────────────────────────────────────

function ClassLink({
  href,
  label,
  isActive,
  badge,
}: {
  href: string;
  label: string;
  isActive: boolean;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-center lg:justify-start gap-2 py-1.5 md:px-2 rounded-md text-sm transition-colors
        ${
          isActive
            ? "bg-lamaYellow text-yellow-800 font-semibold"
            : "text-gray-500 hover:bg-lamaSkyLight"
        }`}
    >
      {/* Dot indicator — visible on all sizes */}
      <span
        className={`hidden lg:block h-1.5 w-1.5 rounded-full flex-shrink-0 ${
          isActive ? "bg-yellow-600" : "bg-gray-300"
        }`}
      />
      <span className="hidden lg:block flex-1 truncate">{label}</span>
      {badge && (
        <span
          className={`hidden lg:inline-block text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${
            isActive
              ? "bg-yellow-200 text-yellow-700"
              : "bg-gray-100 text-gray-400"
          }`}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}