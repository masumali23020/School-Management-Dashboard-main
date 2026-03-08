"use client";

import { useState, useTransition, useCallback } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  getAssignmentAction,
  saveAssignmentMarksAction,
} from "@/lib/actions/assignment.actions";
import type { TeacherClass, Subject } from "@/hooks/useResultData";

// ─── Form schema ──────────────────────────────────────────────────────────────
const formSchema = z.object({
  marks: z.array(
    z.object({
      studentId: z.string(),
      studentName: z.string(),
      score: z
        .string()
        .min(1, "Required")
        .refine((v) => !isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 100, {
          message: "0–100",
        }),
    })
  ),
});

type FormValues = z.infer<typeof formSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────
interface AssignmentModeProps {
  classes: TeacherClass[];
  subjects: Subject[];
  selectedClassId: number | null;
  selectedSubjectId: number | null;
  onClassChange: (id: number) => void;
  onSubjectChange: (id: number) => void;
  subjectsLoading: boolean;
}

export function AssignmentMode({
  classes,
  subjects,
  selectedClassId,
  selectedSubjectId,
  onClassChange,
  onSubjectChange,
  subjectsLoading,
}: AssignmentModeProps) {
  const [isPending, startTransition] = useTransition();
  const [assignment, setAssignment] = useState<{
    id: number;
    title: string;
    dueDate: Date;
  } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: { marks: [] } });

  const { fields } = useFieldArray({ control, name: "marks" });

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  // ─── Load assignment + students ────────────────────────────────────────────
  const handleLoad = useCallback(() => {
    if (!selectedClassId || !selectedSubjectId) {
      toast.error("Please select both a class and subject");
      return;
    }

    startTransition(async () => {
      const result = await getAssignmentAction(selectedClassId, selectedSubjectId);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      const { assignment: found, students, existingResults } = result.data;

      if (!found) {
        setAssignment(null);
        setNotFound(true);
        setLoaded(false);
        reset({ marks: [] });
        return;
      }

      setAssignment(found);
      setNotFound(false);
      setLoaded(true);

      const existingMap = new Map(existingResults.map((r) => [r.studentId, r.score]));

      reset({
        marks: students.map((s) => ({
          studentId: s.id,
          studentName: `${s.name} ${s.surname}`,
          score: existingMap.has(s.id) ? String(existingMap.get(s.id)) : "",
        })),
      });
    });
  }, [selectedClassId, selectedSubjectId, reset]);

  // ─── Save marks ────────────────────────────────────────────────────────────
  const onSubmit = (values: FormValues) => {
    if (!assignment || !selectedClassId || !selectedSubjectId) return;

    startTransition(async () => {
      const result = await saveAssignmentMarksAction({
        classId: selectedClassId,
        subjectId: selectedSubjectId,
        teacherId: "", // filled server-side from Clerk
        assignmentId: assignment.id,
        marks: values.marks.map((m) => ({
          studentId: m.studentId,
          assignmentId: assignment.id,
          score: Number(m.score),
        })),
      });

      if (result.success) {
        toast.success(result.message ?? "Marks saved successfully");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-5">
      {/* ── Selector Card ── */}
      <div className="result-card">
        <p className="card-label">⚙️ Step 1 — Select Class & Subject</p>
        <div className="selector-row">
          <div className="field-wrap">
            <label className="field-label">Class</label>
            <select
              className="result-select"
              value={selectedClassId ?? ""}
              onChange={(e) => {
                onClassChange(Number(e.target.value));
                setLoaded(false);
                setNotFound(false);
                setAssignment(null);
              }}
            >
              <option value="">— Select Class —</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="field-wrap">
            <label className="field-label">Subject</label>
            <select
              className="result-select"
              value={selectedSubjectId ?? ""}
              onChange={(e) => {
                onSubjectChange(Number(e.target.value));
                setLoaded(false);
                setNotFound(false);
                setAssignment(null);
              }}
              disabled={!selectedClassId || subjectsLoading}
            >
              <option value="">— Select Subject —</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="field-wrap justify-end">
            <label className="field-label">&nbsp;</label>
            <button
              className="btn-primary"
              onClick={handleLoad}
              disabled={isPending || !selectedClassId || !selectedSubjectId}
            >
              {isPending ? <span className="spin" /> : "🔍"} Find Assignment
            </button>
          </div>
        </div>
      </div>

      {/* ── Not Found Banner ── */}
      {notFound && (
        <div className="alert-warn">
          <span className="alert-icon">⚠️</span>
          <div>
            <p className="alert-title">No Assignment Found</p>
            <p className="alert-desc">
              No assignment exists for <strong>{selectedClass?.name}</strong> –{" "}
              <strong>{selectedSubject?.name}</strong>. Create one first.
            </p>
          </div>
        </div>
      )}

      {/* ── Mark Entry Table ── */}
      {loaded && assignment && fields.length > 0 && (
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Header */}
          <div className="result-card" style={{ marginBottom: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottom: "none" }}>
            <div className="table-header-row">
              <p className="card-label" style={{ margin: 0 }}>📋 Step 2 — Enter Marks</p>
              <div className="badge-row">
                <span className="badge badge-green">✓ Assignment Found</span>
                <span className="badge badge-blue">{selectedClass?.name}</span>
                <span className="badge badge-purple">{selectedSubject?.name}</span>
              </div>
              <p className="assignment-title">📌 {assignment.title}</p>
            </div>
          </div>

          <div className="table-wrap rounded-t-none">
            <table className="result-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student Name</th>
                  <th>Subject</th>
                  <th className="text-center">Mark <span className="max-label">(Max 100)</span></th>
                  <th className="text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => (
                  <tr key={field.id}>
                    <td className="row-num">{index + 1}</td>
                    <td>
                      <p className="student-name">{field.studentName}</p>
                      <p className="student-id">ID: {field.studentId}</p>
                    </td>
                    <td>
                      <span className="badge badge-purple">{selectedSubject?.name}</span>
                    </td>
                    <td className="text-center">
                      <Controller
                        control={control}
                        name={`marks.${index}.score`}
                        render={({ field: f }) => (
                          <div className="input-cell">
                            <input
                              {...f}
                              type="number"
                              min={0}
                              max={100}
                              className={`mark-input ${errors.marks?.[index]?.score ? "input-error" : ""}`}
                              placeholder="—"
                            />
                            {errors.marks?.[index]?.score && (
                              <span className="error-msg">{errors.marks[index]?.score?.message}</span>
                            )}
                          </div>
                        )}
                      />
                    </td>
                    <td className="text-center">
                      {field.score !== "" ? (
                        <span className="badge badge-green">✓ Entered</span>
                      ) : (
                        <span className="pending-label">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="actions-bar">
            <p className="fill-count">
              {fields.filter((f) => f.score !== "").length} / {fields.length} marks entered
            </p>
            <button
              type="submit"
              className="btn-primary"
              disabled={isPending}
            >
              {isPending ? <><span className="spin" /> Saving…</> : "💾 Save All Marks"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
