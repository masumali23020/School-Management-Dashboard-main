"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";

type Props = {
  // You can add any props if needed, like user data for account info
  user?: any;
};

export default function ProfileSubMenu({ user }: Props) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isParentActive =
    pathname === "/profile" || 
    pathname.startsWith("/profile/") ||
    pathname === "/transactions" ||
    pathname.startsWith("/transactions/") ||
    pathname === "/change-password" ||
    pathname === "/account" ||
    pathname.startsWith("/account/");

  return (
    <div className="flex flex-col">
      {/* ── Parent "Profile" row ── */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center justify-center lg:justify-start gap-4 text-gray-500 py-2 md:px-2 rounded-md transition-colors w-full
          ${
            isParentActive
              ? "bg-lamaSky text-blue-700 font-semibold"
              : "hover:bg-lamaSkyLight"
          }`}
      >
        <Image src="/profile.png" alt="" width={20} height={20} />

        {/* Label + chevron — only visible on large screens */}
        <span className="hidden lg:flex items-center justify-between flex-1">
          <span>Profile</span>
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
          {/* Profile Overview */}
          <ProfileLink
            href="/profile"
            label="Profile Overview"
            isActive={pathname === "/profile"}
            icon="/profile.png"
          />

          {/* Account Settings */}
          <ProfileLink
            href="/account"
            label="Account Settings"
            isActive={pathname === "/account" || pathname.startsWith("/account/")}
            icon="/setting.png"
          />

          {/* Transactions */}
          <ProfileLink
            href="/transactions"
            label="Transactions"
            isActive={pathname === "/transactions" || pathname.startsWith("/transactions/")}
            icon="/cashier.png"
          />

          {/* Change Password */}
          <ProfileLink
            href="/change-password"
            label="Change Password"
            isActive={pathname === "/change-password"}
            icon="/lock.png" // You'll need to add this icon or use a different one
          />
        </div>
      )}
    </div>
  );
}

// ── Profile Link Helper ─────────────────────────────────────────────────────

function ProfileLink({
  href,
  label,
  isActive,
  icon,
}: {
  href: string;
  label: string;
  isActive: boolean;
  icon: string;
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
      {/* Icon for submenu items */}
      <Image 
        src={icon} 
        alt="" 
        width={16} 
        height={16} 
        className="hidden lg:block opacity-60"
      />
      
      {/* Label */}
      <span className="hidden lg:block flex-1 truncate">{label}</span>
      
      {/* Active indicator */}
      {isActive && (
        <span className="hidden lg:block h-1.5 w-1.5 rounded-full bg-yellow-600 mr-2" />
      )}
    </Link>
  );
}