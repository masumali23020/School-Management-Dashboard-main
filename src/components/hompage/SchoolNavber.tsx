"use client";

import { SchoolSetting } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";


interface NavbarProps {
  settings: SchoolSetting | null;
}

const navLinks = [
  { label: "হোম", href: "/bagulat-high-scholl/" },
  { label: "আমাদের সম্পর্কে", href: "/bagulat-high-scholl/about" },
  { label: "একাডেমিক", href: "/bagulat-high-scholl/academic" },
  { label: "ভর্তি", href: "/bagulat-high-scholl/admission" },
  { label: "ইভেন্ট", href: "/bagulat-high-scholl/events" },
  { label: "যোগাযোগ", href: "/bagulat-high-scholl/contact" },
  { label: "নোটিশ", href: "/bagulat-high-scholl/notice" },
];

export default function SchoolNavbar({ settings }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      {/* Top bar */}
      <div className="bg-[#1a365d] text-white text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            {settings?.phone && (
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                {settings.phone}
              </span>
            )}
            {settings?.email && (
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                {settings.email}
              </span>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-3">
            {settings?.facebookPage && (
              <a href={settings.facebookPage} target="_blank" rel="noopener noreferrer" className="hover:text-sky-300 transition-colors">
                Facebook
              </a>
            )}
            <span className="text-white/40">|</span>
            <span>সেশন: {settings?.academicSession ?? "2024"}</span>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        {/* Logo + Name */}
        <Link href="/" className="flex items-center gap-3">
          {settings?.logoUrl ? (
            <Image src={settings.logoUrl} alt="School Logo" width={44} height={44} className="rounded-full object-cover" />
          ) : (
            <div className="w-11 h-11 rounded-full bg-[#1a365d] flex items-center justify-center text-white font-bold text-lg">
              {settings?.shortName?.[0] ?? "S"}
            </div>
          )}
          <div className="hidden sm:block">
            <p className="text-[#1a365d] font-bold text-base leading-tight">
              {settings?.schoolName ?? "School Name"}
            </p>
            {settings?.shortName && (
              <p className="text-gray-500 text-xs">{settings.shortName}</p>
            )}
          </div>
        </Link>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-sm text-gray-700 hover:text-[#1a365d] hover:bg-blue-50 px-3 py-2 rounded-md transition-colors font-medium"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-[#1a365d] border border-[#1a365d] px-4 py-1.5 rounded-md hover:bg-[#1a365d] hover:text-white transition-colors font-medium"
          >
            লগইন
          </Link>
        </div>

        {/* Mobile burger */}
        <button
          className="md:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="মেনু"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 pb-4">
          <ul className="flex flex-col gap-1 pt-2">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block text-sm text-gray-700 hover:text-[#1a365d] px-3 py-2 rounded-md hover:bg-blue-50"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/login" className="block text-sm text-[#1a365d] font-medium px-3 py-2">
                লগইন
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}