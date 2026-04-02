import { SchoolSetting } from "@prisma/client";
import Link from "next/link";
import Image from "next/image";

interface FooterProps {
  settings: SchoolSetting | null;
}

export default function Footer({ settings }: FooterProps) {
  return (
    <footer className="bg-[#1a365d] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* School info */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              {settings?.logoUrl ? (
                <Image src={settings.logoUrl} alt="Logo" width={44} height={44} className="rounded-full" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-lg">
                  {settings?.shortName?.[0] ?? "S"}
                </div>
              )}
              <div>
                <p className="font-bold text-lg leading-tight">{settings?.schoolName ?? "স্কুলের নাম"}</p>
                {settings?.shortName && <p className="text-sky-300 text-sm">{settings.shortName}</p>}
              </div>
            </div>
            <p className="text-white/70 text-sm leading-relaxed max-w-sm">
              জ্ঞান, মূল্যবোধ ও দক্ষতার সমন্বয়ে আলোকিত মানুষ গড়ার লক্ষ্যে আমরা প্রতিশ্রুতিবদ্ধ।
            </p>
            <div className="mt-4 space-y-1.5 text-sm text-white/70">
              {settings?.address && (
                <p className="flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 text-sky-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {settings.address}
                </p>
              )}
              {settings?.phone && (
                <p className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-sky-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  {settings.phone}
                </p>
              )}
              {settings?.email && (
                <p className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-sky-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  {settings.email}
                </p>
              )}
              {settings?.eiinNumber && (
                <p className="text-white/50 text-xs">EIIN: {settings.eiinNumber}</p>
              )}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="font-semibold mb-4 text-sky-300 text-sm uppercase tracking-wider">দ্রুত লিংক</h3>
            <ul className="space-y-2 text-sm text-white/70">
              {[
                { label: "হোম", href: "/" },
                { label: "আমাদের সম্পর্কে", href: "/about" },
                { label: "একাডেমিক", href: "/academic" },
                { label: "ভর্তি তথ্য", href: "/admission" },
                { label: "ইভেন্ট", href: "/events" },
                { label: "নোটিশ বোর্ড", href: "/notices" },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-white transition-colors flex items-center gap-1.5">
                    <span className="text-sky-400">›</span>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Portal links */}
          <div>
            <h3 className="font-semibold mb-4 text-sky-300 text-sm uppercase tracking-wider">পোর্টাল</h3>
            <ul className="space-y-2 text-sm text-white/70">
              {[
                { label: "শিক্ষার্থী পোর্টাল", href: "/login" },
                { label: "অভিভাবক পোর্টাল", href: "/login" },
                { label: "শিক্ষক পোর্টাল", href: "/login" },
                { label: "অ্যাডমিন প্যানেল", href: "/login" },
              ].map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="hover:text-white transition-colors flex items-center gap-1.5">
                    <span className="text-sky-400">›</span>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            {settings?.website && (
              <a
                href={settings.website}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-sm text-sky-300 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                ওয়েবসাইট ভিজিট করুন
              </a>
            )}
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-white/50 text-xs">
          <p>© {new Date().getFullYear()} {settings?.schoolName ?? "স্কুলের নাম"}। সর্বস্বত্ব সংরক্ষিত।</p>
          {settings?.facebookPage && (
            <a href={settings.facebookPage} target="_blank" rel="noopener noreferrer" className="hover:text-sky-300 transition-colors">
              Facebook পেজ
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}