"use client";

import { useState, useEffect } from "react";
import { Search, BookOpen, GraduationCap, Loader2, AlertCircle, ChevronDown } from "lucide-react";
import {
  getAllClasses,
  getPublishedSessionsByClass,
  getPublishedExamsByClassAndSession,
  searchStudentResult,
  StudentResultData,
} from "@/Actions/ResultAction/resultSearchAction";
import { ResultSheet } from "@/components/Resultsheet";

type ClassItem = { id: number; name: string; grade: { level: number } };

export default function ResultSearchPage() {
  // ── Dropdown data ───────────────────────────────────────────────────────
  const [classes, setClasses]   = useState<ClassItem[]>([]);
  const [sessions, setSessions] = useState<string[]>([]);
  const [examTitles, setExamTitles] = useState<string[]>([]);

  // ── Form state ──────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    classId: "",
    roll:    "",
    session: "",
    exam:    "",
  });

  // ── UI state ────────────────────────────────────────────────────────────
  const [loading, setLoading]       = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingExams, setLoadingExams]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [result, setResult]         = useState<StudentResultData | null>(null);
  const [showSheet, setShowSheet]   = useState(false);

  // ── 1. Load all classes on mount ────────────────────────────────────────
  useEffect(() => {
    getAllClasses().then((data) => setClasses(data as ClassItem[]));
  }, []);

  // ── 2. When class changes → load sessions, reset session+exam ──────────
  useEffect(() => {
    if (!form.classId) {
      setSessions([]);
      setExamTitles([]);
      setForm((f) => ({ ...f, session: "", exam: "" }));
      return;
    }
    setLoadingSessions(true);
    setSessions([]);
    setExamTitles([]);
    setForm((f) => ({ ...f, session: "", exam: "" }));

    getPublishedSessionsByClass(Number(form.classId)).then((data) => {
      setSessions(data);
      setLoadingSessions(false);
    });
  }, [form.classId]);

  // ── 3. When session changes → load exam titles, reset exam ─────────────
  useEffect(() => {
    if (!form.classId || !form.session) {
      setExamTitles([]);
      setForm((f) => ({ ...f, exam: "" }));
      return;
    }
    setLoadingExams(true);
    setExamTitles([]);
    setForm((f) => ({ ...f, exam: "" }));

    getPublishedExamsByClassAndSession(
      Number(form.classId),
      form.session
    ).then((data) => {
      setExamTitles(data);
      setLoadingExams(false);
    });
  }, [form.session, form.classId]);

  // ── Search handler ──────────────────────────────────────────────────────
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.classId || !form.roll || !form.session || !form.exam) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    const res = await searchStudentResult({
      classId:   Number(form.classId),
      roll:      form.roll,
      session:   form.session,
      examTitle: form.exam,
    });

    setLoading(false);
    if (res.success && res.data) {
      setResult(res.data);
      setShowSheet(true);
    } else {
      setError(res.error ?? "Something went wrong.");
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f5f0e8] font-serif flex flex-col">

      {/* ── Header ── */}
      <div className="bg-[#1a3a5c] text-white py-6 px-4 text-center border-b-4 border-[#c8a84b]">
        <div className="flex justify-center mb-3">
          <div className="w-16 h-16 bg-[#c8a84b] rounded-full flex items-center justify-center">
            <GraduationCap className="w-8 h-8 text-[#1a3a5c]" />
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-wide uppercase">
          Student Result Portal
        </h1>
        <p className="text-[#c8a84b] text-sm mt-1 tracking-widest uppercase">
          Academic Result Management System
        </p>
      </div>

      {/* ── Form ── */}
      <div className="flex-1 flex items-start justify-center pt-16 px-4">
        <div className="w-full max-w-lg">
          <div className="bg-white border-2 border-[#1a3a5c] rounded-none shadow-lg">

            {/* Form header */}
            <div className="bg-[#1a3a5c] px-6 py-4 flex items-center gap-3">
              <Search className="w-5 h-5 text-[#c8a84b]" />
              <h2 className="text-white font-bold text-lg tracking-wide uppercase">
                Search Result
              </h2>
            </div>

            <form onSubmit={handleSearch} className="p-6 space-y-5">

              {/* ── Class ── */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#1a3a5c] mb-1.5">
                  Class / শ্রেণি
                </label>
                <div className="relative">
                  <select
                    value={form.classId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, classId: e.target.value }))
                    }
                    className="w-full appearance-none border-2 border-[#1a3a5c]/30 focus:border-[#1a3a5c] rounded-none px-3 py-2.5 text-sm bg-[#f9f7f2] outline-none transition-colors pr-8"
                  >
                    <option value="">— Select Class —</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        Class {c.name} (Grade {c.grade.level})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a3a5c]/40 pointer-events-none" />
                </div>
              </div>

              {/* ── Roll Number ── */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#1a3a5c] mb-1.5">
                  Roll Number / রোল নম্বর
                </label>
                <input
                  type="number"
                  value={form.roll}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, roll: e.target.value }))
                  }
                  placeholder="e.g. 1, 5, 12"
                  className="w-full border-2 border-[#1a3a5c]/30 focus:border-[#1a3a5c] rounded-none px-3 py-2.5 text-sm bg-[#f9f7f2] outline-none transition-colors"
                />
              </div>

              {/* ── Session — AUTO DROPDOWN ── */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#1a3a5c] mb-1.5">
                  Session / সেশন
                </label>
                <div className="relative">
                  <select
                    value={form.session}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, session: e.target.value }))
                    }
                    disabled={!form.classId || loadingSessions}
                    className="w-full appearance-none border-2 border-[#1a3a5c]/30 focus:border-[#1a3a5c] rounded-none px-3 py-2.5 text-sm bg-[#f9f7f2] outline-none transition-colors pr-8 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {loadingSessions
                        ? "Loading sessions..."
                        : !form.classId
                        ? "— Select class first —"
                        : sessions.length === 0
                        ? "— No published sessions —"
                        : "— Select Session —"}
                    </option>
                    {sessions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {loadingSessions ? (
                    <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a3a5c]/40 animate-spin" />
                  ) : (
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a3a5c]/40 pointer-events-none" />
                  )}
                </div>
                {form.classId && !loadingSessions && sessions.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    No published results for this class yet.
                  </p>
                )}
              </div>

              {/* ── Exam — AUTO DROPDOWN ── */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#1a3a5c] mb-1.5">
                  Exam / পরীক্ষা
                </label>
                <div className="relative">
                  <select
                    value={form.exam}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, exam: e.target.value }))
                    }
                    disabled={!form.session || loadingExams}
                    className="w-full appearance-none border-2 border-[#1a3a5c]/30 focus:border-[#1a3a5c] rounded-none px-3 py-2.5 text-sm bg-[#f9f7f2] outline-none transition-colors pr-8 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {loadingExams
                        ? "Loading exams..."
                        : !form.session
                        ? "— Select session first —"
                        : examTitles.length === 0
                        ? "— No published exams —"
                        : "— Select Exam —"}
                    </option>
                    {examTitles.map((title) => (
                      <option key={title} value={title}>
                        {title}
                      </option>
                    ))}
                  </select>
                  {loadingExams ? (
                    <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a3a5c]/40 animate-spin" />
                  ) : (
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a3a5c]/40 pointer-events-none" />
                  )}
                </div>
              </div>

              {/* ── Error ── */}
              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 p-3 text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* ── Submit ── */}
              <button
                type="submit"
                disabled={loading || !form.classId || !form.roll || !form.session || !form.exam}
                className="w-full bg-[#1a3a5c] hover:bg-[#0f2a47] disabled:bg-[#1a3a5c]/40 disabled:cursor-not-allowed text-white font-bold uppercase tracking-widest py-3 flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <BookOpen className="w-4 h-4" />
                )}
                {loading ? "Searching..." : "Get Result"}
              </button>

            </form>
          </div>

          <p className="text-center text-xs text-[#1a3a5c]/50 mt-4 tracking-wide">
            Results are available only after official publication by the administration.
          </p>
        </div>
      </div>

      {/* ── Result Sheet Modal ── */}
      {showSheet && result && (
        <ResultSheet
          data={result}
          onClose={() => setShowSheet(false)}
        />
      )}
    </div>
  );
}