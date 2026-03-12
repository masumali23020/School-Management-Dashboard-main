"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createFeeType, deleteClassFeeStructure, deleteFeeType, upsertClassFeeStructure } from "@/Actions/Feeactions/Feeactions";


type FeeType = { id: number; name: string; description: string | null; isActive: boolean };
type ClassItem = { id: number; name: string; gradeLevel: number };
type Structure = {
  id: number;
  classId: number;
  className: string;
  gradeLevel: number;
  feeTypeId: number;
  feeTypeName: string;
  amount: number;
};

type Props = {
  feeTypes: FeeType[];
  classes: ClassItem[];
  structures: Structure[];
};

export default function FeeStructureClient({ feeTypes, classes, structures }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Active tab
  const [tab, setTab] = useState<"types" | "structure">("structure");

  // Filter by class
  const [selectedClassId, setSelectedClassId] = useState<number | "">(
    classes[0]?.id ?? ""
  );

  // ── Fee Type form ────────────────────────────────────────────────────────
  const [ftName, setFtName] = useState("");
  const [ftDesc, setFtDesc] = useState("");
  const [ftError, setFtError] = useState("");
  const [ftSuccess, setFtSuccess] = useState("");

  // ── Structure form ───────────────────────────────────────────────────────
  const [stClassId, setStClassId] = useState<number | "">(classes[0]?.id ?? "");
  const [stFeeTypeId, setStFeeTypeId] = useState<number | "">("");
  const [stAmount, setStAmount] = useState("");
  const [stError, setStError] = useState("");
  const [stSuccess, setStSuccess] = useState("");

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
    } else {
      setFtError(res.error ?? "Failed.");
    }
  };

  // ── Delete Fee Type ──────────────────────────────────────────────────────
  const handleDeleteFeeType = async (id: number, name: string) => {
    if (!confirm(`Delete fee type "${name}"? This cannot be undone.`)) return;
    const res = await deleteFeeType(id);
    if (res.success) refresh();
    else alert(res.error);
  };

  // ── Upsert Structure ─────────────────────────────────────────────────────
  const handleUpsertStructure = async () => {
    if (!stClassId || !stFeeTypeId || !stAmount) {
      setStError("All fields are required."); return;
    }
    const amount = parseFloat(stAmount);
    if (isNaN(amount) || amount <= 0) { setStError("Enter a valid amount."); return; }
    setStError(""); setStSuccess("");
    const res = await upsertClassFeeStructure({
      classId: Number(stClassId),
      feeTypeId: Number(stFeeTypeId),
      amount,
    });
    if (res.success) {
      setStAmount(""); setStFeeTypeId("");
      setStSuccess("✅ Fee structure saved!");
      refresh();
      setTimeout(() => setStSuccess(""), 2500);
    } else {
      setStError(res.error ?? "Failed.");
    }
  };

  // ── Delete Structure ─────────────────────────────────────────────────────
  const handleDeleteStructure = async (id: number, label: string) => {
    if (!confirm(`Remove "${label}" from fee structure?`)) return;
    const res = await deleteClassFeeStructure(id);
    if (res.success) refresh();
    else alert(res.error);
  };

  return (
    <div className="bg-white p-4 rounded-xl flex-1 m-4 mt-0 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">💰 Fee Management</h1>
          <p className="text-sm text-gray-500">Define fee structures for each class</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-100">
        {(["structure", "types"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "structure" ? "📋 Class Fee Structures" : "🏷️ Fee Types"}
          </button>
        ))}
      </div>

      {/* ── Tab: Fee Types ── */}
      {tab === "types" && (
        <div className="space-y-4">
          {/* Create form */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wider">
              Create New Fee Type
            </h2>
            <div className="flex gap-3 flex-wrap">
              <input
                type="text"
                placeholder="Fee type name (e.g. Lab Fee)"
                value={ftName}
                onChange={(e) => setFtName(e.target.value)}
                className="flex-1 min-w-[200px] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={ftDesc}
                onChange={(e) => setFtDesc(e.target.value)}
                className="flex-1 min-w-[200px] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <button
                onClick={handleCreateFeeType}
                disabled={isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg font-medium disabled:opacity-50"
              >
                + Add
              </button>
            </div>
            {ftError && <p className="text-red-500 text-xs">{ftError}</p>}
            {ftSuccess && <p className="text-emerald-600 text-xs">{ftSuccess}</p>}
          </div>

          {/* Fee types table */}
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Description</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {feeTypes.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-10 text-gray-400">No fee types yet.</td></tr>
                ) : feeTypes.map((ft, idx) => (
                  <tr key={ft.id} className={`border-b border-gray-50 last:border-0 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}>
                    <td className="px-4 py-3 font-medium text-gray-800">{ft.name}</td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{ft.description ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ft.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                        {ft.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDeleteFeeType(ft.id, ft.name)}
                        className="text-xs bg-red-100 text-red-600 hover:bg-red-200 px-2 py-1 rounded-lg"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tab: Class Fee Structures ── */}
      {tab === "structure" && (
        <div className="space-y-4">
          {/* Add structure form */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wider">
              Assign Fee to Class
            </h2>
            <div className="flex gap-3 flex-wrap items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Class</label>
                <select
                  value={stClassId}
                  onChange={(e) => setStClassId(e.target.value ? Number(e.target.value) : "")}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                >
                  <option value="">Select class…</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Fee Type</label>
                <select
                  value={stFeeTypeId}
                  onChange={(e) => setStFeeTypeId(e.target.value ? Number(e.target.value) : "")}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                >
                  <option value="">Select fee type…</option>
                  {feeTypes.filter(f => f.isActive).map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Amount (৳)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={stAmount}
                  onChange={(e) => setStAmount(e.target.value)}
                  className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <button
                onClick={handleUpsertStructure}
                disabled={isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg font-medium disabled:opacity-50 mb-0.5"
              >
                Save
              </button>
            </div>
            {stError && <p className="text-red-500 text-xs">{stError}</p>}
            {stSuccess && <p className="text-emerald-600 text-xs">{stSuccess}</p>}
          </div>

          {/* Class filter */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-gray-500 font-medium">Filter by class:</span>
            <button
              onClick={() => setSelectedClassId("")}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${!selectedClassId ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              All
            </button>
            {classes.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedClassId(c.id)}
                className={`text-xs px-3 py-1 rounded-full transition-colors ${selectedClassId === c.id ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Structure table */}
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Class</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Fee Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStructures.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-10 text-gray-400">No fee structures configured.</td></tr>
                ) : filteredStructures.map((s, idx) => (
                  <tr key={s.id} className={`border-b border-gray-50 last:border-0 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-800">{s.className}</span>
                      <span className="ml-1 text-xs text-gray-400">(Grade {s.gradeLevel})</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{s.feeTypeName}</td>
                    <td className="px-4 py-3 font-semibold text-indigo-700">৳{s.amount.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDeleteStructure(s.id, `${s.feeTypeName} — ${s.className}`)}
                        className="text-xs bg-red-100 text-red-600 hover:bg-red-200 px-2 py-1 rounded-lg"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}