"use client";

// src/components/Salary/SalaryStructureClient.tsx
//
// Tab layout (Salary Structure page):
//   All  |  Admin  |  Cashier  |  Teacher  |  Staff  |  Salary Types
//
// Viewer permissions:
//   ADMIN   → full manage (create/delete salary types, assign/remove structures)
//   CASHIER → view-only across all tabs

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  createSalaryType,
  deleteSalaryType,
  deleteEmployeeSalaryStructure,
  upsertEmployeeSalaryStructure,
} from "../Actions/Salaryactions/Salaryactions";

// ── Types ──────────────────────────────────────────────────────────────────
type EmpRole = "ADMIN" | "CASHIER" | "TEACHER" | "STAFF";

type SalaryType = {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  isRecurring: boolean;
};

type EmployeeItem = {
  id: string;
  name: string;
  surname: string;
  img: string | null;
  phone: string | null;
  employeeRole: EmpRole;
  designation: string | null;
  subjects: string[];
};

type Structure = {
  id: number;
  employeeId: string;
  employeeName: string;
  employeeRole: EmpRole;
  salaryTypeId: number;
  salaryTypeName: string;
  isRecurring: boolean;
  amount: number;
};

type Props = {
  role: string;          // viewer's role: "ADMIN" | "CASHIER"
  salaryTypes: SalaryType[];
  employees: EmployeeItem[];
  structures: Structure[];
};

type DeleteTarget =
  | { kind: "salaryType"; id: number; name: string }
  | { kind: "structure";  id: number; name: string };

type MainTab = "all" | "ADMIN" | "CASHIER" | "TEACHER" | "STAFF" | "types";

// ── Permissions ────────────────────────────────────────────────────────────
function getPermissions(role: string) {
  const r = role.toUpperCase();
  return {
    canManage:  r === "ADMIN",
    canViewAll: r === "ADMIN" || r === "CASHIER",
  };
}

// ── Role config (colours, labels, icons) ──────────────────────────────────
const ROLE_CONFIG: Record<EmpRole, { label: string; icon: string; badge: string; bg: string; accent: string; ring: string; tabActive: string }> = {
  ADMIN:   { label: "Admin",   icon: "⚙️",  badge: "bg-violet-50 text-violet-700 border-violet-200", bg: "bg-violet-50/50 border-violet-100", accent: "bg-violet-600 hover:bg-violet-700", ring: "focus:ring-violet-300", tabActive: "border-violet-500 text-violet-600" },
  CASHIER: { label: "Cashier", icon: "💳",  badge: "bg-amber-50 text-amber-700 border-amber-200",   bg: "bg-amber-50/50 border-amber-100",   accent: "bg-amber-500 hover:bg-amber-600",   ring: "focus:ring-amber-300",   tabActive: "border-amber-500 text-amber-600" },
  TEACHER: { label: "Teacher", icon: "📚",  badge: "bg-blue-50 text-blue-700 border-blue-200",      bg: "bg-blue-50/50 border-blue-100",      accent: "bg-blue-600 hover:bg-blue-700",     ring: "focus:ring-blue-300",     tabActive: "border-blue-500 text-blue-600" },
  STAFF:   { label: "Staff",   icon: "👤",  badge: "bg-gray-50 text-gray-600 border-gray-200",      bg: "bg-gray-50/50 border-gray-200",      accent: "bg-gray-600 hover:bg-gray-700",     ring: "focus:ring-gray-300",     tabActive: "border-gray-500 text-gray-600" },
};

