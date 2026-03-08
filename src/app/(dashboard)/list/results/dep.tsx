// app/dashboard/results/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { GraduationCap } from "lucide-react";

import { ClassSelector } from "@/components/results/ClassSelector";
import { ExamSelector } from "@/components/results/ExamSelector";
import { AssignmentSelector } from "@/components/results/AssignmentSelector";
import { ExamMarksTable } from "@/components/results/ExamMarksTable";
import { AssignmentMarksTable } from "@/components/results/AssignmentMarksTable";
import type { 
  Class, Exam, Assignment, Student, Subject, Result, ScoreState 
} from "@/components/results/types";

import {
  getClasses,
  getExamsByClass,
  getAssignmentsByClass,
  getSubjectsByClass,
  getStudentsByClass,
  getResultsByExam,
  getResultsByAssignment,
  saveExamResult,
  saveAssignmentResult,
  deleteResult,
} from "@/app/actions/result-actions";
import { toast } from "react-toastify";

export default function ResultsPage() {
  // State
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"exam" | "assignment">("exam");
  
  // Exams
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>("");
  
  // Assignments
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<string>("");
  
  // Common
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [results, setResults] = useState<Record<string, Result>>({});
  const [scores, setScores] = useState<Record<string, ScoreState>>({});
  const [saveSuccess, setSaveSuccess] = useState<Record<string, boolean>>({});
  
  // Loading states
  const [loading, setLoading] = useState({
    classes: false,
    exams: false,
    assignments: false,
    students: false,
    saving: false
  });

  // Load classes on mount
  useEffect(() => {
    loadClasses();
  }, []);

  // Load exams/assignments when class changes
  useEffect(() => {
    if (selectedClass) {
      const classId = parseInt(selectedClass);
      if (activeTab === "exam") {
        loadExams(classId);
      } else {
        loadAssignments(classId);
      }
      loadSubjects(classId);
      loadStudents(classId);
    }
  }, [selectedClass, activeTab]);

  // Load results when exam or assignment changes
  useEffect(() => {
    if (activeTab === "exam" && selectedExam) {
      loadExamResults(parseInt(selectedExam));
    } else if (activeTab === "assignment" && selectedAssignment) {
      loadAssignmentResults(parseInt(selectedAssignment));
    }
  }, [selectedExam, selectedAssignment, activeTab]);

  // app/dashboard/results/page.tsx - update these functions

const handleSaveAssignment = async (studentId: string, score: number) => {
  setLoading(prev => ({ ...prev, saving: true }));
  
  try {
    const result = await saveAssignmentResult({
      studentId,
      assignmentId: parseInt(selectedAssignment),
      totalScore: score
    });

    if (result.success) {
      // Update local state immediately
      setResults(prev => ({
        ...prev,
        [studentId]: {
          id: result.data.id,
          score: score,
          totalScore: score,
          studentId: studentId,
          assignmentId: parseInt(selectedAssignment)
        } as Result
      }));

      setScores(prev => ({
        ...prev,
        [studentId]: {
          total: score
        }
      }));

      setSaveSuccess(prev => ({ ...prev, [studentId]: true }));
      setTimeout(() => {
        setSaveSuccess(prev => ({ ...prev, [studentId]: false }));
      }, 2000);

      return result; // Return for the table component
    } else {
      toast.error(result.error || "Failed to save");
      throw new Error(result.error);
    }
  } catch (error) {
    console.error("Save error:", error);
    throw error;
  } finally {
    setLoading(prev => ({ ...prev, saving: false }));
  }
};

const handleDelete = async (resultId: number) => {
  try {
    const result = await deleteResult(resultId);
    
    if (result.success) {
      // Find which student's result was deleted
      const studentId = Object.keys(results).find(
        key => results[key].id === resultId
      );
      
      if (studentId) {
        // Update local state
        setResults(prev => {
          const newResults = { ...prev };
          delete newResults[studentId];
          return newResults;
        });

        setScores(prev => {
          const newScores = { ...prev };
          delete newScores[studentId];
          return newScores;
        });
      }

      toast.success(result.message || "Result deleted successfully!");
      return result; // Return for the table component
    } else {
      toast.error(result.error || "Failed to delete");
      throw new Error(result.error);
    }
  } catch (error) {
    console.error("Delete error:", error);
    throw error;
  }
};

  // API Calls
  const loadClasses = async () => {
    setLoading(prev => ({ ...prev, classes: true }));
    const result = await getClasses();
    if (result.success) {
      setClasses(result.data);
    }
    setLoading(prev => ({ ...prev, classes: false }));
  };

  const loadExams = async (classId: number) => {
    setLoading(prev => ({ ...prev, exams: true }));
    const result = await getExamsByClass(classId);
    if (result.success) {
      setExams(result.data);
    }
    setLoading(prev => ({ ...prev, exams: false }));
  };

  const loadAssignments = async (classId: number) => {
    setLoading(prev => ({ ...prev, assignments: true }));
    const result = await getAssignmentsByClass(classId);
    if (result.success) {
      setAssignments(result.data);
    }
    setLoading(prev => ({ ...prev, assignments: false }));
  };

  const loadSubjects = async (classId: number) => {
    const result = await getSubjectsByClass(classId);
    if (result.success) {
      setSubjects(result.data);
    }
  };

  const loadStudents = async (classId: number) => {
    setLoading(prev => ({ ...prev, students: true }));
    const result = await getStudentsByClass(classId);
    if (result.success) {
      setStudents(result.data);
    }
    setLoading(prev => ({ ...prev, students: false }));
  };

  const loadExamResults = async (examId: number) => {
    const result = await getResultsByExam(examId);
    if (result.success) {
      const resultsMap: Record<string, Result> = {};
      const scoresMap: Record<string, ScoreState> = {};
      
      result.data.forEach((r: Result) => {
        resultsMap[r.studentId] = r;
        scoresMap[r.studentId] = {
          total: r.totalScore,
          mcq: r.mcqScore || undefined,
          written: r.writtenScore || undefined,
          practical: r.practicalScore || undefined
        };
      });
      
      setResults(resultsMap);
      setScores(scoresMap);
    }
  };

  const loadAssignmentResults = async (assignmentId: number) => {
    const result = await getResultsByAssignment(assignmentId);
    if (result.success) {
      const resultsMap: Record<string, Result> = {};
      const scoresMap: Record<string, ScoreState> = {};
      
      result.data.forEach((r: Result) => {
        resultsMap[r.studentId] = r;
        scoresMap[r.studentId] = {
          total: r.score
        };
      });
      
      setResults(resultsMap);
      setScores(scoresMap);
    }
  };

  // Event Handlers
  const handleExamScoreChange = (studentId: string, field: string, value: number | undefined) => {
    setScores(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
    
    // Clear success state when changes are made
    if (saveSuccess[studentId]) {
      setSaveSuccess(prev => ({ ...prev, [studentId]: false }));
    }
  };

  const handleAssignmentScoreChange = (studentId: string, value: number | undefined) => {
    setScores(prev => ({
      ...prev,
      [studentId]: {
        total: value
      }
    }));
    
    if (saveSuccess[studentId]) {
      setSaveSuccess(prev => ({ ...prev, [studentId]: false }));
    }
  };

  const handleSaveExam = async (studentId: string) => {
    const studentScores = scores[studentId];
    if (!studentScores) {
      toast.error("Please enter marks");
      return;
    }

    setLoading(prev => ({ ...prev, saving: true }));
    
    const totalScore = (studentScores.mcq || 0) + (studentScores.written || 0) + (studentScores.practical || 0);
    
    const result = await saveExamResult({
      studentId,
      examId: parseInt(selectedExam),
      totalScore,
      mcqScore: studentScores.mcq,
      writtenScore: studentScores.written,
      practicalScore: studentScores.practical
    });

    if (result.success) {
      setSaveSuccess(prev => ({ ...prev, [studentId]: true }));
      toast.success("Marks saved successfully!");
      setTimeout(() => {
        setSaveSuccess(prev => ({ ...prev, [studentId]: false }));
      }, 2000);
      loadExamResults(parseInt(selectedExam));
    } else {
      toast.error(result.error || "Failed to save");
    }
    
    setLoading(prev => ({ ...prev, saving: false }));
  };





  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl shadow-lg">
          <GraduationCap className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Result Management
          </h1>
          <p className="text-gray-500 text-lg">
            Manage student results for exams and assignments
          </p>
        </div>
      </div>

      {/* Class Selector */}
      <ClassSelector
        classes={classes}
        selectedClass={selectedClass}
        onSelect={setSelectedClass}
        loading={loading.classes}
      />

      {/* Main Content */}
      {selectedClass && (
        <div className="space-y-6">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "exam" | "assignment")}>
            <TabsList className="grid w-full md:w-96 grid-cols-2 h-12">
              <TabsTrigger value="exam" className="text-lg data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                📝 Exams
              </TabsTrigger>
              <TabsTrigger value="assignment" className="text-lg data-[state=active]:bg-green-600 data-[state=active]:text-white">
                📋 Assignments
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Exam Section */}
          {activeTab === "exam" && (
            <>
              <ExamSelector
                exams={exams}
                selectedExam={selectedExam}
                onSelect={setSelectedExam}
                loading={loading.exams}
              />
              
              {selectedExam && (
                <ExamMarksTable
                  students={students}
                  subjects={subjects}
                  exam={exams.find(e => e.id.toString() === selectedExam) || null}
                  scores={scores}
                  onScoreChange={handleExamScoreChange}
                  onSave={handleSaveExam}
                  onDelete={handleDelete}
                  results={results}
                  isSaving={loading.saving}
                  loading={loading.students}
                  saveSuccess={saveSuccess}
                />
              )}
            </>
          )}

          {/* Assignment Section */}
          {activeTab === "assignment" && (
            <>
              <AssignmentSelector
                assignments={assignments}
                selectedAssignment={selectedAssignment}
                onSelect={setSelectedAssignment}
                loading={loading.assignments}
              />
              
              {selectedAssignment && (
                <AssignmentMarksTable
                  students={students}
                  assignment={assignments.find(a => a.id.toString() === selectedAssignment) || null}
                  scores={scores}
                  onScoreChange={handleAssignmentScoreChange}
                  onSave={handleSaveAssignment}
                  onDelete={handleDelete}
                  results={results}
                  isSaving={loading.saving}
                  loading={loading.students}
                  saveSuccess={saveSuccess}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}