"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createFeeType, deleteClassFeeStructure, deleteFeeType, upsertClassFeeStructure } from "@/Actions/Feeactions/Feeactions";


// ── Types ──────────────────────────────────────────────────────────────────
type FeeType  = { id: number; name: string; description: string | null; isActive: boolean };
type ClassItem = { id: number; name: string; gradeLevel: number };
type Structure = {
  id: number; classId: number; className: string;
  gradeLevel: number; feeTypeId: number; feeTypeName: string; amount: number;
};

type Props = {
  feeTypes:   FeeType[];
  classes:    ClassItem[];
  structures: Structure[];
  role:       string;           // passed from server — "admin" | other
};

// ── Delete Modal ──────────────────────────────────────────────────────────
type DeleteTarget =
  | { kind: "feeType";   id: number; name: string }
  | { kind: "structure"; id: number; name: string };

function DeleteModal({
  target,
  onConfirm,
  onCancel,
  loading,
}: {
  target:    DeleteTarget;
  onConfirm: () => void;
  onCancel:  () => void;
  loading:   boolean;
}) {
  const isFeeType  = target.kind === "feeType";
  const title      = isFeeType ? "Delete Fee Type" : "Remove Fee Structure";
  const icon       = isFeeType ? "🗑️" : "❌";
  const body       = isFeeType
    ? <>Are you sure you want to delete the fee type <strong>{target.name}</strong>?<br/>All class fee structures using this type will also be removed.</>
    : <>Are you sure you want to remove <strong>{target.name}</strong> from the fee structure?<br/>Existing payment records will not be affected.</>;
  const confirmLabel = isFeeType ? "Yes, Delete" : "Yes, Remove";

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      {/* Modal card */}
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-red-50 border-b border-red-100 px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-lg flex-shrink-0">
            {icon}
          </div>
          <div>
            <h2 className="text-base font-bold text-red-700">{title}</h2>
            <p className="text-xs text-red-400 mt-0.5">This action cannot be undone</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {/* Item name badge */}
          <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 mb-4">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">
              {isFeeType ? "Fee Type" : "Fee Structure"}
            </p>
            <p className="text-sm font-bold text-gray-800">{target.name}</p>
          </div>

          {/* Warning text */}
          <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
        </div>

        {/* Footer buttons */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="animate-pulse">Deleting…</span>
            ) : (
              <>{confirmLabel}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function FeeStructureClient({ feeTypes, classes, structures, role }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isAdmin = role === "admin";

  // Active tab
  const [tab, setTab] = useState<"structure" | "types">("structure");

  // Class filter
  const [selectedClassId, setSelectedClassId] = useState<number | "">(classes[0]?.id ?? "");

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fee Type form
  const [ftName,    setFtName]    = useState("");
  const [ftDesc,    setFtDesc]    = useState("");
  const [ftError,   setFtError]   = useState("");
  const [ftSuccess, setFtSuccess] = useState("");

  // Structure form
  const [stClassId,   setStClassId]   = useState<number | "">(classes[0]?.id ?? "");
  const [stFeeTypeId, setStFeeTypeId] = useState<number | "">("");
  const [stAmount,    setStAmount]    = useState("");
  const [stError,     setStError]     = useState("");
  const [stSuccess,   setStSuccess]   = useState("");

  const filteredStructures = selectedClassId
    ? structures.filter((s) => s.classId === selectedClassId)
    : structures;

  const refresh = () => startTransition(() => router.refresh());

  // ── Create Fee Type ──────────────────────────────────────────────────────
  const handleCreateFeeType = async () => {
    if (!ftName.trim()) { setFtError("Name is required."); return; }
    setFtError(""); setFtSuccess("");
    const res = await createFeeType({ name: ftName.trim(), description: ftDesc.trim() || undefined });
    if (res.success) {
      setFtName(""); setFtDesc("");
      setFtSuccess("✅ Fee type created!");
      refresh();
      setTimeout(() => setFtSuccess(""), 2500);
    } else setFtError(res.error ?? "Failed.");
  };

  // ── Upsert Structure ─────────────────────────────────────────────────────
  const handleUpsertStructure = async () => {
    if (!stClassId || !stFeeTypeId || !stAmount) { setStError("All fields are required."); return; }
    const amount = parseFloat(stAmount);
    if (isNaN(amount) || amount <= 0) { setStError("Enter a valid amount."); return; }
    setStError(""); setStSuccess("");
    const res = await upsertClassFeeStructure({ classId: Number(stClassId), feeTypeId: Number(stFeeTypeId), amount });
    if (res.success) {
      setStAmount(""); setStFeeTypeId("");
      setStSuccess("✅ Saved!");
      refresh();
      setTimeout(() => setStSuccess(""), 2500);
    } else setStError(res.error ?? "Failed.");
  };

  // ── Open delete modal ────────────────────────────────────────────────────
  const openDeleteFeeType  = (ft: FeeType) =>
    setDeleteTarget({ kind: "feeType",   id: ft.id, name: ft.name });
  const openDeleteStructure = (s: Structure) =>
    setDeleteTarget({ kind: "structure", id: s.id,  name: `${s.feeTypeName} — ${s.className}` });

  // ── Confirm delete ───────────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = deleteTarget.kind === "feeType"
        ? await deleteFeeType(deleteTarget.id)
        : await deleteClassFeeStructure(deleteTarget.id);
      if (res.success) {
        setDeleteTarget(null);
        refresh();
      } else {
        alert(res.error ?? "Delete failed.");
      }
    } catch {
      alert("Delete failed.");
    }
    setDeleteLoading(false);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white p-4 rounded-xl flex-1 m-4 mt-0 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-800">💰 Fee Management</h1>
          <p className="text-sm text-gray-500">Define fee structures for each class</p>
        </div>
        {!isAdmin && (
          <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-3 py-1 rounded-full font-medium">
            👁 View only — contact admin to make changes
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-100">
        {(["structure", "types"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-indigo-500 text-indigo-600 bg-white"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "structure" ? "📋 Class Fee Structures" : "🏷️ Fee Types"}
          </button>
        ))}
      </div>

      {/* ════════ FEE TYPES TAB ════════ */}
      {tab === "types" && (
        <div className="space-y-4">

          {/* Create form — admin only */}
          {isAdmin && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
              <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wider">+ Create New Fee Type</h2>
              <div className="flex gap-3 flex-wrap">
                <input
                  type="text"
                  placeholder="Fee type name  e.g. Lab Fee"
                  value={ftName}
                  onChange={(e) => setFtName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateFeeType()}
                  className="flex-1 min-w-[180px] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={ftDesc}
                  onChange={(e) => setFtDesc(e.target.value)}
                  className="flex-1 min-w-[180px] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <button
                  onClick={handleCreateFeeType}
                  disabled={isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-5 py-2 rounded-lg font-medium disabled:opacity-50 transition-colors"
                >
                  + Add
                </button>
              </div>
              {ftError   && <p className="text-red-500 text-xs bg-red-50 p-2 rounded-lg">{ftError}</p>}
              {ftSuccess && <p className="text-emerald-600 text-xs">{ftSuccess}</p>}
            </div>
          )}

          {/* Fee types table */}
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Description</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  {isAdmin && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {feeTypes.length === 0 ? (
                  <tr><td colSpan={isAdmin ? 5 : 4} className="text-center py-10 text-gray-400">No fee types yet.</td></tr>
                ) : feeTypes.map((ft, idx) => (
                  <tr key={ft.id} className={`border-b border-gray-50 last:border-0 hover:bg-indigo-50/20 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}>
                    <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{ft.name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">{ft.description ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${ft.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                        {ft.isActive ? "✅ Active" : "Inactive"}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openDeleteFeeType(ft)}
                          className="flex items-center gap-1.5 text-xs bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 px-3 py-1.5 rounded-lg font-medium transition-colors"
                        >
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

      {/* ════════ FEE STRUCTURES TAB ════════ */}
      {tab === "structure" && (
        <div className="space-y-4">

          {/* Add structure form — admin only */}
          {isAdmin && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
              <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wider">Assign Fee to Class</h2>
              <div className="flex gap-3 flex-wrap items-end">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-medium">Class</label>
                  <select
                    value={stClassId}
                    onChange={(e) => setStClassId(e.target.value ? Number(e.target.value) : "")}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                  >
                    <option value="">Select class…</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-medium">Fee Type</label>
                  <select
                    value={stFeeTypeId}
                    onChange={(e) => setStFeeTypeId(e.target.value ? Number(e.target.value) : "")}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                  >
                    <option value="">Select fee type…</option>
                    {feeTypes.filter((f) => f.isActive).map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-medium">Amount (৳)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={stAmount}
                    onChange={(e) => setStAmount(e.target.value)}
                    className="w-36 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <button
                  onClick={handleUpsertStructure}
                  disabled={isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-5 py-2 rounded-lg font-medium disabled:opacity-50 transition-colors mb-0.5"
                >
                  Save
                </button>
              </div>
              {stError   && <p className="text-red-500 text-xs bg-red-50 p-2 rounded-lg">{stError}</p>}
              {stSuccess && <p className="text-emerald-600 text-xs">{stSuccess}</p>}
            </div>
          )}

          {/* Class filter chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 font-medium">Filter:</span>
            <button
              onClick={() => setSelectedClassId("")}
              className={`text-xs px-3 py-1 rounded-full transition-colors font-medium ${!selectedClassId ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              All ({structures.length})
            </button>
            {classes.map((c) => {
              const count = structures.filter((s) => s.classId === c.id).length;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedClassId(c.id)}
                  className={`text-xs px-3 py-1 rounded-full transition-colors font-medium ${selectedClassId === c.id ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                >
                  {c.name} ({count})
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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Class</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Fee Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                  {isAdmin && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredStructures.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 5 : 4} className="text-center py-12 text-gray-400">
                      <p className="text-2xl mb-2">📋</p>
                      <p className="text-sm">No fee structures configured{selectedClassId ? " for this class" : ""}.</p>
                    </td>
                  </tr>
                ) : filteredStructures.map((s, idx) => (
                  <tr
                    key={s.id}
                    className={`border-b border-gray-50 last:border-0 hover:bg-indigo-50/20 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}
                  >
                    <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-gray-800">{s.className}</span>
                      <span className="ml-1.5 text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Grade {s.gradeLevel}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{s.feeTypeName}</td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-indigo-700">৳{s.amount.toLocaleString()}</span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openDeleteStructure(s)}
                          className="flex items-center gap-1.5 text-xs bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 px-3 py-1.5 rounded-lg font-medium transition-colors"
                        >
                          ❌ Remove
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary footer */}
          {filteredStructures.length > 0 && (
            <div className="text-right text-sm text-gray-500">
              {filteredStructures.length} structure{filteredStructures.length !== 1 ? "s" : ""}
              {selectedClassId && ` · Total: ৳${filteredStructures.reduce((s, f) => s + f.amount, 0).toLocaleString()}`}
            </div>
          )}
        </div>
      )}

      {/* ════════ DELETE MODAL ════════ */}
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