// ── Small helpers ──────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  const r = role.toUpperCase() as EmpRole;
  const cfg = ROLE_CONFIG[r] ?? ROLE_CONFIG.STAFF;
  return (
    <span className={`text-xs border px-2.5 py-0.5 rounded-full font-medium ${cfg.badge}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function Avatar({ img, name }: { img: string | null; name: string }) {
  return (
    <div className="relative w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-emerald-400 to-teal-500 flex-shrink-0">
      {img
        ? <Image src={img} alt={name} fill className="object-cover" />
        : <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-xs">{name[0]}</span>}
    </div>
  );
}

function SummaryCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className={`rounded-xl p-3 border ${color}`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-xl font-bold text-gray-800 mt-0.5">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Delete Modal ───────────────────────────────────────────────────────────
function DeleteModal({ target, onConfirm, onCancel, loading }: {
  target: DeleteTarget; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  const isST = target.kind === "salaryType";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="bg-red-50 border-b border-red-100 px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-xl flex-shrink-0">
            {isST ? "🗑️" : "❌"}
          </div>
          <div>
            <h2 className="text-base font-bold text-red-700">{isST ? "Delete Salary Type" : "Remove Salary Structure"}</h2>
            <p className="text-xs text-red-400 mt-0.5">This action cannot be undone</p>
          </div>
        </div>
        <div className="px-6 py-5">
          <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 mb-4">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">{isST ? "Salary Type" : "Structure"}</p>
            <p className="text-sm font-bold text-gray-800">{target.name}</p>
          </div>
          <p className="text-sm text-gray-600">
            {isST
              ? <>Delete <strong>{target.name}</strong>? All structures using this type will also be removed.</>
              : <>Remove <strong>{target.name}</strong>? Existing payment records will not be affected.</>}
          </p>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium disabled:opacity-50">Cancel</button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center">
            {loading ? <span className="animate-pulse">Deleting…</span> : (isST ? "Yes, Delete" : "Yes, Remove")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Assign Form ────────────────────────────────────────────────────────────
function AssignForm({ employees, salaryTypes, isPending, empRole, onSave }: {
  employees: EmployeeItem[];
  salaryTypes: SalaryType[];
  isPending: boolean;
  empRole: EmpRole | "all";
  onSave: (employeeId: string, salaryTypeId: number, amount: number) => Promise<void>;
}) {
  const [empId,  setEmpId]  = useState("");
  const [typeId, setTypeId] = useState<number | "">("");
  const [amount, setAmount] = useState("");
  const [error,  setError]  = useState("");
  const [ok,     setOk]     = useState("");

  const cfg = empRole !== "all" ? ROLE_CONFIG[empRole] : ROLE_CONFIG.STAFF;

  const handleSave = async () => {
    if (!empId || !typeId || !amount) { setError("All fields required."); return; }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { setError("Enter a valid amount."); return; }
    setError(""); setOk("");
    try {
      await onSave(empId, Number(typeId), amt);
      setAmount(""); setTypeId(""); setEmpId("");
      setOk("✅ Saved!");
      setTimeout(() => setOk(""), 2500);
    } catch {
      setError("Failed to save.");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-3 flex-wrap items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Employee</label>
          <select value={empId} onChange={(e) => setEmpId(e.target.value)}
            className={`border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 ${cfg.ring} w-52`}>
            <option value="">Select employee…</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} {e.surname}{e.designation ? ` — ${e.designation}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Salary Type</label>
          <select value={typeId} onChange={(e) => setTypeId(e.target.value ? Number(e.target.value) : "")}
            className={`border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 ${cfg.ring} w-44`}>
            <option value="">Select type…</option>
            {salaryTypes.filter((s) => s.isActive).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Amount (৳)</label>
          <input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)}
            className={`w-36 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${cfg.ring}`} />
        </div>
        <button onClick={handleSave} disabled={isPending}
          className={`${cfg.accent} text-white text-sm px-5 py-2 rounded-lg font-medium disabled:opacity-50 mb-0.5 transition-colors`}>
          Save
        </button>
      </div>
      {error && <p className="text-red-500 text-xs bg-red-50 p-2 rounded-lg">{error}</p>}
      {ok    && <p className="text-emerald-600 text-xs">{ok}</p>}
    </div>
  );
}

