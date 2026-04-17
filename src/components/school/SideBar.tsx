// // components/sidebar.tsx
// // Role-aware, plan-aware sidebar — reads session server-side.
// // Locked features show an upgrade prompt instead of a link.

// import Link from "next/link";
// import { auth } from "@/auth";
// import { canAccessFeature, type Feature } from "@/lib/subscription-guard";
// import type { SessionUser, UserRole, PlanType } from "@/types/auth";

// // ─── Nav item definitions ──────────────────────────────────────────────────────

// type NavItem = {
//   label:       string;
//   href:        string;
//   icon:        string;                     // emoji / icon placeholder
//   roles:       UserRole[];                 // which roles can SEE this item
//   feature?:    Feature;                    // if set, locked for insufficient plans
// };

// const NAV_ITEMS: NavItem[] = [
//   // Universal
//   { label: "Dashboard",       href: "/dashboard",           icon: "⊞",  roles: ["ADMIN","TEACHER","CASHIER","STAFF","STUDENT"] },

//   // Academic
//   { label: "Classes",         href: "/admin/classes",       icon: "🏛",  roles: ["ADMIN","TEACHER"] },
//   { label: "Students",        href: "/admin/students",      icon: "👨‍🎓", roles: ["ADMIN","TEACHER","CASHIER"] },
//   { label: "Subjects",        href: "/admin/subjects",      icon: "📚",  roles: ["ADMIN","TEACHER"] },
//   { label: "Attendance",      href: "/teacher/attendance",  icon: "✅",  roles: ["TEACHER","ADMIN"] },
//   { label: "Exams & Results", href: "/teacher/exams",       icon: "📝",  roles: ["TEACHER","ADMIN"] },

//   // Finance
//   { label: "Fee Collection",  href: "/cashier/fees",        icon: "💳",  roles: ["CASHIER","ADMIN"] },
//   { label: "Salary",          href: "/admin/salary",        icon: "💰",  roles: ["ADMIN"] },

//   // Analytics (STANDARD+)
//   { label: "Reports",         href: "/admin/reports",       icon: "📊",  roles: ["ADMIN"], feature: "advanced_reports" },

//   // Communication
//   { label: "Events",          href: "/admin/events",        icon: "📅",  roles: ["ADMIN","TEACHER"] },
//   { label: "Announcements",   href: "/admin/announcements", icon: "📢",  roles: ["ADMIN","TEACHER"] },

//   // SMS (POPULAR only)
//   { label: "SMS Panel",       href: "/admin/sms",           icon: "💬",  roles: ["ADMIN","CASHIER"], feature: "sms_panel" },

//   // Admin-only management
//   { label: "User Management", href: "/admin/users",         icon: "👥",  roles: ["ADMIN"] },
//   { label: "Settings",        href: "/admin/settings",      icon: "⚙️",  roles: ["ADMIN"] },

//   // Student portal
//   { label: "My Results",      href: "/student/results",     icon: "🏆",  roles: ["STUDENT"] },
//   { label: "My Timetable",    href: "/student/timetable",   icon: "🗓",  roles: ["STUDENT"] },
// ];

// const PLAN_BADGE_STYLE: Record<PlanType, string> = {
//   FREE:     "bg-gray-700 text-gray-300",
//   STANDARD: "bg-blue-900 text-blue-300",
//   POPULAR:  "bg-amber-900 text-amber-300",
// };

// // ─── Server Component ─────────────────────────────────────────────────────────

// export default async function Sidebar() {
//   const session = await auth();
//   const user = session?.user as SessionUser | undefined;

//   if (!user) return null;

//   const { role, planType, name } = user;

//   // Filter items by role
//   const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

//   return (
//     <aside className="flex flex-col h-screen w-60 bg-[#0f1117] border-r border-[#1f2130] shrink-0">

//       {/* Brand */}
//       <div className="px-5 py-5 border-b border-[#1f2130]">
//         <p className="text-xs font-mono text-[#4b5563] tracking-widest uppercase mb-1">SchoolSaaS</p>
//         <h2 className="text-white font-semibold text-sm truncate">{name}</h2>
//         <div className="flex items-center gap-2 mt-2">
//           <RoleBadge role={role} />
//           <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${PLAN_BADGE_STYLE[planType]}`}>
//             {planType}
//           </span>
//         </div>
//       </div>

//       {/* Nav */}
//       <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
//         {visibleItems.map((item) => {
//           const isLocked = item.feature
//             ? !canAccessFeature(planType, item.feature)
//             : false;

//           return isLocked ? (
//             <LockedNavItem key={item.href} item={item} />
//           ) : (
//             <ActiveNavItem key={item.href} item={item} />
//           );
//         })}
//       </nav>

//       {/* Footer */}
//       <div className="px-4 py-4 border-t border-[#1f2130]">
//         <form action="/api/auth/signout" method="POST">
//           <button
//             type="submit"
//             className="w-full text-left text-xs font-mono text-[#6b7280] hover:text-red-400 transition-colors px-2 py-1.5"
//           >
//             ⏻ Sign Out
//           </button>
//         </form>
//       </div>
//     </aside>
//   );
// }

// // ─── Sub-components ───────────────────────────────────────────────────────────

// function ActiveNavItem({ item }: { item: NavItem }) {
//   return (
//     <Link
//       href={item.href}
//       className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#9ca3af] hover:text-white hover:bg-[#1a1d28] transition-all group"
//     >
//       <span className="text-base leading-none">{item.icon}</span>
//       <span className="truncate font-mono text-xs tracking-wide">{item.label}</span>
//     </Link>
//   );
// }

// function LockedNavItem({ item }: { item: NavItem }) {
//   return (
//     <div className="flex items-center gap-3 px-3 py-2 rounded-lg opacity-40 cursor-not-allowed select-none group relative">
//       <span className="text-base leading-none grayscale">{item.icon}</span>
//       <span className="truncate font-mono text-xs tracking-wide text-[#6b7280]">
//         {item.label}
//       </span>
//       {/* Lock icon */}
//       <span className="ml-auto text-[10px] text-[#6b7280]">🔒</span>

//       {/* Upgrade tooltip */}
//       <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50
//                       hidden group-hover:flex items-center gap-2
//                       bg-[#1a1d28] border border-[#2a2d3a] rounded-lg
//                       px-3 py-2 text-xs text-white shadow-xl whitespace-nowrap pointer-events-none">
//         <span>✨</span>
//         <span className="font-mono">Upgrade to unlock</span>
//         <Link
//           href="/admin/billing"
//           className="pointer-events-auto ml-1 bg-amber-500 hover:bg-amber-400 text-black font-bold px-2 py-0.5 rounded text-[10px] transition-colors"
//           onClick={(e) => e.stopPropagation()}
//         >
//           Upgrade
//         </Link>
//       </div>
//     </div>
//   );
// }

// function RoleBadge({ role }: { role: UserRole }) {
//   const styles: Record<UserRole, string> = {
//     ADMIN:   "bg-purple-900 text-purple-300",
//     TEACHER: "bg-green-900 text-green-300",
//     CASHIER: "bg-cyan-900 text-cyan-300",
//     STAFF:   "bg-gray-700 text-gray-300",
//     STUDENT: "bg-orange-900 text-orange-300",
//   };
//   return (
//     <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${styles[role]}`}>
//       {role}
//     </span>
//   );
// }