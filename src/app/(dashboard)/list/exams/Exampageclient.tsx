"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import Image from "next/image";
import {
  Loader2, Plus, Pencil, Trash2, X,
  CheckSquare, Square, Search, BookOpen, Calendar, Filter,
} from "lucide-react";
import TableSearch from "@/components/TableSearch";
import Pagination from "@/components/Pagination";
import { createExamsBulk, deleteExamAction, getSubjectsForClass, updateExamAction, getAvailableSessions } from "@/Actions/ExamAction/Examactions";

// ── Types ─────────────────────────────────────────────────────────────────────

type ClassOption = { id: number; name: string; gradeLevel: number };

type ExamItem = {
  id: number;
  title: string;
  startTime: Date;
  endTime: Date;
  session?: string; // Add session field
  lesson: {
    subject: { name: string };
    teacher: { name: string; surname: string };
    class: { name: string };
  };
};

type Props = {
  exams: ExamItem[];
  count: number;
  page: number;
  role: string;
  classes: ClassOption[];
};

// ── Root ──────────────────────────────────────────────────────────────────────

export default function ExamPageClient({ exams: initialExams, count, page, role, classes }: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<ExamItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<ExamItem | null>(null);
  const [exams, setExams] = useState<ExamItem[]>(initialExams);
  const [selectedSession, setSelectedSession] = useState<string>("all");
  const [showFilter, setShowFilter] = useState(false);
  const [availableSessions, setAvailableSessions] = useState<string[]>([]);
  const router = useRouter();

  const canEdit = role === "admin" || role === "teacher";

  // Load available sessions from ClassSubjectTeacher
  useEffect(() => {
    const loadSessions = async () => {
      const sessions = await getAvailableSessions();
      setAvailableSessions(["all", ...sessions]);
    };
    loadSessions();
  }, []);

  // Filter exams by session (using exam's session or from startTime)
  const filteredExams = selectedSession === "all" 
    ? exams 
    : exams.filter(exam => {
        const examSession = exam.session || new Date(exam.startTime).getFullYear().toString();
        return examSession === selectedSession;
      });

  // Update exams when initialExams changes
  useEffect(() => {
    setExams(initialExams);
  }, [initialExams]);

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="hidden md:block text-lg font-semibold">All Exams</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-3 self-end">
            {/* Session Filter Button */}
            <button
              onClick={() => setShowFilter(!showFilter)}
              className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                showFilter 
                  ? "bg-blue-500 text-white" 
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filter</span>
            </button>

            {role === "admin" && (
              <button
                onClick={() => setCreateOpen(true)}
                className="flex items-center gap-2 bg-lamaYellow px-3 py-2 rounded-full text-sm font-medium hover:bg-yellow-300 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Create Exam</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Filter Section ── */}
      {showFilter && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Session (Academic Year):</span>
            </div>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {availableSessions.map((session) => (
                <option key={session} value={session}>
                  {session === "all" ? "All Sessions" : session}
                </option>
              ))}
            </select>
            
            {selectedSession !== "all" && (
              <button
                onClick={() => setSelectedSession("all")}
                className="text-xs text-red-500 hover:text-red-600"
              >
                Clear Filter
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Showing exams for academic year: {selectedSession === "all" ? "All" : selectedSession}
          </p>
        </div>
      )}

      {/* ── Table ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 text-xs uppercase">
              <th className="p-3">Exam Name</th>
              <th className="p-3">Subject</th>
              <th className="p-3">Class</th>
              <th className="p-3">Session (Academic Year)</th>
              <th className="p-3 hidden md:table-cell">Teacher</th>
              <th className="p-3 hidden md:table-cell">Date</th>
              {canEdit && <th className="p-3">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredExams.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">
                  {selectedSession !== "all" 
                    ? `No exams found for session ${selectedSession}`
                    : "No exams found"}
                </td>
              </tr>
            ) : (
              filteredExams.map((exam) => {
                const examSession = exam.session || new Date(exam.startTime).getFullYear().toString();
                const isCurrentSession = examSession === new Date().getFullYear().toString();
                
                return (
                  <tr
                    key={exam.id}
                    className="border-b border-gray-100 even:bg-slate-50 hover:bg-lamaPurpleLight transition-colors"
                  >
                    <td className="p-3 font-medium">{exam.title}</td>
                    <td className="p-3">{exam.lesson.subject.name}</td>
                    <td className="p-3">{exam.lesson.class.name}</td>
                    <td className="p-3">{exam.lesson.class.name}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        isCurrentSession
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                      }`}>
                        {examSession}
                      </span>
                    </td>
                    <td className="p-3 hidden md:table-cell text-gray-500">
                      {exam.lesson.teacher.name} {exam.lesson.teacher.surname}
                    </td>
                    <td className="p-3 hidden md:table-cell text-gray-500">
                      {new Intl.DateTimeFormat("en-US").format(new Date(exam.startTime))}
                    </td>
                    {canEdit && (
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditItem(exam)}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-lamaSky hover:bg-sky-200 transition-colors"
                            title="Edit"
                          >
                            <Image src="/edit.png" alt="edit" width={14} height={14} />
                          </button>
                          <button
                            onClick={() => setDeleteItem(exam)}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-lamaPurple hover:bg-purple-300 transition-colors"
                            title="Delete"
                          >
                            <Image src="/delete.png" alt="delete" width={14} height={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      <Pagination page={page} count={count} />

      {/* ── Modals ── */}
      {createOpen && (
        <Modal onClose={() => setCreateOpen(false)} title="Create a new exam" wide>
          <CreateExamModal
            classes={classes}
            onSuccess={() => {
              setCreateOpen(false);
              router.refresh();
            }}
          />
        </Modal>
      )}

      {editItem && (
        <Modal onClose={() => setEditItem(null)} title="Update the exam">
          <UpdateExamModal
            exam={editItem}
            onSuccess={() => {
              setEditItem(null);
              router.refresh();
            }}
          />
        </Modal>
      )}

      {deleteItem && (
        <Modal onClose={() => setDeleteItem(null)} title="Delete Exam">
          <DeleteExamModal
            exam={deleteItem}
            onSuccess={() => {
              setDeleteItem(null);
              router.refresh();
            }}
            onCancel={() => setDeleteItem(null)}
          />
        </Modal>
      )}
    </div>
  );
}

// ── Reusable Modal wrapper ────────────────────────────────────────────────────

function Modal({
  children,
  onClose,
  title,
  wide = false,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div
        className={`bg-white rounded-xl shadow-2xl relative w-full max-h-[90vh] overflow-y-auto ${
          wide ? "max-w-2xl" : "max-w-md"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ── CREATE modal with Session from ClassSubjectTeacher ─────────────────────────

function CreateExamModal({
  classes,
  onSuccess,
}: {
  classes: ClassOption[];
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [session, setSession] = useState(new Date().getFullYear().toString());
  const [availableSessions, setAvailableSessions] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    new Set(classes.map((c) => c.id))
  );
  const [submitting, setSubmitting] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);

  const allSelected = selectedIds.size === classes.length;

  // Load available sessions from ClassSubjectTeacher
  useEffect(() => {
    const loadSessions = async () => {
      setLoadingSessions(true);
      const sessions = await getAvailableSessions();
      setAvailableSessions(sessions.length > 0 ? sessions : [new Date().getFullYear().toString()]);
      if (sessions.length > 0) {
        setSession(sessions[0]);
      }
      setLoadingSessions(false);
    };
    loadSessions();
  }, []);

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(classes.map((c) => c.id)));
    }
  };

  const toggleOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("Exam title is required");
      return;
    }

    if (!startTime) {
      toast.error("Start date is required");
      return;
    }

    if (!endTime) {
      toast.error("End date is required");
      return;
    }

    if (new Date(endTime) <= new Date(startTime)) {
      toast.error("End date must be after start date");
      return;
    }

    if (selectedIds.size === 0) {
      toast.error("Select at least one class");
      return;
    }

    setSubmitting(true);

    try {
      const selectedClasses = classes.filter((c) => selectedIds.has(c.id));
      const classesWithSubjects = [];

      for (const cls of selectedClasses) {
        const subjects = await getSubjectsForClass(cls.id, session);

        if (!subjects.length) {
          toast.error(
            `No subjects assigned for class "${cls.name}" in session ${session}. Please assign subjects first.`
          );
          setSubmitting(false);
          return;
        }

        classesWithSubjects.push({
          classId: cls.id,
          gradeLevel: cls.gradeLevel,
          subjects,
        });
      }

      const result = await createExamsBulk({
        title: title.trim(),
        startTime,
        endTime,
        session,
        classes: classesWithSubjects,
      });

      if (result.success) {
        toast.success(
          `✅ ${result.created} exam(s) created across ${classesWithSubjects.length} class(es) for session ${session}!`
        );
        onSuccess();
      } else {
        toast.error(result.message || "Failed to create exams");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4">
        {/* Exam Title */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">
            Exam Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Mid-Term Exam 2024"
            className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              Start Date <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              End Date <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
        </div>

        {/* Session Selector - from ClassSubjectTeacher */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">
            Academic Session / Year <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            {loadingSessions ? (
              <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2.5 bg-gray-50">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                <span className="text-sm text-gray-400">Loading sessions...</span>
              </div>
            ) : (
              <select
                value={session}
                onChange={(e) => setSession(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 appearance-none bg-white"
              >
                {availableSessions.map((s) => (
                  <option key={s} value={s}>
                    {s} Academic Year
                  </option>
                ))}
              </select>
            )}
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          <p className="text-xs text-gray-400">
            Select academic year from Class Subject Teacher assignments
          </p>
        </div>
      </div>

      {/* Class selector */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Select Classes <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={toggleAll}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              allSelected
                ? "border-blue-500 bg-blue-500 text-white"
                : "border-blue-300 bg-blue-50 text-blue-600 hover:border-blue-500"
            }`}
          >
            {allSelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
            All Classes
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl max-h-48 overflow-y-auto">
          {classes.map((cls) => {
            const checked = selectedIds.has(cls.id);
            const primary = cls.gradeLevel <= 5;
            return (
              <button
                key={cls.id}
                type="button"
                onClick={() => toggleOne(cls.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all select-none ${
                  checked
                    ? "border-blue-400 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                {checked ? <CheckSquare className="h-4 w-4 flex-shrink-0 text-blue-500" /> : <Square className="h-4 w-4 flex-shrink-0 text-gray-300" />}
                <span className="truncate">{cls.name}</span>
                <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                  primary ? "bg-green-100 text-green-600" : "bg-purple-100 text-purple-600"
                }`}>
                  G{cls.gradeLevel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={handleCreate}
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
      >
        {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating exams...</> : <><BookOpen className="h-4 w-4" /> Create Exam</>}
      </button>
    </div>
  );
}

// ── UPDATE modal ──────────────────────────────────────────────────────────────

function UpdateExamModal({
  exam,
  onSuccess,
}: {
  exam: ExamItem;
  onSuccess: () => void;
}) {
  const fmt = (d: Date) => new Date(d).toISOString().slice(0, 16);
  const [title, setTitle] = useState(exam.title);
  const [startTime, setStart] = useState(fmt(exam.startTime));
  const [endTime, setEnd] = useState(fmt(exam.endTime));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    const res = await updateExamAction({ id: exam.id, title, startTime, endTime });
    if (res.success) {
      toast.success("Exam updated!");
      onSuccess();
    } else {
      toast.error("Failed to update exam");
    }
    setSaving(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 flex-wrap">
        <span className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-medium">
          {exam.lesson.subject.name}
        </span>
        <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">
          {exam.lesson.class.name}
        </span>
        <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
          {exam.lesson.teacher.name} {exam.lesson.teacher.surname}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">Exam Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Start Date</label>
          <input type="datetime-local" value={startTime} onChange={(e) => setStart(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">End Date</label>
          <input type="datetime-local" value={endTime} onChange={(e) => setEnd(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50">
        {saving && <Loader2 className="h-4 w-4 animate-spin" />} Update Exam
      </button>
    </div>
  );
}

// ── DELETE modal ──────────────────────────────────────────────────────────────

function DeleteExamModal({
  exam,
  onSuccess,
  onCancel,
}: {
  exam: ExamItem;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    const res = await deleteExamAction(exam.id);
    if (res.success) {
      toast.success("Exam deleted");
      onSuccess();
    } else {
      toast.error("Failed to delete exam");
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-gray-600 text-center">
        Are you sure you want to delete <span className="font-semibold text-gray-800">{exam.title}</span>?
        <br />
        <span className="text-xs text-gray-400">{exam.lesson.subject.name} · {exam.lesson.class.name}</span>
        <br />
        <span className="text-red-500 text-xs">All results linked to this exam will also be deleted.</span>
      </p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
        <button onClick={handleDelete} disabled={deleting} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors disabled:opacity-50">
          {deleting && <Loader2 className="h-4 w-4 animate-spin" />} Delete
        </button>
      </div>
    </div>
  );
}