// ── Structure Table ────────────────────────────────────────────────────────
function StructureTable({ structures, employees, perms, onDelete }: {
  structures: Structure[];
  employees: EmployeeItem[];
  perms: ReturnType<typeof getPermissions>;
  onDelete: (t: DeleteTarget) => void;
}) {
  const [filterEmpId, setFilterEmpId] = useState("");

  const empWithStructures = employees.filter((e) => structures.some((s) => s.employeeId === e.id));
  const filtered          = filterEmpId ? structures.filter((s) => s.employeeId === filterEmpId) : structures;
  const totalMonthly      = filtered.filter((s) => s.isRecurring).reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="space-y-3">
      {/* Per-employee pills */}
      {empWithStructures.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 font-medium">Filter:</span>
          <button onClick={() => setFilterEmpId("")}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
              !filterEmpId ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
            All ({structures.length})
          </button>
          {empWithStructures.map((e) => (
            <button key={e.id} onClick={() => setFilterEmpId(e.id)}
              className={`text-xs px-3 py-1 rounded-full font-medium transition-colors flex items-center gap-1 ${
                filterEmpId === e.id ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {e.name} {e.surname} ({structures.filter((s) => s.employeeId === e.id).length})
            </button>
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="flex items-center justify-between text-xs text-gray-500 px-1">
          <span>{filtered.length} structure{filtered.length !== 1 ? "s" : ""}</span>
          <span className="font-semibold text-emerald-700">Monthly total: ৳{totalMonthly.toLocaleString()}</span>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Employee</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Salary Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Recurrence</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
              {perms.canManage && (
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={perms.canManage ? 7 : 6} className="text-center py-12 text-gray-400">
                  <p className="text-3xl mb-2">💼</p>
                  <p className="text-sm">No salary structures configured{filterEmpId ? " for this employee" : ""}.</p>
                </td>
              </tr>
            ) : filtered.map((s, idx) => (
              <tr key={s.id}
                className={`border-b border-gray-50 last:border-0 hover:bg-emerald-50/30 transition-colors ${
                  idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"
                }`}>
                <td className="px-4 py-3 text-xs text-gray-400">{idx + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar img={employees.find((e) => e.id === s.employeeId)?.img ?? null} name={s.employeeName} />
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{s.employeeName}</p>
                      {employees.find((e) => e.id === s.employeeId)?.designation && (
                        <p className="text-xs text-gray-400">{employees.find((e) => e.id === s.employeeId)?.designation}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3"><RoleBadge role={s.employeeRole} /></td>
                <td className="px-4 py-3 font-medium text-gray-700">{s.salaryTypeName}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                    s.isRecurring ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {s.isRecurring ? "🔄 Monthly" : "⚡ One-time"}
                  </span>
                </td>
                <td className="px-4 py-3 font-bold text-emerald-700">৳{s.amount.toLocaleString()}</td>
                {perms.canManage && (
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onDelete({ kind: "structure", id: s.id, name: `${s.salaryTypeName} — ${s.employeeName}` })}
                      className="flex items-center gap-1.5 text-xs bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 px-3 py-1.5 rounded-lg font-medium transition-colors">
                      ❌ Remove
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Role Tab Panel (reused for each role tab) ──────────────────────────────
function RoleTabPanel({ empRole, employees, structures, salaryTypes, perms, isPending, onDelete, onSave }: {
  empRole: EmpRole;
  employees: EmployeeItem[];
  structures: Structure[];
  salaryTypes: SalaryType[];
  perms: ReturnType<typeof getPermissions>;
  isPending: boolean;
  onDelete: (t: DeleteTarget) => void;
  onSave: (empId: string, typeId: number, amount: number) => Promise<void>;
}) {
  const cfg = ROLE_CONFIG[empRole];
  const roleEmployees  = employees.filter((e) => e.employeeRole === empRole);
  const roleStructures = structures.filter((s) => s.employeeRole === empRole);
  const monthly = roleStructures.filter((s) => s.isRecurring).reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className={`rounded-xl px-4 py-2.5 border ${cfg.bg} flex items-center gap-3`}>
          <span className="text-2xl">{cfg.icon}</span>
          <div>
            <p className="text-xs text-gray-500 font-medium">{cfg.label} Employees</p>
            <p className="text-lg font-bold text-gray-800">{roleEmployees.length}</p>
          </div>
        </div>
        <div className="rounded-xl px-4 py-2.5 border border-emerald-100 bg-emerald-50/40 flex items-center gap-3">
          <span className="text-2xl">💰</span>
          <div>
            <p className="text-xs text-gray-500 font-medium">Monthly Payroll</p>
            <p className="text-lg font-bold text-emerald-700">৳{monthly.toLocaleString()}</p>
          </div>
        </div>
        <div className="rounded-xl px-4 py-2.5 border border-gray-100 bg-gray-50 flex items-center gap-3">
          <span className="text-2xl">📋</span>
          <div>
            <p className="text-xs text-gray-500 font-medium">Structures</p>
            <p className="text-lg font-bold text-gray-800">{roleStructures.length}</p>
          </div>
        </div>
      </div>

      {/* Assign form (ADMIN only) */}
      {perms.canManage && (
        <div className={`rounded-xl p-4 space-y-3 border ${cfg.bg}`}>
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wider">
            {cfg.icon} Assign Salary to {cfg.label}
          </h2>
          <AssignForm
            employees={roleEmployees}
            salaryTypes={salaryTypes}
            isPending={isPending}
            empRole={empRole}
            onSave={onSave}
          />
        </div>
      )}

      {roleEmployees.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-3xl mb-2">{cfg.icon}</p>
          <p className="text-sm">No {cfg.label.toLowerCase()} employees found.</p>
        </div>
      ) : (
        <StructureTable
          structures={roleStructures}
          employees={roleEmployees}
          perms={perms}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function SalaryStructureClient({ role, salaryTypes, employees, structures }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const perms = getPermissions(role);

  const [mainTab,       setMainTab]       = useState<MainTab>("all");
  const [deleteTarget,  setDeleteTarget]  = useState<DeleteTarget | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Salary type create form
  const [stName,      setStName]      = useState("");
  const [stDesc,      setStDesc]      = useState("");
  const [stRecurring, setStRecurring] = useState(false);
  const [stError,     setStError]     = useState("");
  const [stSuccess,   setStSuccess]   = useState("");

  const refresh = () => startTransition(() => router.refresh());

  // ── Counts per role (for tab badges) ─────────────────────────────────
  const countByRole = (r: EmpRole) => structures.filter((s) => s.employeeRole === r).length;
  const totalMonthly = structures.filter((s) => s.isRecurring).reduce((sum, s) => sum + s.amount, 0);

  // ── Handlers ─────────────────────────────────────────────────────────
  const handleCreateSalaryType = async () => {
    if (!stName.trim()) { setStError("Name is required."); return; }
    setStError(""); setStSuccess("");
    const res = await createSalaryType({ name: stName.trim(), description: stDesc.trim() || undefined, isRecurring: stRecurring });
    if (res.success) {
      setStName(""); setStDesc(""); setStRecurring(false);
      setStSuccess("✅ Created!"); refresh();
      setTimeout(() => setStSuccess(""), 2500);
    } else setStError(res.error ?? "Failed.");
  };

  const handleUpsert = async (employeeId: string, salaryTypeId: number, amount: number) => {
    const res = await upsertEmployeeSalaryStructure({ employeeId, salaryTypeId, amount });
    if (res.success) refresh();
    else alert(res.error ?? "Failed to save.");
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const res = deleteTarget.kind === "salaryType"
      ? await deleteSalaryType(deleteTarget.id)
      : await deleteEmployeeSalaryStructure(deleteTarget.id);
    if (res.success) { setDeleteTarget(null); refresh(); }
    else alert(res.error ?? "Delete failed.");
    setDeleteLoading(false);
  };

  if (!perms.canViewAll) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-gray-400">
          <p className="text-4xl mb-3">🔒</p>
          <p className="font-semibold text-gray-600">Access Restricted</p>
        </div>
      </div>
    );
  }

  // ── Tab definitions ───────────────────────────────────────────────────
  const tabs: { key: MainTab; label: string; icon: string; count: number; activeClass: string }[] = [
    { key: "all",     label: "All",          icon: "📊", count: structures.length,    activeClass: "border-emerald-500 text-emerald-600" },
    { key: "ADMIN",   label: "Admin",        icon: "⚙️", count: countByRole("ADMIN"),   activeClass: ROLE_CONFIG.ADMIN.tabActive },
    { key: "CASHIER", label: "Cashier",      icon: "💳", count: countByRole("CASHIER"), activeClass: ROLE_CONFIG.CASHIER.tabActive },
    { key: "TEACHER", label: "Teacher",      icon: "📚", count: countByRole("TEACHER"), activeClass: ROLE_CONFIG.TEACHER.tabActive },
    { key: "STAFF",   label: "Staff",        icon: "👤", count: countByRole("STAFF"),   activeClass: ROLE_CONFIG.STAFF.tabActive },
    { key: "types",   label: "Salary Types", icon: "🏷️", count: salaryTypes.length,    activeClass: "border-gray-500 text-gray-600" },
  ];

  return (
    <div className="bg-white p-4 rounded-xl flex-1 m-4 mt-0 space-y-4">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-800">💼 Salary Management</h1>
          <p className="text-sm text-gray-500">Configure salaries for all employee roles</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <RoleBadge role={role} />
          {!perms.canManage && (
            <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-3 py-1 rounded-full">👁 View only</span>
          )}
          <a href="/list/salary/cashier" className="text-sm bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-4 py-2 rounded-lg font-medium transition-colors">
            💳 Pay Salary
          </a>
          <a href="/list/salary/payments" className="text-sm bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-4 py-2 rounded-lg font-medium transition-colors">
            📊 All Payments
          </a>
        </div>
      </div>

      {/* ── Summary Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard label="Total Monthly"   value={`৳${totalMonthly.toLocaleString()}`} sub="all recurring"            color="border-emerald-100 bg-emerald-50/40" />
        <SummaryCard label="Admin"           value={countByRole("ADMIN")}   sub="structures"  color="border-violet-100 bg-violet-50/40" />
        <SummaryCard label="Cashier"         value={countByRole("CASHIER")} sub="structures"  color="border-amber-100 bg-amber-50/40" />
        <SummaryCard label="Teachers"        value={countByRole("TEACHER")} sub="structures"  color="border-blue-100 bg-blue-50/40" />
        <SummaryCard label="Staff"           value={countByRole("STAFF")}   sub="structures"  color="border-gray-100 bg-gray-50/60" />
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────── */}
      <div className="flex gap-0 border-b border-gray-100 overflow-x-auto">
        {tabs.map(({ key, label, icon, count, activeClass }) => (
          <button key={key} onClick={() => setMainTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 ${
              mainTab === key ? `${activeClass} bg-white` : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            <span>{icon}</span>
            <span>{label}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              mainTab === key ? "bg-current/10 opacity-80" : "bg-gray-100 text-gray-500"
            }`}
              style={mainTab === key ? { backgroundColor: "rgba(0,0,0,0.07)" } : {}}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* ════ ALL TAB ════ */}
      {mainTab === "all" && (
        <div className="space-y-4">
          {perms.canManage && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
              <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wider">📊 Assign Salary — Any Employee</h2>
              <AssignForm employees={employees} salaryTypes={salaryTypes} isPending={isPending} empRole="all" onSave={handleUpsert} />
            </div>
          )}
          <StructureTable structures={structures} employees={employees} perms={perms} onDelete={setDeleteTarget} />
        </div>
      )}

      {/* ════ ROLE TABS (ADMIN / CASHIER / TEACHER / STAFF) ════ */}
      {(["ADMIN", "CASHIER", "TEACHER", "STAFF"] as EmpRole[]).map((r) =>
        mainTab === r ? (
          <RoleTabPanel
            key={r}
            empRole={r}
            employees={employees}
            structures={structures}
            salaryTypes={salaryTypes}
            perms={perms}
            isPending={isPending}
            onDelete={setDeleteTarget}
            onSave={handleUpsert}
          />
        ) : null
      )}

      {/* ════ SALARY TYPES TAB ════ */}
      {mainTab === "types" && (
        <div className="space-y-4">
          {perms.canManage && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
              <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wider">+ Create Salary Type</h2>
              <div className="flex gap-3 flex-wrap items-end">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-medium">Name</label>
                  <input type="text" placeholder="e.g. Monthly Salary" value={stName}
                    onChange={(e) => setStName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateSalaryType()}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-medium">Description</label>
                  <input type="text" placeholder="Optional" value={stDesc} onChange={(e) => setStDesc(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-medium">Type</label>
                  <select value={stRecurring ? "1" : "0"} onChange={(e) => setStRecurring(e.target.value === "1")}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300">
                    <option value="0">One-time / Bonus</option>
                    <option value="1">Monthly Recurring</option>
                  </select>
                </div>
                <button onClick={handleCreateSalaryType} disabled={isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-5 py-2 rounded-lg font-medium disabled:opacity-50 transition-colors mb-0.5">
                  + Add
                </button>
              </div>
              {stError   && <p className="text-red-500 text-xs bg-red-50 p-2 rounded-lg">{stError}</p>}
              {stSuccess && <p className="text-emerald-600 text-xs">{stSuccess}</p>}
            </div>
          )}
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Description</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Recurrence</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  {perms.canManage && <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {salaryTypes.length === 0 ? (
                  <tr><td colSpan={perms.canManage ? 6 : 5} className="text-center py-10 text-gray-400">No salary types yet.</td></tr>
                ) : salaryTypes.map((st, idx) => (
                  <tr key={st.id} className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/60 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}>
                    <td className="px-4 py-3 text-xs text-gray-400">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{st.name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">{st.description ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${st.isRecurring ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                        {st.isRecurring ? "🔄 Monthly" : "⚡ One-time"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${st.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                        {st.isActive ? "✅ Active" : "Inactive"}
                      </span>
                    </td>
                    {perms.canManage && (
                      <td className="px-4 py-3">
                        <button onClick={() => setDeleteTarget({ kind: "salaryType", id: st.id, name: st.name })}
                          className="flex items-center gap-1.5 text-xs bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 px-3 py-1.5 rounded-lg font-medium transition-colors">
                          🗑 Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <DeleteModal
          target={deleteTarget}
          onConfirm={handleConfirmDelete}
          onCancel={() => !deleteLoading && setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}
    </div>
  );
}