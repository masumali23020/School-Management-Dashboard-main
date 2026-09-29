"use client";

import { useState, useTransition, useCallback } from "react";
import {
  getClassSubjects,
  getStudentsWithOneSubjectMarks,
  bulkSaveAllExamMarks,
  deleteOneExamMark,
  type SubjectWithExam,
  type StudentExamRow,
} from "../../../../../Actions/ExamAction/deepsek";

import {
  ChevronLeft, BookOpen, Users, Loader2, GraduationCap,
  Trash2, Save, PenLine, X, Check, CheckCircle2,
  AlertCircle, ChevronRight,
} from "lucide-react";
import { toast } from "react-toastify";

type ClassOption = { id: number; name: string; gradeLevel: number };
type LocalMarks = Record<string, string>;
const SESSIONS = ["2024", "2025", "2026", "2027"];
const isPrimary = (level: number) => level <= 5;

// ── Step tracker: class → subject → marks ─────────────────────────────────────
type Step = "class" | "subject" | "marks";

export default function ExamsClient({ classes }: { classes: ClassOption[] }) {
  const now = new Date();
  const [step, setStep] = useState<Step>("class");
  const [selectedClass, setSelectedClass] = useState<ClassOption | null>(null);
  const [selectedSession, setSelectedSession] = useState(String(now.getFullYear()));
  const [subjects, setSubjects] = useState<SubjectWithExam[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<SubjectWithExam | null>(null);
  const [students, setStudents] = useState<StudentExamRow[]>([]);
  const [localMarks, setLocalMarks] = useState<LocalMarks>({});
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null);
  const [loadingSubjects, startLoadSubjects] = useTransition();
  const [loadingStudents, startLoadStudents] = useTransition();
  const [isBulkSaving, startBulkSave] = useTransition();

  const primary = isPrimary(selectedClass?.gradeLevel ?? 1);

  // ── Step 1: Class select → load subjects ─────────────────────────────────
  const handleClassSelect = (cls: ClassOption) => {
    setSelectedClass(cls);
    setLocalMarks({});
    setEditingStudentId(null);
    startLoadSubjects(async () => {
      const data = await getClassSubjects(cls.id, selectedSession);
      setSubjects(data);
      setStep("subject");
    });
  };

  // ── Session change → reload subjects ─────────────────────────────────────
  const handleSessionChange = (session: string) => {
    setSelectedSession(session);
    if (selectedClass) {
      startLoadSubjects(async () => {
        const data = await getClassSubjects(selectedClass.id, session);
        setSubjects(data);
        setSelectedSubject(null);
        setStudents([]);
        setStep("subject");
      });
    }
  };

  // ── Step 2: Subject click → load students ─────────────────────────────────
  const handleSubjectSelect = (subj: SubjectWithExam) => {
    if (!subj.examId) {
      toast.warning("No exam created for this subject yet");
      return;
    }
    setSelectedSubject(subj);
    setLocalMarks({});
    setEditingStudentId(null);
    startLoadStudents(async () => {
      const data = await getStudentsWithOneSubjectMarks(selectedClass!.id, subj.examId!);
      setStudents(data);
      setStep("marks");
    });
  };

  // ── Refresh ───────────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    if (!selectedClass || !selectedSubject?.examId) return;
    const data = await getStudentsWithOneSubjectMarks(selectedClass.id, selectedSubject.examId);
    setStudents(data);
  }, [selectedClass, selectedSubject]);

  // ── Mark helpers ──────────────────────────────────────────────────────────
  const mkKey = (studentId: string, field: string) => `${studentId}__${field}`;

  const getVal = (student: StudentExamRow, field: "mcq" | "written" | "practical"): string => {
    const local = localMarks[mkKey(student.studentId, field)];
    if (local !== undefined) return local;
    const examId = selectedSubject!.examId!;
    const saved = student.marks[examId];
    if (!saved) return "";
    if (field === "mcq") return saved.mcqScore !== null ? String(saved.mcqScore) : "";
    if (field === "written") return saved.writtenScore !== null ? String(saved.writtenScore) : "";
    if (field === "practical") return saved.practicalScore !== null ? String(saved.practicalScore) : "";
    return "";
  };

  const setLocal = (studentId: string, field: string, value: string) => {
    setLocalMarks((prev) => ({ ...prev, [mkKey(studentId, field)]: value }));
  };

  const calcTotal = (student: StudentExamRow): number | null => {
    if (primary) {
      const w = getVal(student, "written");
      return w !== "" ? Number(w) : null;
    }
    const mcq = getVal(student, "mcq");
    const wr = getVal(student, "written");
    if (mcq === "" && wr === "") return null;
    const pr = getVal(student, "practical");
    return Number(mcq || 0) + Number(wr || 0) + Number(pr || 0);
  };

  const buildEntry = (student: StudentExamRow) => {
    const examId = selectedSubject!.examId!;
    const wr = Number(getVal(student, "written") || 0);
    if (primary) {
      return {
        studentId: student.studentId,
        examId,
        mcqScore: null,
        writtenScore: wr,
        practicalScore: null,
        totalScore: wr,
        resultId: student.marks[examId]?.resultId ?? null,
      };
    }
    const mcq = Number(getVal(student, "mcq") || 0);
    const pr = getVal(student, "practical");
    const prScore = pr !== "" ? Number(pr) : null;
    return {
      studentId: student.studentId,
      examId,
      mcqScore: mcq,
      writtenScore: wr,
      practicalScore: prScore,
      totalScore: mcq + wr + (prScore ?? 0),
      resultId: student.marks[examId]?.resultId ?? null,
    };
  };

  // ── Save one row ──────────────────────────────────────────────────────────
  const handleSaveRow = async (student: StudentExamRow) => {
    setSavingStudentId(student.studentId);
    try {
      await bulkSaveAllExamMarks([buildEntry(student)]);
      toast.success(`Saved for ${student.name}`);
      setEditingStudentId(null);
      setLocalMarks((prev) => {
        const next = { ...prev };
        for (const k of Object.keys(next)) {
          if (k.startsWith(student.studentId + "__")) delete next[k];
        }
        return next;
      });
      await refresh();
    } catch { toast.error("Failed to save"); }
    finally { setSavingStudentId(null); }
  };

  // ── Delete one row ────────────────────────────────────────────────────────
  const handleDeleteRow = async (student: StudentExamRow) => {
    const examId = selectedSubject!.examId!;
    const resultId = student.marks[examId]?.resultId;
    if (!resultId) return;
    setSavingStudentId(student.studentId);
    try {
      await deleteOneExamMark(resultId);
      toast.success(`Removed mark for ${student.name}`);
      await refresh();
    } catch { toast.error("Failed to delete"); }
    finally { setSavingStudentId(null); }
  };

  // ── Bulk save all ─────────────────────────────────────────────────────────
  const handleBulkSave = () => {
    startBulkSave(async () => {
      const entries = students
        .map((s) => buildEntry(s))
        .filter((e) => e.writtenScore > 0 || (e.mcqScore !== null && e.mcqScore > 0));
      if (entries.length === 0) { toast.warning("No marks to save"); return; }
      try {
        await bulkSaveAllExamMarks(entries);
        toast.success(`${entries.length} marks saved!`);
        setLocalMarks({});
        setEditingStudentId(null);
        await refresh();
      } catch { toast.error("Bulk save failed"); }
    });
  };

  const markedCount = students.filter(
    (s) => s.marks[selectedSubject?.examId ?? 0]?.resultId !== null
  ).length;
  const allMarked = students.length > 0 && markedCount === students.length;

  // ── Render ────────────────────────────────────────────────────────────────

  // Step 1: Class selector
  if (step === "class") {
    return <ClassSelector classes={classes} onSelect={handleClassSelect} />;
  }

  return (
    <div className="space-y-4">

      {/* ── Toolbar / Breadcrumb ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm">
          <button
            onClick={() => { setStep("class"); setSelectedClass(null); setSubjects([]); setStudents([]); }}
            className="text-gray-400 hover:text-gray-700 transition-colors"
          >
            Classes
          </button>
          <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
          <button
            onClick={() => { setStep("subject"); setSelectedSubject(null); setStudents([]); }}
            className={step === "subject" ? "text-gray-800 font-medium" : "text-gray-400 hover:text-gray-700 transition-colors"}
          >
            {selectedClass?.name}
          </button>
          {step === "marks" && selectedSubject && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
              <span className="text-gray-800 font-medium">{selectedSubject.subjectName}</span>
            </>
          )}
        </div>

        {/* Class badge */}
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium">
          <Users className="h-3.5 w-3.5" />
          {selectedClass?.name}
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${primary ? "bg-green-100 text-green-700" : "bg-purple-100 text-purple-700"}`}>
            {primary ? "Primary" : "Secondary"}
          </span>
        </div>

        {/* Session selector */}
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-gray-400" />
          <div className="flex gap-1">
            {SESSIONS.map((s) => (
              <button
                key={s}
                onClick={() => handleSessionChange(s)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedSession === s
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* All marked badge */}
        {step === "marks" && allMarked && (
          <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
            <CheckCircle2 className="h-4 w-4" /> All marked
          </span>
        )}

        {/* Save All — only in marks step */}
        {step === "marks" && (
          <div className="ml-auto">
            <button
              onClick={handleBulkSave}
              disabled={isBulkSaving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-60 font-medium"
            >
              {isBulkSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save All
            </button>
          </div>
        )}
      </div>

      {/* ── Step 2: Subject grid ──────────────────────────────────────────── */}
      {step === "subject" && (
        loadingSubjects ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading subjects…
          </div>
        ) : subjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <BookOpen className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">No subjects found for session {selectedSession}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {subjects.map((subj) => {
              const hasExam = subj.examId !== null;
              return (
                <button
                  key={subj.subjectId}
                  onClick={() => handleSubjectSelect(subj)}
                  className={`group flex flex-col items-center justify-center gap-3 p-5 rounded-xl border-2 transition-all shadow-sm ${
                    hasExam
                      ? "border-gray-100 bg-white hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-md cursor-pointer"
                      : "border-dashed border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"
                  }`}
                >
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center transition-colors ${
                    hasExam ? "bg-indigo-100 group-hover:bg-indigo-200" : "bg-gray-100"
                  }`}>
                    <BookOpen className={`h-6 w-6 ${hasExam ? "text-indigo-600" : "text-gray-400"}`} />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-800 text-sm">{subj.subjectName}</p>
                    {hasExam ? (
                      <p className="text-xs text-indigo-500 mt-1">{subj.examTitle}</p>
                    ) : (
                      <p className="text-xs text-gray-400 mt-1">No exam yet</p>
                    )}
                  </div>
                  {hasExam && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                        /{subj.totalMarks}
                      </span>
                      {!primary && subj.mcqMarks && (
                        <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                          MCQ+Written
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )
      )}

      {/* ── Step 3: Mark entry table ──────────────────────────────────────── */}
      {step === "marks" && selectedSubject && (
        loadingStudents ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading students…
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Subject info header */}
            <div className="px-5 py-3 border-b border-gray-100 bg-indigo-50 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-indigo-800 text-sm">{selectedSubject.subjectName}</h2>
                <p className="text-xs text-indigo-500 mt-0.5">{selectedSubject.examTitle} · Total: {selectedSubject.totalMarks}</p>
              </div>
              <span className="text-xs text-indigo-600 bg-white border border-indigo-200 px-2.5 py-1 rounded-full font-medium">
                {markedCount}/{students.length} marked
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-10">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Student</th>
                    {!primary && (
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        MCQ <span className="font-normal text-gray-400">/{selectedSubject.mcqMarks ?? 30}</span>
                      </th>
                    )}
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Written <span className="font-normal text-gray-400">/{selectedSubject.writtenMarks}</span>
                    </th>
                    {!primary && selectedSubject.practicalMarks && (
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Practical <span className="font-normal text-gray-400">/{selectedSubject.practicalMarks}</span>
                      </th>
                    )}
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {students.map((student, idx) => {
                    const examId = selectedSubject.examId!;
                    const isEditing = editingStudentId === student.studentId;
                    const isSaving = savingStudentId === student.studentId;
                    const resultId = student.marks[examId]?.resultId;
                    const hasResult = !!resultId;
                    const total = calcTotal(student);

                    return (
                      <tr key={student.studentId} className={`transition-colors ${isEditing ? "bg-blue-50" : "hover:bg-gray-50"}`}>
                        <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {student.name.charAt(0)}
                            </div>
                            <span className="font-medium text-gray-800 text-xs">{student.name}</span>
                          </div>
                        </td>

                        {/* MCQ */}
                        {!primary && (
                          <td className="px-3 py-3">
                            <div className="flex justify-center">
                              {isEditing || !hasResult ? (
                                <MarkInput value={getVal(student, "mcq")} max={selectedSubject.mcqMarks ?? 30} onChange={(v) => setLocal(student.studentId, "mcq", v)} autoFocus={isEditing} />
                              ) : (
                                <ScoreChip value={Number(getVal(student, "mcq"))} max={selectedSubject.mcqMarks ?? 30} onClick={() => setEditingStudentId(student.studentId)} />
                              )}
                            </div>
                          </td>
                        )}

                        {/* Written */}
                        <td className="px-3 py-3">
                          <div className="flex justify-center">
                            {isEditing || !hasResult ? (
                              <MarkInput value={getVal(student, "written")} max={selectedSubject.writtenMarks} onChange={(v) => setLocal(student.studentId, "written", v)} autoFocus={primary && isEditing} />
                            ) : (
                              <ScoreChip value={Number(getVal(student, "written"))} max={selectedSubject.writtenMarks} onClick={() => setEditingStudentId(student.studentId)} />
                            )}
                          </div>
                        </td>

                        {/* Practical */}
                        {!primary && selectedSubject.practicalMarks && (
                          <td className="px-3 py-3">
                            <div className="flex justify-center">
                              {isEditing || !hasResult ? (
                                <MarkInput value={getVal(student, "practical")} max={selectedSubject.practicalMarks} onChange={(v) => setLocal(student.studentId, "practical", v)} />
                              ) : (
                                <ScoreChip value={Number(getVal(student, "practical"))} max={selectedSubject.practicalMarks} onClick={() => setEditingStudentId(student.studentId)} />
                              )}
                            </div>
                          </td>
                        )}

                        {/* Total */}
                        <td className="px-3 py-3">
                          <TotalChip value={total} />
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-center gap-1">
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                            ) : isEditing ? (
                              <>
                                <ActionBtn color="green" title="Save" onClick={() => handleSaveRow(student)}><Check className="h-3.5 w-3.5" /></ActionBtn>
                                <ActionBtn color="gray" title="Cancel" onClick={() => {
                                  setEditingStudentId(null);
                                  setLocalMarks((prev) => {
                                    const next = { ...prev };
                                    for (const k of Object.keys(next)) {
                                      if (k.startsWith(student.studentId + "__")) delete next[k];
                                    }
                                    return next;
                                  });
                                }}><X className="h-3.5 w-3.5" /></ActionBtn>
                              </>
                            ) : (
                              <>
                                <ActionBtn color="yellow" title="Edit" onClick={() => setEditingStudentId(student.studentId)}><PenLine className="h-3.5 w-3.5" /></ActionBtn>
                                {hasResult && (
                                  <ActionBtn color="red" title="Delete" onClick={() => handleDeleteRow(student)}><Trash2 className="h-3.5 w-3.5" /></ActionBtn>
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

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <span className="text-xs text-gray-500">{students.length} students</span>
              {allMarked && (
                <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> All students marked
                </span>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
}

// ── Reusable components (আগের মতোই) ──────────────────────────────────────────

function ClassSelector({ classes, onSelect }: { classes: ClassOption[]; onSelect: (c: ClassOption) => void }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-600 mb-3">Select a class to continue:</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {classes.map((cls) => (
          <button key={cls.id} onClick={() => onSelect(cls)}
            className="group flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-gray-100 bg-white hover:border-blue-300 hover:bg-blue-50 transition-all shadow-sm hover:shadow-md">
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

function MarkInput({ value, max, onChange, autoFocus }: { value: string; max: number; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <input type="number" min={0} max={max} placeholder={`/${max}`} value={value} autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)}
      className="w-16 text-center border border-blue-200 rounded-lg px-1 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white" />
  );
}

function ScoreChip({ value, max, onClick }: { value: number; max: number; onClick: () => void }) {
  const pct = (value / max) * 100;
  const color = isNaN(value) || value === 0 ? "text-gray-300"
    : pct >= 80 ? "text-green-600 font-bold"
    : pct >= 50 ? "text-orange-500 font-bold"
    : "text-red-500 font-bold";
  return <span onClick={onClick} title="Click to edit" className={`cursor-pointer select-none text-base ${color}`}>{isNaN(value) || value === 0 ? "—" : value}</span>;
}

function TotalChip({ value }: { value: number | null }) {
  return (
    <div className={`h-8 w-14 mx-auto rounded-lg flex items-center justify-center text-sm font-bold ${value !== null ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "bg-gray-50 text-gray-300 border border-gray-100"}`}>
      {value ?? "—"}
    </div>
  );
}

const ACTION_COLORS = {
  green: "bg-green-100 hover:bg-green-200 text-green-700",
  gray: "bg-gray-100 hover:bg-gray-200 text-gray-500",
  yellow: "bg-yellow-100 hover:bg-yellow-200 text-yellow-700",
  red: "bg-red-100 hover:bg-red-200 text-red-600",
  blue: "bg-blue-100 hover:bg-blue-200 text-blue-700",
};

function ActionBtn({ children, color, onClick, title }: { children: React.ReactNode; color: keyof typeof ACTION_COLORS; onClick: () => void; title: string }) {
  return <button onClick={onClick} title={title} className={`p-1.5 rounded-lg transition-colors ${ACTION_COLORS[color]}`}>{children}</button>;
}