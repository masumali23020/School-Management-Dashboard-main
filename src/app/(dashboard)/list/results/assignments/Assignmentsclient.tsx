"use client";

import { useState, useTransition, useCallback } from "react";
import {
  getAssignmentsByClass,
  getStudentsWithAssignmentMark,
  saveAssignmentMark,
  bulkSaveAssignmentMarks,
  deleteAssignmentMark,
} from "../../../../../Actions/AnnousmentAction/Assignmet/Assignmentactions";

import { CheckCircle2, Circle, ChevronLeft, BookOpen, Users, Calendar, Loader2, Trash2, Save, PenLine, X, Check } from "lucide-react";
import { toast } from "react-toastify";

// ── Types ─────────────────────────────────────────────────────────────────────

type ClassOption = { id: number; name: string; gradeLevel: number };

type AssignmentRow = {
  id: number;
  title: string;
  startDate: Date;
  dueDate: Date;
  subjectName: string;
  teacherName: string;
  totalStudents: number;
  markedCount: number;
  isComplete: boolean;
};

type StudentMarkRow = {
  studentId: string;
  name: string;
  img: string | null;
  resultId: number | null;
  score: number | null;
};

// ── Month names ───────────────────────────────────────────────────────────────
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// ── Main Component ────────────────────────────────────────────────────────────

