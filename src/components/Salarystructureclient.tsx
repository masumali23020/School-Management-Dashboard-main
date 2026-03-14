"use client";

// src/components/Salary/SalaryStructureClient.tsx

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createSalaryType, deleteSalaryType, deleteTeacherSalaryStructure, upsertTeacherSalaryStructure } from "@/Actions/Salaryactions/Salaryactions";


// ── Types ──────────────────────────────────────────────────────────────────
type SalaryType = { id: number; name: string; description: string | null; isActive: boolean; isRecurring: boolean };
type TeacherItem = { id: string; name: string; surname: string; img: string | null; phone: string | null; subjects: string[] };
type Structure   = { id: number; teacherId: string; teacherName: string; salaryTypeId: number; salaryTypeName: string; isRecurring: boolean; amount: number };

type Props = {
  role:         string;
  salaryTypes:  SalaryType[];
  teachers:     TeacherItem[];
  structures:   Structure[];
};

type DeleteTarget =
  | { kind: "salaryType"; id: number; name: string }
  | { kind: "structure";  id: number; name: string };

// ── Delete Modal ───────────────────────────────────────────────────────────
function DeleteModal({ target, onConfirm, onCancel, loading }: {
  target:    DeleteTarget;
  onConfirm: () => void;
  onCancel:  () => void;
  loading:   boolean;
}) {
  const isSalaryType  = target.kind === "salaryType";
  const title         = isSalaryType ? "Delete Salary Type" : "Remove Salary Structure";
  const body          = isSalaryType
    ? <>Delete salary type <strong>"{target.name}"</strong>? All salary structures using this type will also be removed.</>
    : <>Remove <strong>"{target.name}"</strong> from salary structure? Existing payment records will not be affected.</>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="bg-red-50 border-b border-red-100 px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-lg flex-shrink-0">
            {isSalaryType ? "🗑️" : "❌"}
          </div>
          <div>
            <h2 className="text-base font-bold text-red-700">{title}</h2>
            <p className="text-xs text-red-400 mt-0.5">This action cannot be undone</p>
          </div>
        </div>
        <div className="px-6 py-5">
          <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 mb-4">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">
              {isSalaryType ? "Salary Type" : "Structure"}
            </p>
            <p className="text-sm font-bold text-gray-800">{target.name}</p>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center">
            {loading ? <span className="animate-pulse">Deleting…</span> : (isSalaryType ? "Yes, Delete" : "Yes, Remove")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Avatar ─────────────────────────────────────────────────────────────────
function Avatar({ img, name }: { img: string | null; name: string }) {
  return (
    <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-green-400 to-teal-500 flex-shrink-0">
      {img
        ? <Image src={img} alt={name} fill className="object-cover" />
        : <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-xs">{name[0]}</span>
      }
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function SalaryStructureClient({ role, salaryTypes, teachers, structures }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isAdmin = role === "admin";

  const [tab, setTab] = useState<"structure" | "types">("structure");

  // Delete modal
  const [deleteTarget,  setDeleteTarget]  = useState<DeleteTarget | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Salary type form
  const [stName,       setStName]       = useState("");
  const [stDesc,       setStDesc]       = useState("");
  const [stRecurring,  setStRecurring]  = useState(false);
  const [stError,      setStError]      = useState("");
  const [stSuccess,    setStSuccess]    = useState("");

  // Structure form
  const [sfTeacherId,    setSfTeacherId]    = useState("");
  const [sfSalaryTypeId, setSfSalaryTypeId] = useState<number | "">("");
  const [sfAmount,       setSfAmount]       = useState("");
  const [sfError,        setSfError]        = useState("");
  const [sfSuccess,      setSfSuccess]      = useState("");

  // Filter
  const [filterTeacherId, setFilterTeacherId] = useState("");

  const refresh = () => startTransition(() => router.refresh());

  const filteredStructures = filterTeacherId
    ? structures.filter((s) => s.teacherId === filterTeacherId)
    : structures;

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleCreateSalaryType = async () => {
    if (!stName.trim()) { setStError("Name is required."); return; }
    setStError(""); setStSuccess("");
    const res = await createSalaryType({ name: stName.trim(), description: stDesc.trim() || undefined, isRecurring: stRecurring });
    if (res.success) { setStName(""); setStDesc(""); setStRecurring(false); setStSuccess("✅ Created!"); refresh(); setTimeout(() => setStSuccess(""), 2500); }
    else setStError(res.error ?? "Failed.");
  };

  const handleUpsertStructure = async () => {
    if (!sfTeacherId || !sfSalaryTypeId || !sfAmount) { setSfError("All fields required."); return; }
    const amount = parseFloat(sfAmount);
    if (isNaN(amount) || amount <= 0) { setSfError("Enter a valid amount."); return; }
    setSfError(""); setSfSuccess("");
    const res = await upsertTeacherSalaryStructure({ teacherId: sfTeacherId, salaryTypeId: Number(sfSalaryTypeId), amount });
    if (res.success) { setSfAmount(""); setSfSalaryTypeId(""); setSfSuccess("✅ Saved!"); refresh(); setTimeout(() => setSfSuccess(""), 2500); }
    else setSfError(res.error ?? "Failed.");
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const res = deleteTarget.kind === "salaryType"
      ? await deleteSalaryType(deleteTarget.id)
      : await deleteTeacherSalaryStructure(deleteTarget.id);
    if (res.success) { setDeleteTarget(null); refresh(); }
    else alert(res.error ?? "Delete failed.");
    setDeleteLoading(false);
  };

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white p-4 rounded-xl flex-1 m-4 mt-0 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-800">💼 Salary Management</h1>
          <p className="text-sm text-gray-500">Configure teacher salaries and bonuses</p>
        </div>
        <div className="flex items-center gap-2">
          {!isAdmin && (
            <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-3 py-1 rounded-full">
              👁 View only
            </span>
          )}
          <a href="/list/salary/cashier"
            className="text-sm bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-4 py-2 rounded-lg font-medium transition-colors">
            💳 Pay Salary
          </a>
          <a href="/list/salary/payments"
            className="text-sm bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-4 py-2 rounded-lg font-medium transition-colors">
            📊 All Payments
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-100">
        {(["structure", "types"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? "border-emerald-500 text-emerald-600 bg-white" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            {t === "structure" ? "👤 Teacher Salary Structures" : "🏷️ Salary Types"}
          </button>
        ))}
      </div>

      {/* ════════ SALARY TYPES TAB ════════ */}
      {tab === "types" && (
        <div className="space-y-4">
          {isAdmin && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
              <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wider">+ Create Salary Type</h2>
              <div className="flex gap-3 flex-wrap items-end">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-medium">Name</label>
                  <input type="text" placeholder="e.g. Monthly Salary, Eid Bonus" value={stName}
                    onChange={(e) => setStName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateSalaryType()}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-medium">Description</label>
                  <input type="text" placeholder="Optional" value={stDesc}
                    onChange={(e) => setStDesc(e.target.value)}
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
                  {isAdmin && <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {salaryTypes.length === 0 ? (
                  <tr><td colSpan={isAdmin ? 6 : 5} className="text-center py-10 text-gray-400">No salary types yet.</td></tr>
                ) : salaryTypes.map((st, idx) => (
                  <tr key={st.id} className={`border-b border-gray-50 last:border-0 hover:bg-emerald-50/20 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}>
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
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setDeleteTarget({ kind: "salaryType", id: st.id, name: st.name })}
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

      {/* ════════ SALARY STRUCTURES TAB ════════ */}
      {tab === "structure" && (
        <div className="space-y-4">
          {/* Add structure form — admin only */}
          {isAdmin && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
              <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wider">Assign Salary to Teacher</h2>
              <div className="flex gap-3 flex-wrap items-end">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-medium">Teacher</label>
                  <select value={sfTeacherId} onChange={(e) => setSfTeacherId(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300 w-48">
                    <option value="">Select teacher…</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} {t.surname}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-medium">Salary Type</label>
                  <select value={sfSalaryTypeId} onChange={(e) => setSfSalaryTypeId(e.target.value ? Number(e.target.value) : "")}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300 w-44">
                    <option value="">Select type…</option>
                    {salaryTypes.filter((s) => s.isActive).map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-medium">Amount (৳)</label>
                  <input type="number" placeholder="0.00" value={sfAmount} onChange={(e) => setSfAmount(e.target.value)}
                    className="w-36 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                </div>
                <button onClick={handleUpsertStructure} disabled={isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-5 py-2 rounded-lg font-medium disabled:opacity-50 mb-0.5 transition-colors">
                  Save
                </button>
              </div>
              {sfError   && <p className="text-red-500 text-xs bg-red-50 p-2 rounded-lg">{sfError}</p>}
              {sfSuccess && <p className="text-emerald-600 text-xs">{sfSuccess}</p>}
            </div>
          )}

          {/* Teacher filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 font-medium">Filter:</span>
            <button onClick={() => setFilterTeacherId("")}
              className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${!filterTeacherId ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              All ({structures.length})
            </button>
            {teachers.filter((t) => structures.some((s) => s.teacherId === t.id)).map((t) => {
              const count = structures.filter((s) => s.teacherId === t.id).length;
              return (
                <button key={t.id} onClick={() => setFilterTeacherId(t.id)}
                  className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${filterTeacherId === t.id ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  {t.name} {t.surname} ({count})
                </button>
              );
            })}
          </div>

          {/* Structure table */}
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Teacher</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Salary Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Recurrence</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                  {isAdmin && <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredStructures.length === 0 ? (
                  <tr><td colSpan={isAdmin ? 6 : 5} className="text-center py-12 text-gray-400">
                    <p className="text-2xl mb-2">👤</p>
                    <p className="text-sm">No salary structures configured{filterTeacherId ? " for this teacher" : ""}.</p>
                  </td></tr>
                ) : filteredStructures.map((s, idx) => {
                  const teacher = teachers.find((t) => t.id === s.teacherId);
                  return (
                    <tr key={s.id} className={`border-b border-gray-50 last:border-0 hover:bg-emerald-50/20 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}>
                      <td className="px-4 py-3 text-xs text-gray-400">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar img={teacher?.img ?? null} name={s.teacherName} />
                          <div>
                            <p className="font-semibold text-gray-800 text-sm">{s.teacherName}</p>
                            {teacher?.subjects && teacher.subjects.length > 0 && (
                              <p className="text-xs text-gray-400">{teacher.subjects.slice(0, 2).join(", ")}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-700">{s.salaryTypeName}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${s.isRecurring ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                          {s.isRecurring ? "🔄 Monthly" : "⚡ One-time"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-700">৳{s.amount.toLocaleString()}</td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setDeleteTarget({ kind: "structure", id: s.id, name: `${s.salaryTypeName} — ${s.teacherName}` })}
                            className="flex items-center gap-1.5 text-xs bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 px-3 py-1.5 rounded-lg font-medium transition-colors">
                            ❌ Remove
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredStructures.length > 0 && (
            <div className="text-right text-sm text-gray-500">
              {filteredStructures.length} structure{filteredStructures.length !== 1 ? "s" : ""}
              {filterTeacherId && ` · Total configured: ৳${filteredStructures.reduce((s, f) => s + f.amount, 0).toLocaleString()}`}
            </div>
          )}
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