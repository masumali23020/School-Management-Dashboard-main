// app/(admin)/admin/dashboard/page.tsx
// School Admin Dashboard — shows school stats, recent activity

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/get-session";
import  prisma  from "@/lib/db";
import Link from "next/link";
import { signOut } from "@/auth";
import Menu from "@/components/Menu";
import Image from "next/image";

export default async function AdminDashboard() {
  // ── Auth guard: only ADMIN ──────────────────────────────────────────────────
  const user = await requireSession(["ADMIN"]);
  const { schoolId, name, planType } = user;

  // ── Fetch all stats in parallel ─────────────────────────────────────────────
  const [
    school,
    totalStudents,
    totalEmployees,
    totalClasses,
    totalSubjects,
    recentStudents,
    recentPayments,
    pendingFees,
  ] = await Promise.all([
    // School info
    prisma.school.findUnique({
      where:   { id: schoolId },
      include: { plan: true },
    }),
    // Counts
    prisma.student.count({ where: { schoolId } }),
    prisma.employee.count({ where: { schoolId } }),
    prisma.class.count({ where: { schoolId } }),
    prisma.subject.count({ where: { schoolId } }),
    // Recent 5 students
    prisma.student.findMany({
      where:   { schoolId },
      take:    5,
      orderBy: { createdAt: "desc" },
      include: { class: true, grade: true },
    }),
    // Recent 5 fee payments
    prisma.feePayment.findMany({
      // where:   { schoolId },
      take:    5,
      orderBy: { paidAt: "desc" },
      include: {
        student:          { select: { name: true, surname: true } },
        classFeeStructure: { include: { feeType: true } },
      },
    }),
    // Count students who have no fee payment this month
    prisma.student.count({ where: { schoolId } }),
  ]);

  const currentMonth = new Date().toLocaleString("en-BD", { month: "long", year: "numeric" });

  console.log("Dashboard data:",school )

  return (
    <div className="dash mx-auto">

      {/* ── Topbar ── */}
      <header className="topbar">
        <div className="topbar-left">
          <div className="school-logo">
            {school?.schoolName?.[0] ?? "S"}
          </div>
          <div>
            <p className="school-name">{school?.schoolName}</p>
            <p className="school-meta">
              ID: {schoolId} &nbsp;·&nbsp; Session: {school?.academicSession}
            </p>
          </div>
        </div>
        <div className="topbar-right">
          <PlanBadge plan={planType} />
          <span className="user-name">👤 {name}</span>
          <form action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}>
            <button className="logout-btn" type="submit">Sign Out</button>
          </form>
        </div>
      </header>
  
      <div className="flex">

       <div className="w-[14%] md:w-[8%] lg:w-[16%] xl:w-[14%] p-4">
        <Link
          href="/"
          className="flex items-center justify-center lg:justify-start gap-2"
        >
          <Image src="/logo.png" alt="logo" width={32} height={32} />
          <span className="hidden lg:block font-bold">{school?.shortName || school?.schoolName}</span>
        </Link>
        <Menu user={user} />
      </div>

      <main className="w-[86%] md:w-[92%] lg:w-[84%] xl:w-[86%]  overflow-scroll flex flex-col"> 

        {/* ── Welcome ── */}
        <div className="welcome">
          <div>
            <h1>Welcome back, {name.split(" ")[0]} 👋</h1>
            <p>{currentMonth} &nbsp;·&nbsp; Admin Dashboard</p>
          </div>
          <Link href="/admin/students/new" className="new-btn">
            + Add Student
          </Link>
        </div>

        {/* ── Stats Grid ── */}
        <div className="stats-grid">
          <StatCard
            label="Total Students" value={totalStudents}
            icon="🎓" color="#3b82f6"
            href="/admin/students"
          />
          <StatCard
            label="Employees" value={totalEmployees}
            icon="👨‍🏫" color="#8b5cf6"
            href="/admin/users"
          />
          <StatCard
            label="Classes" value={totalClasses}
            icon="🏛" color="#06b6d4"
            href="/admin/classes"
          />
          <StatCard
            label="Subjects" value={totalSubjects}
            icon="📚" color="#f59e0b"
            href="/admin/subjects"
          />
        </div>

        {/* ── Two column layout ── */}
        <div className="two-col">

          {/* Recent Students */}
          <section className="panel">
            <div className="panel-header">
              <h2>Recent Students</h2>
              <Link href="/admin/students" className="panel-link">View all →</Link>
            </div>
            <div className="student-list">
              {recentStudents.length === 0 && (
                <p className="empty">No students yet.</p>
              )}
              {recentStudents.map((s) => (
                <div key={s.id} className="student-row">
                  <div className="student-avatar">
                    {s.name[0]}{s.surname[0]}
                  </div>
                  <div className="student-info">
                    <p className="student-name">{s.name} {s.surname}</p>
                    <p className="student-meta">{s.class.name} &nbsp;·&nbsp; Grade {s.grade.level}</p>
                  </div>
                  <span className={`sex-badge ${s.sex === "MALE" ? "male" : "female"}`}>
                    {s.sex === "MALE" ? "♂" : "♀"}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Recent Fee Payments */}
          <section className="panel">
            <div className="panel-header">
              <h2>Recent Payments</h2>
              <Link href="/cashier/fees" className="panel-link">View all →</Link>
            </div>
            <div className="fee-list">
              {recentPayments.length === 0 && (
                <p className="empty">No payments yet.</p>
              )}
              {recentPayments.map((p) => (
                <div key={p.id} className="fee-row">
                  <div className="fee-info">
                    <p className="fee-name">
                      {p.student.name} {p.student.surname}
                    </p>
                    <p className="fee-meta">
                      {p.classFeeStructure.feeType.name} &nbsp;·&nbsp;
                      {new Date(p.paidAt).toLocaleDateString("en-BD")}
                    </p>
                  </div>
                  <span className="fee-amount">৳{p.amountPaid.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ── Quick Actions ── */}
        <section className="quick-actions">
          <h2 className="section-title">Quick Actions</h2>
          <div className="actions-grid">
            {[
              { href: "/admin/students/new",     icon: "🎓", label: "Add Student"     },
              { href: "/admin/users/new",         icon: "👤", label: "Add Employee"    },
              { href: "/admin/classes",           icon: "🏛",  label: "Manage Classes"  },
              { href: "/cashier/fees",            icon: "💳", label: "Collect Fee"     },
              { href: "/admin/announcements/new", icon: "📢", label: "Announcement"    },
              { href: "/admin/settings",          icon: "⚙️", label: "Settings"        },
            ].map((a) => (
              <Link key={a.href} href={a.href} className="action-card">
                <span className="action-icon">{a.icon}</span>
                <span className="action-label">{a.label}</span>
              </Link>
            ))}
          </div>
        </section>

      </main>
      </div>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .dash { min-height: 100vh; background: #070809; color: #f9fafb; font-family: 'Georgia', serif; }

        /* Topbar */
        .topbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 1rem 2rem; background: #0d0f14;
          border-bottom: 1px solid #1f2130;
          position: sticky; top: 0; z-index: 50;
          gap: 1rem; flex-wrap: wrap;
        }
        .topbar-left  { display: flex; align-items: center; gap: .875rem; }
        .topbar-right { display: flex; align-items: center; gap: .875rem; flex-wrap: wrap; }

        .school-logo {
          width: 40px; height: 40px; border-radius: 10px;
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          display: flex; align-items: center; justify-content: center;
          font-weight: 900; color: white; font-size: 1.1rem; flex-shrink: 0;
        }
        .school-name { font-size: .95rem; font-weight: 700; color: #f0f6ff; }
        .school-meta { font-size: .65rem; color: #4b5563; font-family: 'Courier New', monospace; margin-top: .1rem; }

        .user-name  { font-size: .78rem; color: #9ca3af; font-family: 'Courier New', monospace; }
        .logout-btn {
          background: #1f2130; border: 1px solid #2a2d3a; border-radius: 8px;
          color: #9ca3af; font-size: .72rem; font-family: 'Courier New', monospace;
          padding: .38rem .875rem; cursor: pointer; transition: all .15s;
        }
        .logout-btn:hover { background: #2d1515; border-color: #5a2020; color: #f87171; }

        /* Main */
        .main { padding: 2rem; max-width: 1200px; margin: 0 auto; }

        /* Welcome */
        .welcome {
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 1rem; margin-bottom: 2rem;
        }
        .welcome h1 { font-size: 1.5rem; font-weight: 700; color: #f9fafb; }
        .welcome p  { font-size: .78rem; color: #4b5563; font-family: 'Courier New', monospace; margin-top: .25rem; }
        .new-btn {
          background: #2563eb; border: none; border-radius: 10px;
          color: #fff; font-size: .8rem; font-family: 'Courier New', monospace;
          padding: .6rem 1.25rem; cursor: pointer; text-decoration: none;
          transition: background .15s, box-shadow .15s; font-weight: 700;
        }
        .new-btn:hover { background: #1d4ed8; box-shadow: 0 0 16px #2563eb44; }

        /* Stats */
        .stats-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem; margin-bottom: 2rem;
        }
        .stat-card {
          background: #0d0f14; border: 1px solid #1f2130;
          border-radius: 14px; padding: 1.25rem 1.5rem;
          text-decoration: none; display: block;
          transition: border-color .2s, transform .15s;
        }
        .stat-card:hover { border-color: #2a2d3a; transform: translateY(-2px); }
        .stat-top {
          display: flex; justify-content: space-between; align-items: flex-start;
          margin-bottom: .875rem;
        }
        .stat-icon { font-size: 1.3rem; }
        .stat-label {
          font-size: .65rem; color: #6b7280;
          font-family: 'Courier New', monospace;
          text-transform: uppercase; letter-spacing: .1em;
        }
        .stat-value { font-size: 2.25rem; font-weight: 800; font-family: 'Courier New', monospace; line-height: 1; }
        .stat-arrow { font-size: .75rem; color: #374151; margin-top: .5rem; font-family: 'Courier New', monospace; }

        /* Two column */
        .two-col {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 1.25rem; margin-bottom: 2rem;
        }
        @media (max-width: 700px) { .two-col { grid-template-columns: 1fr; } }

        .panel {
          background: #0d0f14; border: 1px solid #1f2130;
          border-radius: 14px; padding: 1.25rem;
        }
        .panel-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 1rem; padding-bottom: .75rem;
          border-bottom: 1px solid #1a1d28;
        }
        .panel-header h2 { font-size: .8rem; color: #9ca3af; font-family: 'Courier New', monospace; text-transform: uppercase; letter-spacing: .1em; }
        .panel-link { font-size: .72rem; color: #3b6fd4; font-family: 'Courier New', monospace; text-decoration: none; }
        .panel-link:hover { color: #60a5fa; }

        .empty { color: #374151; font-size: .8rem; font-family: 'Courier New', monospace; text-align: center; padding: 1rem 0; }

        /* Student rows */
        .student-row {
          display: flex; align-items: center; gap: .75rem;
          padding: .6rem 0; border-bottom: 1px solid #0f1117;
        }
        .student-row:last-child { border-bottom: none; }
        .student-avatar {
          width: 34px; height: 34px; border-radius: 50%;
          background: linear-gradient(135deg, #1e3a8a, #5b21b6);
          display: flex; align-items: center; justify-content: center;
          font-size: .7rem; font-weight: 700; color: #c7d2fe; flex-shrink: 0;
          font-family: 'Courier New', monospace;
        }
        .student-name { font-size: .85rem; color: #e8eaf0; font-weight: 600; }
        .student-meta { font-size: .68rem; color: #4b5563; font-family: 'Courier New', monospace; margin-top: .1rem; }
        .student-info { flex: 1; min-width: 0; }
        .sex-badge {
          font-size: .8rem; flex-shrink: 0;
          width: 24px; height: 24px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
        }
        .sex-badge.male   { background: #1e3a8a22; color: #93c5fd; }
        .sex-badge.female { background: #be185d22; color: #f9a8d4; }

        /* Fee rows */
        .fee-row {
          display: flex; align-items: center; justify-content: space-between;
          gap: .75rem; padding: .6rem 0;
          border-bottom: 1px solid #0f1117;
        }
        .fee-row:last-child { border-bottom: none; }
        .fee-name  { font-size: .85rem; color: #e8eaf0; font-weight: 600; }
        .fee-meta  { font-size: .68rem; color: #4b5563; font-family: 'Courier New', monospace; margin-top: .1rem; }
        .fee-amount {
          font-size: .88rem; font-weight: 700; color: #4ade80;
          font-family: 'Courier New', monospace; flex-shrink: 0;
        }

        /* Quick actions */
        .section-title {
          font-size: .72rem; color: #4b5563; font-family: 'Courier New', monospace;
          text-transform: uppercase; letter-spacing: .12em;
          border-bottom: 1px solid #1f2130; padding-bottom: .6rem; margin-bottom: 1.25rem;
        }
        .actions-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: .875rem;
        }
        .action-card {
          background: #0d0f14; border: 1px solid #1f2130;
          border-radius: 12px; padding: 1.1rem 1rem;
          text-decoration: none; display: flex;
          flex-direction: column; align-items: center; gap: .6rem;
          transition: border-color .2s, background .2s, transform .15s;
        }
        .action-card:hover {
          border-color: #2563eb44; background: #0e1a33;
          transform: translateY(-2px);
        }
        .action-icon  { font-size: 1.4rem; }
        .action-label {
          font-size: .72rem; color: #9ca3af;
          font-family: 'Courier New', monospace;
          text-align: center; letter-spacing: .04em;
        }
      `}</style>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────
export function StatCard({
  label, value, icon, color, href,
}: {
  label: string; value: number; icon: string; color: string; href: string;
}) {
  return (
    <Link href={href} className="stat-card">
      <div className="stat-top">
        <span className="stat-icon">{icon}</span>
        <span className="stat-label">{label}</span>
      </div>
      <p className="stat-value" style={{ color }}>{value}</p>
      <p className="stat-arrow">View all →</p>
    </Link>
  );
}

export function PlanBadge({ plan }: { plan: string }) {
  const map: Record<string, string> = {
    FREE:     "background:#1c1c2e;color:#818cf8;border:1px solid #312e81",
    STANDARD: "background:#0c2340;color:#60a5fa;border:1px solid #1e3a5f",
    POPULAR:  "background:#1a1200;color:#fbbf24;border:1px solid #78350f",
  };
  const style = map[plan] ?? map.FREE;
  return (
    <span style={{
      ...Object.fromEntries(style.split(";").map(s => s.split(":") as [string, string])),
      padding: ".2rem .7rem", borderRadius: "999px",
      fontSize: ".65rem", fontFamily: "'Courier New',monospace",
      fontWeight: "700", letterSpacing: ".06em",
    }}>
      {plan}
    </span>
  );
}