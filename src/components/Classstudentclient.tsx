"use client";

import { useState, useOptimistic, useTransition, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { assignRollNumbers, promoteStudents } from "@/Actions/ClassActions/ClassactionsWithRole";


// ─── Types ────────────────────────────────────────────────────────────────────

type StudentRow = {
  id: string;
  name: string;
  surname: string;
  img: string | null;
  phone: string | null;
  address: string;
  rollNumber: number | null;
};

type ClassInfo = {
  id: number;
  name: string;
  slug: string;
  capacity: number;
  gradeLevel: number;
  supervisor: string | null;
};

type ClassOption = { id: number; name: string; gradeLevel: number };

type Props = {
  data: {
    classInfo: ClassInfo;
    students: StudentRow[];
    historicalStudents: StudentRow[] | null;
    academicYear: string;
    allYears: string[];
    allClasses: ClassOption[];
    isAdmin: boolean;
  };
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ClassStudentClient({ data }: Props) {
  const {
    classInfo,
    students,
    historicalStudents,
    academicYear,
    allYears,
    allClasses,
    isAdmin,
  } = data;

  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isHistorical = !!historicalStudents;
  const displayStudents = historicalStudents ?? students;

  // ── Optimistic roll numbers ──────────────────────────────────────────────
  // Seed from server data
  const initialRolls: Record<string, number | null> = {};
  students.forEach((s) => { initialRolls[s.id] = s.rollNumber; });

 const [optimisticRolls, setOptimisticRolls] = useState(initialRolls);

  // Tracks edits not yet saved to DB
  const [dirtyRolls, setDirtyRolls] = useState<Record<string, number>>({});

  // Save status
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");

  // ── Promotion modal ──────────────────────────────────────────────────────
  const [showPromote, setShowPromote] = useState(false);
  const [targetClassId, setTargetClassId] = useState<number | null>(null);
  const [newAcademicYear, setNewAcademicYear] = useState(() => {
    const y = new Date().getFullYear();
    return `${y}-${y + 1}`;
  });
  const [promoteStatus, setPromoteStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [promoteMsg, setPromoteMsg] = useState("");

  // ── Roll input change → instant optimistic update ────────────────────────
  const handleRollChange = useCallback(
    (studentId: string, raw: string) => {
      const value = raw === "" ? null : parseInt(raw);
      if (value !== null && isNaN(value)) return;

      // Optimistically update UI immediately — no waiting for server
      startTransition(() => {
        setOptimisticRolls((prev) => ({ ...prev, [studentId]: value }));
      });

      // Track dirty for save button
      setDirtyRolls((prev) => {
        if (value === null) {
          const next = { ...prev };
          delete next[studentId];
          return next;
        }
        return { ...prev, [studentId]: value };
      });

      setSaveStatus("idle");
    },
    [setOptimisticRolls]
  );

  // ── Save to DB ───────────────────────────────────────────────────────────
  const handleSaveRolls = async () => {
    if (Object.keys(dirtyRolls).length === 0) return;

    // Client-side duplicate check
    const values = Object.values(dirtyRolls);
    if (new Set(values).size !== values.length) {
      setSaveStatus("error");
      setSaveError("Duplicate roll numbers — each must be unique.");
      return;
    }

    setSaveStatus("saving");

    const result = await assignRollNumbers({
      classId: classInfo.id,
      academicYear,
      rolls: Object.entries(dirtyRolls).map(([studentId, rollNumber]) => ({
        studentId,
        rollNumber,
      })),
    });

    if (result.success) {
      setDirtyRolls({});
      setSaveStatus("saved");
      // No router.refresh() — optimistic state is already correct
      setTimeout(() => setSaveStatus("idle"), 2500);
    } else {
      setSaveStatus("error");
      setSaveError(result.error ?? "Unknown error");
    }
  };

  // ── Year filter ──────────────────────────────────────────────────────────
  const handleYearFilter = (year: string) => {
    startTransition(() => {
      router.push(`/list/classes/${classInfo.slug}?academicYear=${year}`);
    });
  };

  // ── Promote ──────────────────────────────────────────────────────────────
  const handlePromote = async () => {
    if (!targetClassId) { setPromoteMsg("Please select a target class."); return; }
    setPromoteStatus("loading");
    const result = await promoteStudents({
      fromClassId: classInfo.id,
      toClassId: targetClassId,
      academicYear: newAcademicYear,
      studentIds: students.map((s) => s.id),
    });
    if (result.success) {
      setPromoteStatus("success");
      setPromoteMsg(`✅ ${result.count} students promoted!`);
      setTimeout(() => {
        setShowPromote(false);
        setPromoteStatus("idle");
        setPromoteMsg("");
        router.refresh();
      }, 1800);
    } else {
      setPromoteStatus("error");
      setPromoteMsg(result.error ?? "Promotion failed.");
    }
  };

  const isDirty = Object.keys(dirtyRolls).length > 0;
  const currentYear = new Date().getFullYear();
  const allYearsWithCurrent = (() => {
    const cur = `${currentYear}-${currentYear + 1}`;
    return allYears.includes(cur) ? allYears : [cur, ...allYears];
  })();

  return (
    <div className="bg-white p-4 rounded-xl flex-1 m-4 mt-0 space-y-4">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/list/classes" className="text-gray-400 hover:text-gray-600 text-sm transition-colors">
              ← Classes
            </Link>
            <span className="text-gray-300">/</span>
            <h1 className="text-xl font-bold text-gray-800">{classInfo.name}</h1>
            <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-semibold">
              Grade {classInfo.gradeLevel}
            </span>
            {isHistorical && (
              <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                Historical View
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Capacity: <strong>{classInfo.capacity}</strong>
            {classInfo.supervisor && <> · Supervisor: <strong>{classInfo.supervisor}</strong></>}
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Year filter */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
            <span className="text-xs">📅</span>
            <select
              value={academicYear}
              onChange={(e) => handleYearFilter(e.target.value)}
              disabled={isPending}
              className="text-sm bg-transparent focus:outline-none text-gray-700"
            >
              {allYearsWithCurrent.map((yr) => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>

          {isAdmin && !isHistorical && (
            <>
              <button
                onClick={handleSaveRolls}
                disabled={!isDirty || saveStatus === "saving"}
                className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium transition-all
                  ${isDirty
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
              >
                {saveStatus === "saving" ? (
                  <><span className="animate-spin inline-block">⏳</span> Saving…</>
                ) : (
                  <>💾 Save Rolls{isDirty ? ` (${Object.keys(dirtyRolls).length})` : ""}</>
                )}
              </button>

              <button
                onClick={() => setShowPromote(true)}
                className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm px-3 py-1.5 rounded-lg font-medium transition-colors"
              >
                🎓 Promote
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Status Banners ── */}
      {saveStatus === "saved" && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-2 rounded-lg">
          ✅ Roll numbers saved successfully!
        </div>
      )}
      {saveStatus === "error" && (
        <div className="flex items-center bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">
          ❌ {saveError}
          <button onClick={() => setSaveStatus("idle")} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}
      {isDirty && saveStatus === "idle" && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-2 rounded-lg">
          ✏️ {Object.keys(dirtyRolls).length} unsaved change{Object.keys(dirtyRolls).length > 1 ? "s" : ""} — click <strong>Save Rolls</strong> to persist.
        </div>
      )}
      {isHistorical && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-2 rounded-lg">
          📅 Showing <strong>{academicYear}</strong> — read-only historical view.
        </div>
      )}

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Students", value: displayStudents.length, color: "indigo" },
          { label: "Capacity", value: classInfo.capacity, color: "purple" },
          { label: "Available", value: Math.max(0, classInfo.capacity - displayStudents.length), color: "sky" },
        ].map(({ label, value, color }) => (
          <div key={label} className={`bg-${color}-50 rounded-xl p-3 text-center`}>
            <p className={`text-xs text-${color}-400 uppercase tracking-wider mb-1`}>{label}</p>
            <p className={`text-2xl font-bold text-${color}-700`}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Student Table ── */}
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {["Roll #", "Student Info", "Student ID", "Phone", "Address", ...(isAdmin && !isHistorical ? ["Actions"] : [])].map((h, i) => (
                <th
                  key={h}
                  className={`text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider
                    ${i === 2 ? "hidden md:table-cell" : ""}
                    ${i === 3 ? "hidden lg:table-cell" : ""}
                    ${i === 4 ? "hidden xl:table-cell" : ""}
                    ${i === 0 ? "w-24" : ""}
                  `}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayStudents.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-14 text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-3xl">🎒</span>
                    <span>No students found for this class and year.</span>
                  </div>
                </td>
              </tr>
            ) : (
              displayStudents.map((student, idx) => {
                const rollValue = isHistorical
                  ? student.rollNumber
                  : (optimisticRolls[student.id] ?? null);
                const isDirtyRow = dirtyRolls[student.id] !== undefined;

                return (
                  <tr
                    key={student.id}
                    className={`border-b border-gray-50 last:border-0 transition-colors
                      ${isDirtyRow ? "bg-amber-50/60" : idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"}
                      hover:bg-indigo-50/30`}
                  >
                    {/* Roll # */}
                    <td className="px-4 py-3">
                      {isAdmin && !isHistorical ? (
                        <div className="relative inline-block">
                          <input
                            type="number"
                            min={1}
                            value={rollValue ?? ""}
                            onChange={(e) => handleRollChange(student.id, e.target.value)}
                            placeholder="—"
                            className={`w-16 border rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 transition-colors
                              ${isDirtyRow
                                ? "border-amber-300 bg-amber-50 focus:ring-amber-300"
                                : "border-gray-200 bg-white focus:ring-indigo-300"
                              }`}
                          />
                          {/* Unsaved dot indicator */}
                          {isDirtyRow && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full" />
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm">
                          {rollValue ?? "—"}
                        </span>
                      )}
                    </td>

                    {/* Student Info */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-indigo-400 to-purple-500 flex-shrink-0">
                          {student.img ? (
                            <Image src={student.img} alt={student.name} fill className="object-cover" />
                          ) : (
                            <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">
                              {student.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-gray-800">{student.name} {student.surname}</p>
                      </div>
                    </td>

                    {/* Student ID */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="font-mono text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">
                        {student.id}
                      </span>
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-600">
                      {student.phone ?? <span className="text-gray-300">—</span>}
                    </td>

                    {/* Address */}
                    <td className="px-4 py-3 hidden xl:table-cell text-gray-600 max-w-[200px] truncate">
                      {student.address}
                    </td>

                    {/* Actions */}
                    {isAdmin && !isHistorical && (
                      <td className="px-4 py-3">
                        <Link
                          href={`/list/students/${student.id}`}
                          className="text-xs bg-sky-100 text-sky-600 hover:bg-sky-200 px-2 py-1 rounded-lg transition-colors"
                        >
                          View
                        </Link>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Promote Modal ── */}
      {showPromote && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowPromote(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-5 rounded-t-2xl">
              <h2 className="text-white text-xl font-bold">🎓 Promote Class</h2>
              <p className="text-emerald-100 text-sm mt-1">
                Move all {students.length} students to a new class
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Promote to Class</label>
                <select
                  value={targetClassId ?? ""}
                  onChange={(e) => setTargetClassId(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                >
                  <option value="">Select target class…</option>
                  {allClasses.filter((c) => c.id !== classInfo.id).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Grade {c.gradeLevel})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Academic Year</label>
                <input
                  type="text"
                  value={newAcademicYear}
                  onChange={(e) => setNewAcademicYear(e.target.value)}
                  placeholder="e.g. 2025-2026"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                ⚠️ Updates <strong>classId</strong> and <strong>gradeId</strong> for all{" "}
                {students.length} students. Roll numbers reset sequentially.
              </div>

              {promoteMsg && (
                <div className={`text-sm px-3 py-2 rounded-lg ${
                  promoteStatus === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                }`}>
                  {promoteMsg}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowPromote(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePromote}
                  disabled={promoteStatus === "loading"}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-medium text-sm"
                >
                  {promoteStatus === "loading" ? "Promoting…" : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}