export default function AssignmentsClient({ classes }: { classes: ClassOption[] }) {
  const now = new Date();
  const [selectedClass, setSelectedClass] = useState<ClassOption | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear] = useState(now.getFullYear());
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentRow | null>(null);
  const [students, setStudents] = useState<StudentMarkRow[]>([]);
  const [loadingAssignments, startLoadAssignments] = useTransition();
  const [loadingStudents, startLoadStudents] = useTransition();

  // ── Load assignments when class or month changes ──────────────────────────
  const loadAssignments = useCallback(
    (cls: ClassOption, month: number) => {
      startLoadAssignments(async () => {
        const data = await getAssignmentsByClass(cls.id, month, selectedYear);
        setAssignments(data as AssignmentRow[]);
        setSelectedAssignment(null);
        setStudents([]);
      });
    },
    [selectedYear]
  );

  const handleClassSelect = (cls: ClassOption) => {
    setSelectedClass(cls);
    loadAssignments(cls, selectedMonth);
  };

  const handleMonthChange = (month: number) => {
    setSelectedMonth(month);
    if (selectedClass) loadAssignments(selectedClass, month);
  };

  // ── Load students when assignment is clicked ──────────────────────────────
  const handleAssignmentClick = (assignment: AssignmentRow) => {
    setSelectedAssignment(assignment);
    startLoadStudents(async () => {
      const data = await getStudentsWithAssignmentMark(selectedClass!.id, assignment.id);
      setStudents(data);
    });
  };

  // ── Refresh both lists after a mark change ────────────────────────────────
  const refresh = async () => {
    if (!selectedClass || !selectedAssignment) return;
    const [updatedStudents, updatedAssignments] = await Promise.all([
      getStudentsWithAssignmentMark(selectedClass.id, selectedAssignment.id),
      getAssignmentsByClass(selectedClass.id, selectedMonth, selectedYear),
    ]);
    setStudents(updatedStudents);
    setAssignments(updatedAssignments as AssignmentRow[]);
    // refresh isComplete on selected assignment
    const refreshed = (updatedAssignments as AssignmentRow[]).find(
      (a) => a.id === selectedAssignment.id
    );
    if (refreshed) setSelectedAssignment(refreshed);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Class selector ─────────────────────────────────────────────────── */}
      {!selectedClass ? (
        <ClassSelector classes={classes} onSelect={handleClassSelect} />
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          {/* Back / change class */}
          <button
            onClick={() => { setSelectedClass(null); setAssignments([]); setSelectedAssignment(null); }}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Change Class
          </button>

          {/* Selected class badge */}
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium">
            <Users className="h-3.5 w-3.5" />
            {selectedClass.name}
            <span className="text-blue-400 text-xs">(Grade {selectedClass.gradeLevel})</span>
          </div>

          {/* Month filter */}
          <div className="ml-auto flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <div className="flex gap-1 flex-wrap">
              {MONTHS.map((m, i) => (
                <button
                  key={m}
                  onClick={() => handleMonthChange(i + 1)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedMonth === i + 1
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Two-column layout: assignment list + mark entry ──────────────── */}
      {selectedClass && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left: Assignment list */}
          <AssignmentList
            assignments={assignments}
            loading={loadingAssignments}
            selectedId={selectedAssignment?.id ?? null}
            month={MONTHS[selectedMonth - 1]}
            year={selectedYear}
            onSelect={handleAssignmentClick}
          />

          {/* Right: Mark entry table */}
          {selectedAssignment && (
            <MarkEntryPanel
              assignment={selectedAssignment}
              students={students}
              loading={loadingStudents}
              onRefresh={refresh}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Class Selector Grid ───────────────────────────────────────────────────────

function ClassSelector({
  classes,
  onSelect,
}: {
  classes: ClassOption[];
  onSelect: (c: ClassOption) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-600 mb-3">Select a class to continue:</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {classes.map((cls) => (
          <button
            key={cls.id}
            onClick={() => onSelect(cls)}
            className="group flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-gray-100 bg-white hover:border-blue-300 hover:bg-blue-50 transition-all shadow-sm hover:shadow-md"
          >
            <div className="h-10 w-10 rounded-full bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center transition-colors">
              <BookOpen className="h-5 w-5 text-blue-600" />
            </div>
            <span className="font-semibold text-gray-800 text-sm">{cls.name}</span>
            <span className="text-xs text-gray-400">Grade {cls.gradeLevel}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Assignment List ───────────────────────────────────────────────────────────

function AssignmentList({
  assignments,
  loading,
  selectedId,
  month,
  year,
  onSelect,
}: {
  assignments: AssignmentRow[];
  loading: boolean;
  selectedId: number | null;
  month: string;
  year: number;
  onSelect: (a: AssignmentRow) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800 text-sm">
          Assignments — {month} {year}
        </h2>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          {assignments.length} found
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : assignments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <BookOpen className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm">No assignments this month</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {assignments.map((a) => (
            <button
              key={a.id}
              onClick={() => onSelect(a)}
              className={`w-full text-left px-4 py-3.5 transition-colors hover:bg-gray-50 ${
                selectedId === a.id ? "bg-blue-50 border-l-2 border-blue-500" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Complete indicator */}
                <div className="mt-0.5 flex-shrink-0">
                  {a.isComplete ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-300" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm truncate">{a.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                      {a.subjectName}
                    </span>
                    <span className="text-xs text-gray-400">
                      Due: {new Date(a.dueDate).toLocaleDateString("en-BD", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{a.teacherName}</p>
                </div>

                {/* Progress */}
                <div className="flex-shrink-0 text-right">
                  <span className={`text-xs font-semibold ${a.isComplete ? "text-green-600" : "text-orange-500"}`}>
                    {a.markedCount}/{a.totalStudents}
                  </span>
                  <div className="w-16 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${a.isComplete ? "bg-green-400" : "bg-orange-400"}`}
                      style={{ width: `${a.totalStudents > 0 ? (a.markedCount / a.totalStudents) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      
    </div>
  );
}

// ── Mark Entry Panel ──────────────────────────────────────────────────────────

function MarkEntryPanel({
  assignment,
  students,
  loading,
  onRefresh,
}: {
  assignment: AssignmentRow;
  students: StudentMarkRow[];
  loading: boolean;
  onRefresh: () => Promise<void>;
}) {
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useTransition ? [false, (fn: () => void) => fn()] : [false, (fn: () => void) => fn()];
  const [isBulkSaving, startBulkSave] = useTransition();

  const getScore = (s: StudentMarkRow) =>
    marks[s.studentId] !== undefined ? marks[s.studentId] : s.score !== null ? String(s.score) : "";

  const handleSingleSave = async (student: StudentMarkRow) => {
    const raw = getScore(student);
    if (raw === "") { toast.error("Enter a score first"); return; }
    const score = Number(raw);
    if (isNaN(score) || score < 0 || score > 100) { toast.error("Score must be 0–100"); return; }

    setSaving(student.studentId);
    try {
      await saveAssignmentMark({
        studentId: student.studentId,
        assignmentId: assignment.id,
        score,
        resultId: student.resultId,
      });
      toast.success(`Saved mark for ${student.name}`);
      setEditingId(null);
      setMarks((prev) => { const n = { ...prev }; delete n[student.studentId]; return n; });
      await onRefresh();
    } catch {
      toast.error("Failed to save mark");
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (student: StudentMarkRow) => {
    if (!student.resultId) return;
    setSaving(student.studentId);
    try {
      await deleteAssignmentMark(student.resultId);
      toast.success(`Removed mark for ${student.name}`);
      await onRefresh();
    } catch {
      toast.error("Failed to delete mark");
    } finally {
      setSaving(null);
    }
  };

  const handleBulkSave = () => {
    startBulkSave(async () => {
      const entries = students
        .map((s) => {
          const raw = getScore(s);
          if (raw === "") return null;
          const score = Number(raw);
          if (isNaN(score) || score < 0 || score > 100) return null;
          return { studentId: s.studentId, assignmentId: assignment.id, score, resultId: s.resultId };
        })
        .filter(Boolean) as any[];

      if (entries.length === 0) { toast.warning("No marks to save"); return; }

      try {
        await bulkSaveAssignmentMarks(entries);
        toast.success(`${entries.length} marks saved!`);
        setMarks({});
        await onRefresh();
      } catch {
        toast.error("Bulk save failed");
      }
    });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-semibold text-gray-800 text-sm truncate">{assignment.title}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                {assignment.subjectName}
              </span>
              {assignment.isComplete && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Complete
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleBulkSave}
            disabled={isBulkSaving}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60 flex-shrink-0"
          >
            {isBulkSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save All
          </button>
        </div>
      </div>

      {/* Student table */}
      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading students…
        </div>
      ) : (
        <div className="overflow-y-auto max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Student</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Mark /100</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {students.map((student, idx) => {
                const isEditing = editingId === student.studentId;
                const isSavingThis = saving === student.studentId;
                const scoreVal = getScore(student);
                const hasScore = student.score !== null;

                return (
                  <tr key={student.studentId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {student.name.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-800 text-xs">{student.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center">
                        {isEditing || !hasScore ? (
                          <input
                            type="number"
                            min={0}
                            max={100}
                            placeholder="0–100"
                            value={scoreVal}
                            autoFocus={isEditing}
                            onChange={(e) =>
                              setMarks((prev) => ({ ...prev, [student.studentId]: e.target.value }))
                            }
                            className="w-20 text-center border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                          />
                        ) : (
                          <span
                            className={`font-bold text-lg cursor-pointer ${
                              Number(scoreVal) >= 80
                                ? "text-green-600"
                                : Number(scoreVal) >= 50
                                ? "text-orange-500"
                                : "text-red-500"
                            }`}
                            onClick={() => setEditingId(student.studentId)}
                            title="Click to edit"
                          >
                            {scoreVal}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {isSavingThis ? (
                          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        ) : isEditing ? (
                          <>
                            <button
                              onClick={() => handleSingleSave(student)}
                              className="p-1.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 transition-colors"
                              title="Save"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => { setEditingId(null); setMarks((p) => { const n={...p}; delete n[student.studentId]; return n; }); }}
                              className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                              title="Cancel"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            {!hasScore && (
                              <button
                                onClick={() => handleSingleSave(student)}
                                className="p-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 transition-colors"
                                title="Save mark"
                              >
                                <Save className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {hasScore && (
                              <>
                                <button
                                  onClick={() => setEditingId(student.studentId)}
                                  className="p-1.5 rounded-lg bg-yellow-100 hover:bg-yellow-200 text-yellow-700 transition-colors"
                                  title="Edit mark"
                                >
                                  <PenLine className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(student)}
                                  className="p-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 transition-colors"
                                  title="Delete mark"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer summary */}
      {!loading && students.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {students.filter((s) => s.score !== null).length} of {students.length} marked
          </span>
          {assignment.isComplete && (
            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> All students marked
            </span>
          )}
        </div>
      )}
    </div>
  );
}