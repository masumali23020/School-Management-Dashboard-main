// app/(superadmin)/superadmin/dashboard/page.tsx
// Super Admin dashboard — school stats, quick actions

import { redirect } from "next/navigation";
import  prisma  from "@/lib/db";
import Link from "next/link";
import { getSuperAdminSession, superAdminLogoutAction } from "@/Actions/school/superadmin-login.action";

export default async function SuperAdminDashboard() {
  // ── Auth guard ─────────────────────────────────────────────────────────────
  const session = await getSuperAdminSession();
  if (!session) redirect("/superadmin/login");

  // ── Fetch stats ────────────────────────────────────────────────────────────
  // NOTE: Prisma groupBy() does NOT support include — run a separate count per plan instead
  const [totalSchools, activeSchools, totalStudents, expiredSchools] = await Promise.all([
    prisma.school.count(),
    prisma.school.count({ where: { isActive: true } }),
    prisma.student.count(),
    prisma.school.count({ where: { expiredAt: { lt: new Date() } } }),
  ]);

  const schools = await prisma.school.findMany({
    take:    10,
    orderBy: { createdAt: "desc" },
    include: { plan: true, _count: { select: { students: true, employees: true } } },
  });

  return (
    <div className="sa-dash">
      {/* ── Top bar ── */}
      <header className="sa-topbar">
        <div className="sa-topbar-left">
          <div className="sa-logo-sm">S</div>
          <div>
            <p className="sa-topbar-title">SchoolSaaS</p>
            <p className="sa-topbar-sub">Super Admin Panel</p>
          </div>
        </div>
        <div className="sa-topbar-right">
          <span className="sa-topbar-name">👑 {session.name}</span>
          <form action={superAdminLogoutAction}>
            <button type="submit" className="sa-logout-btn">Sign Out</button>
          </form>
        </div>
      </header>

      <main className="sa-main">
        {/* ── Welcome ── */}
        <div className="sa-welcome">
          <h1>Welcome back, {session.name.split(" ")[0]} 👋</h1>
          <p>{session.email}</p>
        </div>

        {/* ── Stats ── */}
        <div className="sa-stats">
          <StatCard label="Total Schools"  value={totalSchools}              icon="🏫" color="#3b82f6" />
          <StatCard label="Active Schools" value={activeSchools}             icon="✅" color="#22c55e" />
          <StatCard label="Total Students" value={totalStudents}             icon="🎓" color="#a855f7" />
          <StatCard label="Expired"        value={expiredSchools}            icon="⚠️" color="#f59e0b" />
        </div>

        {/* ── Quick Actions ── */}
        <div className="sa-section">
          <h2 className="sa-section-title">Quick Actions</h2>
          <div className="sa-actions">
            <Link href="/superadmin/register-school" className="sa-action-btn sa-action-primary">
              + Register New School
            </Link>
            <Link href="/superadmin/schools" className="sa-action-btn">
              View All Schools
            </Link>
            <Link href="/superadmin/plans" className="sa-action-btn">
              Manage Plans
            </Link>
          </div>
        </div>

        {/* ── Recent Schools ── */}
        <div className="sa-section">
          <h2 className="sa-section-title">Recent Schools</h2>
          <div className="sa-table-wrap">
            <table className="sa-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>School Name</th>
                  <th>Plan</th>
                  <th>Students</th>
                  <th>Staff</th>
                  <th>Status</th>
                  <th>Expires</th>
                </tr>
              </thead>
              <tbody>
                {schools.map((s) => {
                  const expired = s.expiredAt && s.expiredAt < new Date();
                  return (
                    <tr key={s.id}>
                      <td className="sa-td-mono">#{s.id}</td>
                      <td>
                        <p className="sa-school-name">{s.schoolName}</p>
                        {s.shortName && <p className="sa-school-sub">{s.shortName}</p>}
                      </td>
                      <td>
                        <PlanBadge plan={s.plan.name} />
                      </td>
                      <td className="sa-td-mono">{s._count.students}</td>
                      <td className="sa-td-mono">{s._count.employees}</td>
                      <td>
                        {s.isActive && !expired
                          ? <StatusBadge label="Active"   color="green" />
                          : expired
                          ? <StatusBadge label="Expired"  color="yellow" />
                          : <StatusBadge label="Disabled" color="red" />
                        }
                      </td>
                      <td className="sa-td-mono sa-td-muted">
                        {s.expiredAt
                          ? new Date(s.expiredAt).toLocaleDateString("en-BD")
                          : "—"
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .sa-dash { min-height: 100vh; background: #070809; color: #f9fafb; font-family: 'Georgia', serif; }

        /* Topbar */
        .sa-topbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 1rem 2rem; background: #0d0f14;
          border-bottom: 1px solid #1f2130;
          position: sticky; top: 0; z-index: 50;
        }
        .sa-topbar-left { display: flex; align-items: center; gap: .875rem; }
        .sa-logo-sm {
          width: 36px; height: 36px; background: #16a34a; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-weight: 900; color: white; font-size: 1rem;
        }
        .sa-topbar-title { font-size: .9rem; font-weight: 700; color: #f0fdf4; }
        .sa-topbar-sub   { font-size: .65rem; color: #4b5563; font-family: 'Courier New', monospace; text-transform: uppercase; letter-spacing: .1em; }
        .sa-topbar-right { display: flex; align-items: center; gap: 1rem; }
        .sa-topbar-name  { font-size: .8rem; color: #9ca3af; font-family: 'Courier New', monospace; }
        .sa-logout-btn {
          background: #1f2130; border: 1px solid #2a2d3a; border-radius: 8px;
          color: #9ca3af; font-size: .75rem; font-family: 'Courier New', monospace;
          padding: .4rem .875rem; cursor: pointer; transition: all .15s;
        }
        .sa-logout-btn:hover { background: #2d1515; border-color: #5a2020; color: #f87171; }

        /* Main */
        .sa-main { padding: 2rem; max-width: 1200px; margin: 0 auto; }
        .sa-welcome { margin-bottom: 2rem; }
        .sa-welcome h1 { font-size: 1.5rem; font-weight: 700; color: #f9fafb; }
        .sa-welcome p  { font-size: .8rem; color: #4b5563; font-family: 'Courier New', monospace; margin-top: .25rem; }

        /* Stats */
        .sa-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 2.5rem; }
        .sa-stat  { background: #0d0f14; border: 1px solid #1f2130; border-radius: 14px; padding: 1.25rem 1.5rem; }
        .sa-stat-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: .75rem; }
        .sa-stat-icon { font-size: 1.25rem; }
        .sa-stat-label { font-size: .7rem; color: #6b7280; font-family: 'Courier New', monospace; text-transform: uppercase; letter-spacing: .1em; }
        .sa-stat-value { font-size: 2rem; font-weight: 800; font-family: 'Courier New', monospace; }

        /* Sections */
        .sa-section { margin-bottom: 2.5rem; }
        .sa-section-title { font-size: .75rem; color: #4b5563; font-family: 'Courier New', monospace; text-transform: uppercase; letter-spacing: .12em; border-bottom: 1px solid #1f2130; padding-bottom: .6rem; margin-bottom: 1.25rem; }

        /* Actions */
        .sa-actions { display: flex; gap: .75rem; flex-wrap: wrap; }
        .sa-action-btn {
          background: #0d0f14; border: 1px solid #2a2d3a; border-radius: 10px;
          color: #9ca3af; font-size: .8rem; font-family: 'Courier New', monospace;
          padding: .6rem 1.25rem; cursor: pointer; transition: all .15s;
          text-decoration: none; display: inline-block;
        }
        .sa-action-btn:hover { background: #1f2130; color: #f9fafb; }
        .sa-action-primary { background: #14532d !important; border-color: #16a34a !important; color: #4ade80 !important; }
        .sa-action-primary:hover { background: #166534 !important; box-shadow: 0 0 15px #16a34a33; }

        /* Table */
        .sa-table-wrap { overflow-x: auto; border-radius: 14px; border: 1px solid #1f2130; }
        .sa-table { width: 100%; border-collapse: collapse; font-size: .82rem; }
        .sa-table th {
          text-align: left; padding: .875rem 1rem;
          font-family: 'Courier New', monospace; font-size: .65rem;
          text-transform: uppercase; letter-spacing: .1em;
          color: #4b5563; border-bottom: 1px solid #1f2130;
          background: #0d0f14;
        }
        .sa-table td { padding: .875rem 1rem; border-bottom: 1px solid #0f1117; }
        .sa-table tr:last-child td { border-bottom: none; }
        .sa-table tr:hover td { background: #0d0f14; }
        .sa-school-name { color: #f9fafb; font-weight: 600; font-size: .85rem; }
        .sa-school-sub  { color: #4b5563; font-size: .7rem; font-family: 'Courier New', monospace; }
        .sa-td-mono     { font-family: 'Courier New', monospace; font-size: .8rem; color: #9ca3af; }
        .sa-td-muted    { color: #4b5563 !important; }
      `}</style>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <div className="sa-stat">
      <div className="sa-stat-top">
        <span className="sa-stat-icon">{icon}</span>
        <span className="sa-stat-label">{label}</span>
      </div>
      <p className="sa-stat-value" style={{ color }}>{value}</p>
    </div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const styles: Record<string, string> = {
    FREE:     "background:#1c1c2e;color:#818cf8;border:1px solid #312e81",
    STANDARD: "background:#0c2340;color:#60a5fa;border:1px solid #1e3a5f",
    POPULAR:  "background:#1a1200;color:#fbbf24;border:1px solid #78350f",
  };
  return (
    <span style={{ ...Object.fromEntries((styles[plan] ?? styles.FREE).split(";").map(s => s.split(":") as [string, string])), padding:".2rem .6rem", borderRadius:"999px", fontSize:".65rem", fontFamily:"'Courier New',monospace", fontWeight:"700", letterSpacing:".05em" }}>
      {plan}
    </span>
  );
}

function StatusBadge({ label, color }: { label: string; color: "green" | "red" | "yellow" }) {
  const map = {
    green:  "background:#0f291e;color:#4ade80;border:1px solid #166534",
    red:    "background:#1c0a0a;color:#f87171;border:1px solid #7f1d1d",
    yellow: "background:#1a1200;color:#fbbf24;border:1px solid #78350f",
  };
  return (
    <span style={{ ...Object.fromEntries(map[color].split(";").map(s => s.split(":") as [string, string])), padding:".2rem .6rem", borderRadius:"999px", fontSize:".65rem", fontFamily:"'Courier New',monospace", fontWeight:"700" }}>
      {label}
    </span>
  );
}