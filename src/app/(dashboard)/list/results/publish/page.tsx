"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getAllClasses,
  getExamPublishStatus,
  canPublishExam,
  publishExamResult,
  unpublishExamResult,
  ExamPublishStatusItem,
} from "@/Actions/ResultAction/resultSearchAction";
import {
  AlertTriangle,
  BookOpen,
  Loader2,
  Lock,
  Unlock,
  Users,
} from "lucide-react";
import { toast } from "react-toastify";


// ── Types ──────────────────────────────────────────────────────────────────
type ClassItem = {
  id: number;
  name: string;
  grade: { level: number };
};

// ── Auth (replace with your actual session) ────────────────────────────────
const ADMIN_ID = "admin-001";

// ══════════════════════════════════════════════════════════════════════════
export default function AdminPublishPage() {
  const [classes, setClasses]           = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [session, setSession]           = useState("2024");
  const [exams, setExams]               = useState<ExamPublishStatusItem[]>([]);
  const [loadingExamId, setLoadingExamId] = useState<number | null>(null);
  const [isPending, startTransition]    = useTransition();

  // ── Load classes once ────────────────────────────────────────────────────
  useEffect(() => {
    getAllClasses().then((data) => setClasses(data as ClassItem[]));
  }, []);

  // ── Load exams whenever class OR session changes ─────────────────────────
  useEffect(() => {
    if (!selectedClassId || !session) return;
    loadExams(selectedClassId, session);
  }, [selectedClassId, session]);

  // ── Helper: load + refresh exam list ────────────────────────────────────
  async function loadExams(classId: number, sess: string) {
    setExams([]);
    // ✅ pass BOTH classId (numeric DB id) AND session
    const data = await getExamPublishStatus(classId, sess);
    setExams(data);
  }

  // ── Publish ──────────────────────────────────────────────────────────────
  const handlePublish = (exam: ExamPublishStatusItem) => {
    setLoadingExamId(exam.examId);
    startTransition(async () => {
      // ✅ pass examId, classId (from exam object), adminId, session
      const res = await publishExamResult(
        exam.examId,
        exam.classId,   // ← comes from ExamPublishStatusItem — always correct
        ADMIN_ID,
        session
      );

      if (res.success) {
        toast.success("Result published! Students can now view it.");
        await loadExams(selectedClassId!, session);
      } else {
        toast.error(res.error ?? "Failed to publish.");
      }
      setLoadingExamId(null);
    });
  };

  // ── Unpublish ────────────────────────────────────────────────────────────
  const handleUnpublish = (exam: ExamPublishStatusItem) => {
    setLoadingExamId(exam.examId);
    startTransition(async () => {
      // ✅ pass examId, classId, session
      const res = await unpublishExamResult(exam.examId, exam.classId, session);

      if (res.success) {
        toast.success("Result unpublished.");
        await loadExams(selectedClassId!, session);
      } else {
        toast.error(res.error ?? "Failed to unpublish.");
      }
      setLoadingExamId(null);
    });
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0f0f13] text-white">
      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-10">
          <p className="text-xs tracking-[0.3em] uppercase text-amber-400 mb-2 font-semibold">
            Admin Panel
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Result Publication Control
          </h1>
          <p className="text-zinc-500 mt-1 text-sm">
            All marks must be entered before publishing. Students cannot view
            results until published.
          </p>
        </div>

        {/* ── Controls ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-white/5 rounded-xl border border-white/10 mb-8">

          {/* Class dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 uppercase tracking-widest">
              Class
            </label>
            <select
              value={selectedClassId ?? ""}
              onChange={(e) => {
                // ✅ Number(e.target.value) → correct numeric DB id
                const id = Number(e.target.value);
                setSelectedClassId(id || null);
              }}
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400/50"
            >
              <option value="">— Select Class —</option>
              {classes.map((c) => (
                // ✅ value={c.id} — always the DB numeric id
                <option key={c.id} value={c.id} className="bg-[#1a1a22]">
                  Class {c.name} — Grade {c.grade.level}
                </option>
              ))}
            </select>
          </div>

          {/* Session input */}
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 uppercase tracking-widest">
              Session
            </label>
            <input
              value={session}
              onChange={(e) => setSession(e.target.value)}
              placeholder="e.g. 2024"
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400/50"
            />
          </div>

          {/* Stats */}
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 uppercase tracking-widest">
              Stats
            </label>
            <div className="flex gap-6 pt-2">
              <div className="text-center">
                <p className="text-xl font-bold text-amber-400">
                  {exams.filter((e) => e.isPublished).length}
                </p>
                <p className="text-xs text-zinc-500">Published</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-zinc-400">
                  {exams.filter((e) => !e.isPublished).length}
                </p>
                <p className="text-xs text-zinc-500">Pending</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Exam list ── */}
        {exams.length > 0 ? (
          <div className="space-y-3">
            {exams.map((exam) => {
              const isLoading = loadingExamId === exam.examId;
              const pct =
                exam.totalStudents > 0
                  ? (exam.resultCount / exam.totalStudents) * 100
                  : 0;
              const allEntered = exam.resultCount >= exam.totalStudents;

              return (
                <div
                  key={exam.examId}
                  className={`p-5 rounded-xl border transition-all ${
                    exam.isPublished
                      ? "bg-emerald-400/5 border-emerald-400/20"
                      : "bg-white/5 border-white/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">

                      {/* Title + badge */}
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <BookOpen className="w-4 h-4 text-zinc-400 shrink-0" />
                        <span className="font-bold text-white">{exam.title}</span>
                        {exam.isPublished ? (
                          <span className="text-xs bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 px-2 py-0.5 rounded-full font-semibold">
                            ✓ PUBLISHED
                          </span>
                        ) : (
                          <span className="text-xs bg-zinc-400/10 text-zinc-400 border border-zinc-400/20 px-2 py-0.5 rounded-full">
                            UNPUBLISHED
                          </span>
                        )}
                      </div>

                      {/* Subject — Class */}
                      <p className="text-zinc-400 text-sm">
                        {exam.subjectName} — {exam.className}
                      </p>

                      {/* ✅ Progress: resultCount / totalStudents */}
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Users className="w-3.5 h-3.5 text-zinc-500" />
                          <span
                            className={
                              allEntered ? "text-emerald-400" : "text-zinc-400"
                            }
                          >
                            {exam.resultCount}/{exam.totalStudents} marks entered
                          </span>
                        </div>
                        <div className="flex-1 max-w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              allEntered ? "bg-emerald-400" : "bg-amber-400"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      {/* Warning if not all entered */}
                      {!allEntered && !exam.isPublished && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-400">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {exam.totalStudents - exam.resultCount} student(s)
                            still have no marks entered. ({exam.resultCount}/
                            {exam.totalStudents})
                          </span>
                        </div>
                      )}

                      {/* Published timestamp */}
                      {exam.isPublished && exam.publishedAt && (
                        <p className="text-xs text-emerald-400/60 mt-1">
                          Published on{" "}
                          {new Date(exam.publishedAt).toLocaleString("en-GB")}
                        </p>
                      )}
                    </div>

                    {/* ── Action buttons ── */}
                    <div className="flex gap-2 shrink-0">
                      {!exam.isPublished ? (
                        <button
                          onClick={() => handlePublish(exam)}
                          disabled={isLoading || !allEntered}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-white disabled:cursor-not-allowed text-sm font-semibold rounded-lg transition-colors"
                        >
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Unlock className="w-4 h-4" />
                          )}
                          Publish
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUnpublish(exam)}
                          disabled={isLoading}
                          className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-semibold rounded-lg transition-colors border border-red-500/20"
                        >
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Lock className="w-4 h-4" />
                          )}
                          Unpublish
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : selectedClassId ? (
          <div className="text-center py-16 text-zinc-600">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No exams found for this class and session.</p>
          </div>
        ) : (
          <div className="text-center py-16 text-zinc-600">
            <p>Select a class to manage result publication.</p>
          </div>
        )}

        {/* Rules */}
        <div className="mt-8 p-4 bg-amber-400/5 border border-amber-400/20 rounded-xl">
          <p className="text-xs text-amber-400 font-semibold uppercase tracking-widest mb-2">
            Publication Rules
          </p>
          <ul className="text-xs text-zinc-400 space-y-1">
            <li>• All students in the class must have marks entered before publishing</li>
            <li>• Once published, students can search and view their result</li>
            <li>• You can unpublish at any time to make corrections</li>
            <li>• Each exam is published independently per class and session</li>
          </ul>
        </div>

      </div>
    </div>
  );
}