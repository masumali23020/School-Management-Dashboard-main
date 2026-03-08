"use client";

import { useState, useTransition, useCallback } from "react";
import {
  getClassSubjectsWithExams,
  getStudentsWithAllSubjectMarks,
  saveOneExamMark,
  bulkSaveAllExamMarks,
  deleteOneExamMark,
  type SubjectWithExam,
  type StudentExamRow,
} from "../../../../../Actions/ExamAction/Examactions";

import {
  ChevronLeft, BookOpen, Users, Loader2,
  Trash2, Save, PenLine, X, Check, CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "react-toastify";

// ─────────────────────────────────────────────────────────────────────────────

type ClassOption = { id: number; name: string; gradeLevel: number };

const isPrimary = (level: number) => level <= 5;

// mark key: `${studentId}__${examId}__mcq|written|practical`
type LocalMarks = Record<string, string>;

// ─────────────────────────────────────────────────────────────────────────────

export default function ExamsClient({ classes }: { classes: ClassOption[] }) {
  const [selectedClass, setSelectedClass] = useState<ClassOption | null>(null);
  const [subjects, setSubjects] = useState<SubjectWithExam[]>([]);
  const [students, setStudents] = useState<StudentExamRow[]>([]);
  const [localMarks, setLocalMarks] = useState<LocalMarks>({});
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null);
  const [loading, startLoad] = useTransition();
  const [isBulkSaving, startBulkSave] = useTransition();

  // ── Load class data ─────────────────────────────────────────────────────────
  const loadClass = useCallback((cls: ClassOption) => {
    setSelectedClass(cls);
    setLocalMarks({});
    setEditingStudentId(null);
    startLoad(async () => {
      const subjectData = await getClassSubjectsWithExams(cls.id);
      setSubjects(subjectData);

      const examIds = subjectData
        .map((s) => s.examId)
        .filter((id): id is number => id !== null);

      if (examIds.length > 0) {
        const studentData = await getStudentsWithAllSubjectMarks(cls.id, examIds);
        setStudents(studentData);
      } else {
        setStudents([]);
      }
    });
  }, []);

  // ── Refresh after save ──────────────────────────────────────────────────────
  const refresh = useCallback(async (cls: ClassOption, subjectData: SubjectWithExam[]) => {
    const examIds = subjectData
      .map((s) => s.examId)
      .filter((id): id is number => id !== null);
    if (examIds.length === 0) return;
    const studentData = await getStudentsWithAllSubjectMarks(cls.id, examIds);
    setStudents(studentData);
  }, []);

  // ── Local mark helpers ──────────────────────────────────────────────────────
  const mkKey = (studentId: string, examId: number, field: string) =>
    `${studentId}__${examId}__${field}`;

  const getLocal = (studentId: string, examId: number, field: string) =>
    localMarks[mkKey(studentId, examId, field)];

  const setLocal = (studentId: string, examId: number, field: string, value: string) => {
    setLocalMarks((prev) => ({
      ...prev,
      [mkKey(studentId, examId, field)]: value,
    }));
  };

  // Resolve display value: local edit > saved DB value
  const getVal = (
    student: StudentExamRow,
    examId: number,
    field: "mcq" | "written" | "practical"
  ): string => {
    const local = getLocal(student.studentId, examId, field);
    if (local !== undefined) return local;
    const saved = student.marks[examId];
    if (!saved) return "";
    if (field === "mcq") return saved.mcqScore !== null ? String(saved.mcqScore) : "";
    if (field === "written") return saved.writtenScore !== null ? String(saved.writtenScore) : "";
    if (field === "practical") return saved.practicalScore !== null ? String(saved.practicalScore) : "";
    return "";
  };

  // Auto-calculate total for a student + subject
  const calcTotal = (
    student: StudentExamRow,
    subj: SubjectWithExam
  ): number | null => {
    if (!subj.examId) return null;
    const primary = isPrimary(selectedClass?.gradeLevel ?? 1);
    if (primary) {
      const w = getVal(student, subj.examId, "written");
      return w !== "" ? Number(w) : null;
    }
    const mcq = getVal(student, subj.examId, "mcq");
    const wr = getVal(student, subj.examId, "written");
    if (mcq === "" && wr === "") return null;
    const pr = getVal(student, subj.examId, "practical");
    return Number(mcq || 0) + Number(wr || 0) + Number(pr || 0);
  };

  // Build payload for one student + one subject
  const buildEntry = (student: StudentExamRow, subj: SubjectWithExam) => {
    if (!subj.examId) return null;
    const primary = isPrimary(selectedClass?.gradeLevel ?? 1);
    const wr = Number(getVal(student, subj.examId, "written") || 0);
    if (primary) {
      return {
        studentId: student.studentId,
        examId: subj.examId,
        mcqScore: null,
        writtenScore: wr,
        practicalScore: null,
        totalScore: wr,
        resultId: student.marks[subj.examId]?.resultId ?? null,
      };
    }
    const mcq = Number(getVal(student, subj.examId, "mcq") || 0);
    const pr = getVal(student, subj.examId, "practical");
    const prScore = pr !== "" ? Number(pr) : null;
    const total = mcq + wr + (prScore ?? 0);
    return {
      studentId: student.studentId,
      examId: subj.examId,
      mcqScore: mcq,
      writtenScore: wr,
      practicalScore: prScore,
      totalScore: total,
      resultId: student.marks[subj.examId]?.resultId ?? null,
    };
  };

  // ── Save one row (one student, all subjects) ────────────────────────────────
  const handleSaveRow = async (student: StudentExamRow) => {
    setSavingStudentId(student.studentId);
    try {
      const entries = subjects
        .map((subj) => buildEntry(student, subj))
        .filter(Boolean) as any[];

      if (entries.length === 0) { toast.warning("No marks entered"); return; }

      await bulkSaveAllExamMarks(entries);
      toast.success(`Saved marks for ${student.name}`);
      setEditingStudentId(null);
      // clear local edits for this student
      setLocalMarks((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          if (key.startsWith(student.studentId + "__")) delete next[key];
        }
        return next;
      });
      await refresh(selectedClass!, subjects);
    } catch {
      toast.error("Failed to save marks");
    } finally {
      setSavingStudentId(null);
    }
  };

  // ── Delete all marks for one student ───────────────────────────────────────
  const handleDeleteRow = async (student: StudentExamRow) => {
    setSavingStudentId(student.studentId);
    try {
      const resultIds = Object.values(student.marks)
        .map((m) => m.resultId)
        .filter((id): id is number => id !== null);

      await Promise.all(resultIds.map((id) => deleteOneExamMark(id)));
      toast.success(`Removed all marks for ${student.name}`);
      await refresh(selectedClass!, subjects);
    } catch {
      toast.error("Failed to delete marks");
    } finally {
      setSavingStudentId(null);
    }
  };

  // ── Bulk save ALL ───────────────────────────────────────────────────────────
  const handleBulkSave = () => {
    startBulkSave(async () => {
      const entries: any[] = [];
      for (const student of students) {
        for (const subj of subjects) {
          const entry = buildEntry(student, subj);
          if (!entry) continue;
          if (
            entry.writtenScore > 0 ||
            (entry.mcqScore !== null && entry.mcqScore > 0)
          ) {
            entries.push(entry);
          }
        }
      }
      if (entries.length === 0) { toast.warning("No marks to save"); return; }
      try {
        await bulkSaveAllExamMarks(entries);
        toast.success(`${entries.length} marks saved!`);
        setLocalMarks({});
        setEditingStudentId(null);
        await refresh(selectedClass!, subjects);
      } catch {
        toast.error("Bulk save failed");
      }
    });
  };

  // ── Check if all students are fully marked ─────────────────────────────────
  const subjectsWithExams = subjects.filter((s) => s.examId !== null);
  const allMarked =
    subjectsWithExams.length > 0 &&
    students.length > 0 &&
    students.every((student) =>
      subjectsWithExams.every(
        (subj) => student.marks[subj.examId!]?.resultId !== null
      )
    );

  const primary = isPrimary(selectedClass?.gradeLevel ?? 1);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!selectedClass) {
    return <ClassSelector classes={classes} onSelect={loadClass} />;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => { setSelectedClass(null); setSubjects([]); setStudents([]); }}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Change Class
        </button>

        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium">
          <Users className="h-3.5 w-3.5" />
          {selectedClass.name}
          <span className="text-blue-400 text-xs">(Grade {selectedClass.gradeLevel})</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${primary ? "bg-green-100 text-green-700" : "bg-purple-100 text-purple-700"}`}>
            {primary ? "Primary" : "Secondary"}
          </span>
        </div>

        {allMarked && (
          <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
            <CheckCircle2 className="h-4 w-4" /> All marks complete
          </span>
        )}

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
      </div>

      {/* No exams warning */}
      {!loading && subjectsWithExams.length === 0 && subjects.length > 0 && (
        <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          No exams have been created for subjects in this class yet. Please create exams first.
        </div>
      )}

      {/* Main grid table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading class data…
        </div>
      ) : subjectsWithExams.length > 0 && students.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                {/* Row 1: Subject names spanning their columns */}
                <tr className="bg-gray-50 border-b border-gray-200">
                  {/* Fixed columns */}
                  <th
                    rowSpan={2}
                    className="sticky left-0 z-20 bg-gray-50 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-r border-gray-200 min-w-[50px]"
                  >
                    #
                  </th>
                  <th
                    rowSpan={2}
                    className="sticky left-[50px] z-20 bg-gray-50 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-r border-gray-200 min-w-[160px]"
                  >
                    Student Name
                  </th>

                  {/* Subject headers */}
                  {subjectsWithExams.map((subj) => {
                    const cols = primary ? 2 : (subj.practicalMarks ? 4 : 3);
                    return (
                      <th
                        key={subj.subjectId}
                        colSpan={cols}
                        className="px-3 py-2.5 text-center text-xs font-bold text-gray-700 border-r border-gray-200 bg-indigo-50"
                      >
                        <div>{subj.subjectName}</div>
                        <div className="text-indigo-400 font-normal text-xs">/{subj.totalMarks}</div>
                      </th>
                    );
                  })}

                  {/* Actions header */}
                  <th
                    rowSpan={2}
                    className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[100px]"
                  >
                    Actions
                  </th>
                </tr>

                {/* Row 2: MCQ / Written / (Practical) / Total per subject */}
                <tr className="bg-gray-50 border-b border-gray-200">
                  {subjectsWithExams.map((subj) => (
                    primary ? (
                      <>
                        <th key={`${subj.subjectId}-wr`} className="px-3 py-2 text-center text-xs font-medium text-gray-500 border-r border-gray-100 min-w-[70px]">
                          Written
                          <div className="text-gray-400 font-normal">/{subj.writtenMarks}</div>
                        </th>
                        <th key={`${subj.subjectId}-tot`} className="px-3 py-2 text-center text-xs font-medium text-gray-500 border-r border-gray-200 min-w-[60px]">
                          Total
                        </th>
                      </>
                    ) : (
                      <>
                        <th key={`${subj.subjectId}-mcq`} className="px-3 py-2 text-center text-xs font-medium text-gray-500 border-r border-gray-100 min-w-[70px]">
                          MCQ
                          <div className="text-gray-400 font-normal">/{subj.mcqMarks ?? 30}</div>
                        </th>
                        <th key={`${subj.subjectId}-wr`} className="px-3 py-2 text-center text-xs font-medium text-gray-500 border-r border-gray-100 min-w-[70px]">
                          Written
                          <div className="text-gray-400 font-normal">/{subj.writtenMarks}</div>
                        </th>
                        {subj.practicalMarks && (
                          <th key={`${subj.subjectId}-pr`} className="px-3 py-2 text-center text-xs font-medium text-gray-500 border-r border-gray-100 min-w-[70px]">
                            Practical
                            <div className="text-gray-400 font-normal">/{subj.practicalMarks}</div>
                          </th>
                        )}
                        <th key={`${subj.subjectId}-tot`} className="px-3 py-2 text-center text-xs font-medium text-gray-500 border-r border-gray-200 min-w-[60px]">
                          Total
                        </th>
                      </>
                    )
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {students.map((student, idx) => {
                  const isEditing = editingStudentId === student.studentId;
                  const isSaving = savingStudentId === student.studentId;
                  const hasAnyResult = subjectsWithExams.some(
                    (s) => student.marks[s.examId!]?.resultId !== null
                  );

                  return (
                    <tr
                      key={student.studentId}
                      className={`transition-colors ${isEditing ? "bg-blue-50" : "hover:bg-gray-50"}`}
                    >
                      {/* # */}
                      <td className="sticky left-0 z-10 bg-inherit px-4 py-3 text-gray-400 text-xs border-r border-gray-100">
                        {idx + 1}
                      </td>

                      {/* Name */}
                      <td className="sticky left-[50px] z-10 bg-inherit px-4 py-3 border-r border-gray-100">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {student.name.charAt(0)}
                          </div>
                          <span className="font-medium text-gray-800 text-xs whitespace-nowrap">{student.name}</span>
                        </div>
                      </td>

                      {/* Per-subject mark cells */}
                      {subjectsWithExams.map((subj) => {
                        const examId = subj.examId!;
                        const total = calcTotal(student, subj);
                        const resultId = student.marks[examId]?.resultId;

                        return primary ? (
                          <>
                            {/* Written */}
                            <td key={`${subj.subjectId}-wr`} className="px-2 py-3 border-r border-gray-100">
                              <div className="flex justify-center">
                                {isEditing || !resultId ? (
                                  <MarkInput
                                    value={getVal(student, examId, "written")}
                                    max={subj.writtenMarks}
                                    onChange={(v) => setLocal(student.studentId, examId, "written", v)}
                                    autoFocus={isEditing}
                                  />
                                ) : (
                                  <ScoreChip value={Number(getVal(student, examId, "written"))} max={subj.writtenMarks} onClick={() => setEditingStudentId(student.studentId)} />
                                )}
                              </div>
                            </td>
                            {/* Total */}
                            <td key={`${subj.subjectId}-tot`} className="px-2 py-3 border-r border-gray-200">
                              <TotalChip value={total} />
                            </td>
                          </>
                        ) : (
                          <>
                            {/* MCQ */}
                            <td key={`${subj.subjectId}-mcq`} className="px-2 py-3 border-r border-gray-100">
                              <div className="flex justify-center">
                                {isEditing || !resultId ? (
                                  <MarkInput
                                    value={getVal(student, examId, "mcq")}
                                    max={subj.mcqMarks ?? 30}
                                    onChange={(v) => setLocal(student.studentId, examId, "mcq", v)}
                                    autoFocus={isEditing}
                                  />
                                ) : (
                                  <ScoreChip value={Number(getVal(student, examId, "mcq"))} max={subj.mcqMarks ?? 30} onClick={() => setEditingStudentId(student.studentId)} />
                                )}
                              </div>
                            </td>
                            {/* Written */}
                            <td key={`${subj.subjectId}-wr`} className="px-2 py-3 border-r border-gray-100">
                              <div className="flex justify-center">
                                {isEditing || !resultId ? (
                                  <MarkInput
                                    value={getVal(student, examId, "written")}
                                    max={subj.writtenMarks}
                                    onChange={(v) => setLocal(student.studentId, examId, "written", v)}
                                  />
                                ) : (
                                  <ScoreChip value={Number(getVal(student, examId, "written"))} max={subj.writtenMarks} onClick={() => setEditingStudentId(student.studentId)} />
                                )}
                              </div>
                            </td>
                            {/* Practical (optional) */}
                            {subj.practicalMarks && (
                              <td key={`${subj.subjectId}-pr`} className="px-2 py-3 border-r border-gray-100">
                                <div className="flex justify-center">
                                  {isEditing || !resultId ? (
                                    <MarkInput
                                      value={getVal(student, examId, "practical")}
                                      max={subj.practicalMarks}
                                      onChange={(v) => setLocal(student.studentId, examId, "practical", v)}
                                    />
                                  ) : (
                                    <ScoreChip value={Number(getVal(student, examId, "practical"))} max={subj.practicalMarks} onClick={() => setEditingStudentId(student.studentId)} />
                                  )}
                                </div>
                              </td>
                            )}
                            {/* Total */}
                            <td key={`${subj.subjectId}-tot`} className="px-2 py-3 border-r border-gray-200">
                              <TotalChip value={total} />
                            </td>
                          </>
                        );
                      })}

                      {/* Row actions */}
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                          ) : isEditing ? (
                            <>
                              <ActionBtn color="green" title="Save row" onClick={() => handleSaveRow(student)}>
                                <Check className="h-3.5 w-3.5" />
                              </ActionBtn>
                              <ActionBtn color="gray" title="Cancel" onClick={() => {
                                setEditingStudentId(null);
                                setLocalMarks((prev) => {
                                  const next = { ...prev };
                                  for (const k of Object.keys(next)) {
                                    if (k.startsWith(student.studentId + "__")) delete next[k];
                                  }
                                  return next;
                                });
                              }}>
                                <X className="h-3.5 w-3.5" />
                              </ActionBtn>
                            </>
                          ) : (
                            <>
                              <ActionBtn color="yellow" title="Edit all marks" onClick={() => setEditingStudentId(student.studentId)}>
                                <PenLine className="h-3.5 w-3.5" />
                              </ActionBtn>
                              {hasAnyResult && (
                                <ActionBtn color="red" title="Delete all marks" onClick={() => handleDeleteRow(student)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </ActionBtn>
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

          {/* Footer summary */}
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {students.length} students · {subjectsWithExams.length} subjects
            </span>
            {allMarked && (
              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> All students fully marked
              </span>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ── Class selector ────────────────────────────────────────────────────────────

function ClassSelector({ classes, onSelect }: { classes: ClassOption[]; onSelect: (c: ClassOption) => void }) {
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

// ── Reusable small components ─────────────────────────────────────────────────

function MarkInput({ value, max, onChange, autoFocus }: {
  value: string; max: number; onChange: (v: string) => void; autoFocus?: boolean;
}) {
  return (
    <input
      type="number"
      min={0}
      max={max}
      placeholder={`/${max}`}
      value={value}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)}
      className="w-16 text-center border border-blue-200 rounded-lg px-1 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
    />
  );
}

function ScoreChip({ value, max, onClick }: { value: number; max: number; onClick: () => void }) {
  const pct = (value / max) * 100;
  const color = isNaN(value) || value === 0
    ? "text-gray-300"
    : pct >= 80 ? "text-green-600 font-bold"
    : pct >= 50 ? "text-orange-500 font-bold"
    : "text-red-500 font-bold";

  return (
    <span onClick={onClick} title="Click to edit" className={`cursor-pointer select-none text-base ${color}`}>
      {isNaN(value) || value === 0 ? "—" : value}
    </span>
  );
}

function TotalChip({ value }: { value: number | null }) {
  return (
    <div className={`h-8 w-14 mx-auto rounded-lg flex items-center justify-center text-sm font-bold ${
      value !== null ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "bg-gray-50 text-gray-300 border border-gray-100"
    }`}>
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

function ActionBtn({ children, color, onClick, title }: {
  children: React.ReactNode;
  color: keyof typeof ACTION_COLORS;
  onClick: () => void;
  title: string;
}) {
  return (
    <button onClick={onClick} title={title} className={`p-1.5 rounded-lg transition-colors ${ACTION_COLORS[color]}`}>
      {children}
    </button>
  );
}