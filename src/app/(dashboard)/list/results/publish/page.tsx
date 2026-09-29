"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getExamPublishStatus,
  getAssignmentPublishStatus,
  getResultPublishSessions,
  publishExamResult,
  unpublishExamResult,
  publishAssignmentResult,
  unpublishAssignmentResult,
  type PublishStatusItem,
} from "@/Actions/ResultAction/resultSearchAction";
import {
  AlertTriangle,
  BookOpen,
  Loader2,
  Lock,
  Unlock,
  Users,
  FileText,
  GraduationCap,
} from "lucide-react";
import { toast } from "react-toastify";
import { getAllClasses } from "@/Actions/ExamAction/resultExamAction";

type ClassItem = {
  id: number;
  name: string;
  grade: { level: number };
};

type TabType = "exam" | "assignment";

export default function AdminPublishPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [session, setSession] = useState("");
  const [sessions, setSessions] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("exam");
  const [items, setItems] = useState<PublishStatusItem[]>([]);
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Load classes
  useEffect(() => {
    getAllClasses().then((data) => setClasses(data as ClassItem[]));
  }, []);

  // Load sessions by class + tab (school-wise from server action)
  useEffect(() => {
    if (!selectedClassId) {
      setSessions([]);
      setSession("");
      return;
    }

    setIsLoadingSessions(true);
    setSession("");
    getResultPublishSessions(selectedClassId, activeTab)
      .then((data) => {
        setSessions(data);
        setSession(data[0] ?? "");
      })
      .finally(() => setIsLoadingSessions(false));
  }, [selectedClassId, activeTab]);

  // Load items when class, session, or tab changes
  useEffect(() => {
    if (!selectedClassId || !session) return;
    loadItems(selectedClassId, session, activeTab);
  }, [selectedClassId, session, activeTab]);

  async function loadItems(classId: number, sess: string, tab: TabType) {
    setIsLoadingItems(true);
    try {
      if (tab === "exam") {
        const data: PublishStatusItem[] = await getExamPublishStatus(classId, sess);
        setItems(data);
      } else {
        const data: PublishStatusItem[] = await getAssignmentPublishStatus(classId, sess);
        setItems(data);
      }
    } finally {
      setIsLoadingItems(false);
    }
  }

  const handlePublish = async (item: PublishStatusItem) => {
    const itemId = `${item.type}_${item.id}`;
    setLoadingItemId(itemId);
    startTransition(async () => {
      let res;
      if (item.type === "exam") {
        res = await publishExamResult(item.examId, item.classId, session);
      } else {
        res = await publishAssignmentResult(item.assignmentId, item.classId, session);
      }

      if (res.success) {
        toast.success(`${item.type === "exam" ? "Exam" : "Assignment"} result published!`);
        await loadItems(selectedClassId!, session, activeTab);
      } else {
        toast.error(res.error ?? "Failed to publish.");
      }
      setLoadingItemId(null);
    });
  };

  const handleUnpublish = async (item: PublishStatusItem) => {
    const itemId = `${item.type}_${item.id}`;
    setLoadingItemId(itemId);
    startTransition(async () => {
      let res;
      if (item.type === "exam") {
        res = await unpublishExamResult(item.examId, item.classId, session);
      } else {
        res = await unpublishAssignmentResult(item.assignmentId, item.classId, session);
      }

      if (res.success) {
        toast.success(`${item.type === "exam" ? "Exam" : "Assignment"} result unpublished.`);
        await loadItems(selectedClassId!, session, activeTab);
      } else {
        toast.error(res.error ?? "Failed to unpublish.");
      }
      setLoadingItemId(null);
    });
  };

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

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-white/5 rounded-xl border border-white/10 mb-8">
          {/* Class dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 uppercase tracking-widest">
              Class
            </label>
            <select
              value={selectedClassId ?? ""}
              onChange={(e) => {
                const id = Number(e.target.value);
                setSelectedClassId(id || null);
              }}
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400/50"
            >
              <option value="">— Select Class —</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#1a1a22]">
                  Class {c.name} — Grade {c.grade.level}
                </option>
              ))}
            </select>
          </div>

          {/* Session dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 uppercase tracking-widest">
              Session
            </label>
            <select
              value={session}
              onChange={(e) => setSession(e.target.value)}
              disabled={!selectedClassId || isLoadingSessions || sessions.length === 0}
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400/50"
            >
              <option value="">
                {isLoadingSessions
                  ? "Loading sessions..."
                  : sessions.length === 0
                  ? "No sessions found"
                  : "— Select Session —"}
              </option>
              {sessions.map((sess) => (
                <option key={sess} value={sess} className="bg-[#1a1a22]">
                  {sess}
                </option>
              ))}
            </select>
          </div>

          {/* Stats */}
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 uppercase tracking-widest">
              Stats
            </label>
            <div className="flex gap-6 pt-2">
              <div className="text-center">
                <p className="text-xl font-bold text-amber-400">
                  {isLoadingItems ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : items.filter((e) => e.isPublished).length}
                </p>
                <p className="text-xs text-zinc-500">Published</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-zinc-400">
                  {isLoadingItems ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : items.filter((e) => !e.isPublished).length}
                </p>
                <p className="text-xs text-zinc-500">Pending</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("exam")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === "exam"
                ? "bg-amber-500 text-black"
                : "bg-white/5 text-zinc-400 hover:bg-white/10"
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            Exams
          </button>
          <button
            onClick={() => setActiveTab("assignment")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === "assignment"
                ? "bg-amber-500 text-black"
                : "bg-white/5 text-zinc-400 hover:bg-white/10"
            }`}
          >
            <FileText className="w-4 h-4" />
            Assignments
          </button>
        </div>

        {/* Items List */}
        {(isLoadingItems || isLoadingSessions || isPending) ? (
          <div className="space-y-3 animate-pulse">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="p-5 rounded-xl border border-white/10 bg-white/5"
              >
                <div className="h-4 w-1/3 bg-white/10 rounded mb-3" />
                <div className="h-3 w-1/2 bg-white/10 rounded mb-4" />
                <div className="h-2 w-full bg-white/10 rounded" />
              </div>
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item) => {
              const isLoading = loadingItemId === `${item.type}_${item.id}`;
              const pct =
                item.totalStudents > 0
                  ? (item.resultCount / item.totalStudents) * 100
                  : 0;
              const allEntered = item.resultCount >= item.totalStudents;

              return (
                <div
                  key={`${item.type}_${item.id}`}
                  className={`p-5 rounded-xl border transition-all ${
                    item.isPublished
                      ? "bg-emerald-400/5 border-emerald-400/20"
                      : "bg-white/5 border-white/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Title + badge */}
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {item.type === "exam" ? (
                          <BookOpen className="w-4 h-4 text-zinc-400 shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                        )}
                        <span className="font-bold text-white">{item.title}</span>
                        {item.isPublished ? (
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
                        {item.subjectName} — {item.className}
                      </p>

                      {/* Progress */}
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Users className="w-3.5 h-3.5 text-zinc-500" />
                          <span
                            className={
                              allEntered ? "text-emerald-400" : "text-zinc-400"
                            }
                          >
                            {item.resultCount}/{item.totalStudents} marks entered
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
                      {!allEntered && !item.isPublished && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-400">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {item.totalStudents - item.resultCount} student(s)
                            still have no marks entered. ({item.resultCount}/
                            {item.totalStudents})
                          </span>
                        </div>
                      )}

                      {/* Published state (schema has no publishedAt) */}
                      {item.isPublished && (
                        <p className="text-xs text-emerald-400/60 mt-1">
                          Results are published for students.
                        </p>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 shrink-0">
                      {!item.isPublished ? (
                        <button
                          onClick={() => handlePublish(item)}
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
                          onClick={() => handleUnpublish(item)}
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
            {activeTab === "exam" ? (
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
            ) : (
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            )}
            <p>No {activeTab === "exam" ? "exams" : "assignments"} found for this class and session.</p>
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
            <li>• Each exam/assignment is published independently per class and session</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
