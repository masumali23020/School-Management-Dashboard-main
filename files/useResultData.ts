import { useState, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
export type TeacherClass = {
  id: number;
  name: string;
  gradeId: number;
  grade: { level: number };
};

export type Subject = {
  id: number;
  name: string;
};

export type Student = {
  id: string;
  name: string;
  surname: string;
};

export type Assignment = {
  id: number;
  title: string;
  dueDate: Date;
} | null;

export type ExamSubject = {
  id: number;
  name: string;
  examId: number | null;
  examTitle: string | null;
  mcqMarks: number | null;
  writtenMarks: number | null;
  totalMarks: number;
};

export type ExistingResult = {
  studentId: string;
  score: number;
  mcqScore?: number | null;
  writtenScore?: number | null;
  totalScore?: number;
  examId?: number;
};

// ─── useTeacherClasses ────────────────────────────────────────────────────────
export function useTeacherClasses() {
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [teacher, setTeacher] = useState<{ id: string; name: string; surname: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/teacher/classes");
        if (!res.ok) throw new Error("Failed to load classes");
        const data = await res.json();
        setClasses(data.classes);
        setTeacher(data.teacher);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { classes, teacher, loading, error };
}

// ─── useSubjectsByClass ───────────────────────────────────────────────────────
export function useSubjectsByClass(classId: number | null) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!classId) { setSubjects([]); return; }
    setLoading(true);
    fetch(`/api/teacher/subjects?classId=${classId}`)
      .then((r) => r.json())
      .then((data) => setSubjects(data.subjects ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [classId]);

  return { subjects, loading };
}
