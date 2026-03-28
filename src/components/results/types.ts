// components/results/types.ts
export interface Class {
  id: number;
  name: string;
  grade: { level: number } | null;
  _count: { students: number };
}

export interface Subject {
  id: number;
  name: string;
}

export interface Exam {
  id: number;
  title: string;
  startTime: Date;
  endTime: Date;
  totalMarks: number;
  mcqMarks: number | null;
  writtenMarks: number | null;
  practicalMarks: number | null;
  lesson: {
    subject: Subject;
    class: { name: string };
  } | null;
}

export interface Assignment {
  id: number;
  title: string;
  startDate: Date;
  dueDate: Date;
  lesson: {
    subject: Subject;
    class: { name: string };
  } | null;
}

export interface Student {
  id: string;
  rollNo: number | null;
  name: string;
  surname: string;
  class: {
    grade: {
      level: number;
    };
  };
}

export interface Result {
  id: number;
  score: number;
  mcqScore: number | null;
  writtenScore: number | null;
  practicalScore: number | null;
  totalScore: number;
  studentId: string;
  examId: number | null;
  assignmentId: number | null;
}

export interface ScoreState {
  total: number;
  mcq?: number;
  written?: number;
  practical?: number;
}

export interface MarkingScheme {
  type: 'single' | 'mcq_written' | 'mcq_written_practical';
  mcqMarks?: number;
  writtenMarks?: number;
  practicalMarks?: number;
  totalMarks: number;
}