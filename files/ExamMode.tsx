"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { toast } from "sonner";
import {
  getClassExamDataAction,
  saveExamResultsAction,
  type ExamMarkEntry,
} from "@/lib/actions/exam.actions";
import type { TeacherClass, ExamSubject, Student, ExistingResult } from "@/hooks/useResultData";

interface ExamModeProps {
  classes: TeacherClass[];
  selectedClassId: number | null;
  onClassChange: (id: number) => void;
}

type MarkState = {
  score?: string;       // primary
  mcqScore?: string;    // secondary
  writtenScore?: string; // secondary
};

const isPrimary = (level: number) => level >= 1 && level <= 5;
const isSecondary = (level: number) => level >= 6 && level <= 10;

const clamp = (val: string, max: number): string => {
  const n = Number(val);
  if (isNaN(n) || val === "") return val;
  return String(Math.min(max, Math.max(0, Math.floor(n))));
};

export function ExamMode({ classes, selectedClassId, onClassChange }: ExamModeProps) {
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  const [gradeLevel, setGradeLevel] = useState<number>(0);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<ExamSubject[]>([]);
  const [marks, setMarks] = useState<Map<string, MarkState>>(new Map());

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const prim = isPrimary(gradeLevel);
  const sec = isSecondary(gradeLevel);

  // ─── Load class data ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedClassId) {
      setStudents([]);
      setSubjects([]);
      setMarks(new Map());
      setGradeLevel(0);
      return;
    }

    setLoading(true);
    startTransition(async () => {
      const result = await getClassExamDataAction(selectedClassId);
      if (!result.success) {
        toast.error(result.error);
        setLoading(false);
        return;
      }

      const { gradeLevel, students, subjects, existingResults } = result.data;
      setGradeLevel(gradeLevel);
      setStudents(students);
      setSubjects(subjects);

      // Populate marks from existing results
      const newMap = new Map<string, MarkState>();
      for (const r of existingResults) {
        const key = `${r.studentId}_${r.examId}`;
        if (isPrimary(gradeLevel)) {
          newMap.set(key, { score: String(r.score) });
        } else {
          newMap.set(key, {
            mcqScore: r.mcqScore != null ? String(r.mcqScore) : "",
            writtenScore: r.writtenScore != null ? String(r.writtenScore) : "",
          });
        }
      }
      setMarks(newMap);
      setLoading(false);
    });
  }, [selectedClassId]);

  // ─── Mark setters ──────────────────────────────────────────────────────────
  const setMark = useCallback(
    (studentId: string, examId: number, field: keyof MarkState, value: string) => {
      const key = `${studentId}_${examId}`;
      const max = field === "mcqScore" ? 30 : field === "writtenScore" ? 60 : 100;
      const clamped = value === "" ? "" : clamp(value, max);
      setMarks((prev) => {
        const next = new Map(prev);
        next.set(key, { ...(next.get(key) ?? {}), [field]: clamped });
        return next;
      });
    },
    []
  );

  const getTotal = (studentId: string, examId: number): number | null => {
    const key = `${studentId}_${examId}`;
    const m = marks.get(key);
    if (!m) return null;
    if (prim) {
      const v = Number(m.score);
      return isNaN(v) || m.score === "" ? null : v;
    }
    const mcq = Number(m.mcqScore);
    const writ = Number(m.writtenScore);
    if (m.mcqScore === "" || m.writtenScore === "" || isNaN(mcq) || isNaN(writ)) return null;
    return mcq + writ;
  };

  // ─── Count filled ──────────────────────────────────────────────────────────
  const totalEntries = students.length * subjects.filter((s) => s.examId).length;
  const filledCount = students.reduce((acc, s) => {
    return (
      acc +
      subjects.filter((sub) => {
        if (!sub.examId) return false;
        const key = `${s.id}_${sub.examId}`;
        const m = marks.get(key);
        if (!m) return false;
        if (prim) return m.score !== "" && m.score !== undefined;
        return m.mcqScore !== "" && m.writtenScore !== "" && m.mcqScore !== undefined && m.writtenScore !== undefined;
      }).length
    );
  }, 0);

  // ─── Save ──────────────────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    if (!selectedClassId) return;

    const entries: ExamMarkEntry[] = [];

    for (const student of students) {
      for (const subject of subjects) {
        if (!subject.examId) continue;
        const key = `${student.id}_${subject.examId}`;
        const m = marks.get(key);
        if (!m) continue;

        const total = getTotal(student.id, subject.examId);
        if (total === null) continue;

        entries.push({
          studentId: student.id,
          examId: subject.examId,
          ...(prim ? { score: total } : { mcqScore: Number(m.mcqScore), writtenScore: Number(m.writtenScore) }),
          totalScore: total,
        });
      }
    }

    if (entries.length === 0) {
      toast.error("No complete entries to save");
      return;
    }

    startTransition(async () => {
      const result = await saveExamResultsAction(selectedClassId, entries);
      if (result.success) {
        toast.success(result.message ?? "Results saved!");
      } else {
        toast.error(result.error);
      }
    });
  }, [selectedClassId, students, subjects, marks, prim]);

  return (
    <div className="space-y-5">
      {/* ── Class Selector ── */}
      <div className="result-card">
        <p className="card-label">📊 Step 1 — Load Class Data</p>
        <div className="selector-row">
          <div className="field-wrap">
            <label className="field-label">Class</label>
            <select
              className="result-select"
              value={selectedClassId ?? ""}
              onChange={(e) => onClassChange(Number(e.target.value))}
            >
              <option value="">— Select Class —</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {selectedClass && gradeLevel > 0 && (
            <div className="badge-row" style={{ alignItems: "flex-end", paddingBottom: 4 }}>
              <span className={`badge ${prim ? "badge-blue" : "badge-purple"}`}>
                {prim ? "🏫 Primary (Gr. 1–5)" : "🏛️ Secondary (Gr. 6–10)"}
              </span>
              <span className="badge badge-green">{students.length} Students</span>
              <span className="badge badge-yellow">{subjects.length} Subjects</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Empty State ── */}
      {!selectedClassId && (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <p className="empty-title">Select a Class to Begin</p>
          <p className="empty-desc">Load students and subjects to enter exam results</p>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="empty-state">
          <span className="spin spin-lg" />
          <p className="empty-desc" style={{ marginTop: 12 }}>Loading class data…</p>
        </div>
      )}

      {/* ── Table ── */}
      {!loading && selectedClassId && students.length > 0 && (
        <>
          {prim && (
            <div className="alert-info">
              <span>ℹ️</span>
              <span><strong>Primary Level</strong> — Single mark per subject (Max: 100)</span>
            </div>
          )}
          {sec && (
            <div className="alert-info">
              <span>ℹ️</span>
              <span><strong>Secondary Level</strong> — MCQ (Max: 30) + Written (Max: 60) = Auto Total</span>
            </div>
          )}

          <div className="table-wrap">
            <table className="result-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 40 }}>#</th>
                  <th style={{ minWidth: 160 }}>Student</th>
                  {subjects.map((sub) => (
                    <th key={sub.id} className="text-center subject-th">
                      <span className="subject-th-name">{sub.name}</span>
                      {prim && <span className="max-label">Max: 100</span>}
                      {sec && (
                        <div className="badge-row" style={{ justifyContent: "center", marginTop: 4, gap: 3 }}>
                          <span className="badge badge-blue" style={{ fontSize: 9 }}>MCQ/30</span>
                          <span className="badge badge-purple" style={{ fontSize: 9 }}>Writ/60</span>
                          <span className="badge badge-green" style={{ fontSize: 9 }}>Total</span>
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((student, idx) => (
                  <tr key={student.id}>
                    <td className="row-num">{idx + 1}</td>
                    <td>
                      <p className="student-name">{student.name} {student.surname}</p>
                      <p className="student-id">ID: {student.id}</p>
                    </td>
                    {subjects.map((sub) => {
                      if (!sub.examId) {
                        return (
                          <td key={sub.id} className="text-center">
                            <span className="pending-label">No exam</span>
                          </td>
                        );
                      }
                      const key = `${student.id}_${sub.examId}`;
                      const m = marks.get(key) ?? {};
                      const total = getTotal(student.id, sub.examId);

                      return (
                        <td key={sub.id} className="text-center">
                          {prim ? (
                            <div className="input-cell">
                              <input
                                type="number"
                                className="mark-input"
                                min={0}
                                max={100}
                                value={m.score ?? ""}
                                onChange={(e) => setMark(student.id, sub.examId!, "score", e.target.value)}
                                placeholder="—"
                              />
                            </div>
                          ) : (
                            <div className="sec-input-row">
                              <div className="input-cell">
                                <input
                                  type="number"
                                  className="mark-input mark-input-sm"
                                  min={0}
                                  max={30}
                                  value={m.mcqScore ?? ""}
                                  onChange={(e) => setMark(student.id, sub.examId!, "mcqScore", e.target.value)}
                                  placeholder="MCQ"
                                  title="MCQ (max 30)"
                                />
                                <span className="max-label">MCQ/30</span>
                              </div>
                              <div className="input-cell">
                                <input
                                  type="number"
                                  className="mark-input mark-input-sm"
                                  min={0}
                                  max={60}
                                  value={m.writtenScore ?? ""}
                                  onChange={(e) => setMark(student.id, sub.examId!, "writtenScore", e.target.value)}
                                  placeholder="Writ"
                                  title="Written (max 60)"
                                />
                                <span className="max-label">Writ/60</span>
                              </div>
                              <div className="input-cell">
                                {total !== null ? (
                                  <span className="total-chip">{total}</span>
                                ) : (
                                  <span className="pending-label">—</span>
                                )}
                                <span className="max-label">Total</span>
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Actions Bar */}
          <div className="actions-bar">
            <div className="progress-wrap">
              <p className="fill-count">{filledCount} / {totalEntries} entries filled</p>
              {totalEntries > 0 && (
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${(filledCount / totalEntries) * 100}%` }}
                  />
                </div>
              )}
            </div>
            <div className="action-btns">
              <button
                className="btn-ghost"
                onClick={() => setMarks(new Map())}
                disabled={isPending}
              >
                ✕ Clear All
              </button>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={isPending || filledCount === 0}
              >
                {isPending ? <><span className="spin" /> Saving…</> : "💾 Bulk Save Results"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
