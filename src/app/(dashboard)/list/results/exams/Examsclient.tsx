"use client";

import { useState, useTransition, useCallback, useEffect } from "react";

import {
  ChevronLeft, BookOpen, Users, Loader2,
  Trash2, Save, PenLine, X, Check, CheckCircle2,
  AlertCircle, Filter,
} from "lucide-react";
import { toast } from "react-toastify";
import { getClassSubjectsWithExams, getStudentsWithAllSubjectMarks,
  saveOneExamMark,
  bulkSaveAllExamMarks,
  deleteOneExamMark,
  type SubjectWithExam,
  type StudentExamRow,
  getAvailableAcademicYears,
  getExamsByClassAndSession,
} from "@/Actions/ExamAction/resultExamAction";

type ClassOption = { id: number; name: string; gradeLevel: number };
type ExamOption = { id: number; title: string };

const isPrimary = (level: number) => level <= 5;
type LocalMarks = Record<string, string>;

export default function ExamsClient({ classes }: { classes: ClassOption[] }) {
  const [selectedClass, setSelectedClass] = useState<ClassOption | null>(null);
  const [subjects, setSubjects] = useState<SubjectWithExam[]>([]);
  const [students, setStudents] = useState<StudentExamRow[]>([]);
  const [localMarks, setLocalMarks] = useState<LocalMarks>({});
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null);
  const [loading, startLoad] = useTransition();
  const [isBulkSaving, startBulkSave] = useTransition();
  const [error, setError] = useState<string | null>(null);
  
  // ফিল্টার স্টেট
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [availableExams, setAvailableExams] = useState<ExamOption[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // ক্লাস সিলেক্ট করার সময় available years লোড করুন
  const loadAvailableYears = useCallback(async (cls: ClassOption) => {
    setLoadingFilters(true);
    try {
      const years = await getAvailableAcademicYears(cls.id);
      setAvailableYears(years);
      if (years.length > 0) {
        setSelectedYear(years[0]);
      } else {
        setSelectedYear("");
      }
    } catch (err) {
      console.error("Error loading years:", err);
    } finally {
      setLoadingFilters(false);
    }
  }, []);

  // বছর সিলেক্ট করার সময় available exams লোড করুন
  const loadAvailableExams = useCallback(async (clsId: number, year: string) => {
    if (!year) return;
    setLoadingFilters(true);
    try {
      const exams = await getExamsByClassAndSession(clsId, year);
      setAvailableExams(exams);
      if (exams.length > 0) {
        setSelectedExamId(exams[0].id);
      } else {
        setSelectedExamId(null);
      }
    } catch (err) {
      console.error("Error loading exams:", err);
    } finally {
      setLoadingFilters(false);
    }
  }, []);

  // ক্লাস সিলেক্ট হলে
  const handleClassSelect = async (cls: ClassOption) => {
    setSelectedClass(cls);
    setSelectedYear("");
    setSelectedExamId(null);
    setAvailableExams([]);
    await loadAvailableYears(cls);
  };

  // বছর পরিবর্তন হলে
  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    if (selectedClass) {
      loadAvailableExams(selectedClass.id, year);
    }
  };

  // এক্সাম পরিবর্তন হলে ক্লাস ডাটা লোড করুন
  const loadClassData = useCallback(async () => {
    if (!selectedClass || !selectedYear || !selectedExamId) {
      console.log("Missing required data:", { selectedClass, selectedYear, selectedExamId });
      return;
    }

    console.log("Loading class data for:", {
      classId: selectedClass.id,
      year: selectedYear,
      examId: selectedExamId
    });
    
    setLocalMarks({});
    setEditingStudentId(null);
    setError(null);
    
    startLoad(async () => {
      try {
        // শুধু সিলেক্ট করা এক্সামের জন্য সাবজেক্ট লোড করুন
        const subjectData = await getClassSubjectsWithExams(selectedClass.id, selectedYear, selectedExamId);
        console.log("Subjects received:", subjectData);
        setSubjects(subjectData);

        const examIds = subjectData
          .map((s) => s.examId)
          .filter((id): id is number => id !== null);
        
        console.log("Exam IDs found:", examIds);

        if (examIds.length > 0) {
          const studentData = await getStudentsWithAllSubjectMarks(selectedClass.id, examIds);
          console.log("Students received:", studentData);
          setStudents(studentData);
        } else {
          setStudents([]);
          setError("No exams have been created for this class yet.");
        }
      } catch (err) {
        console.error("Error loading class data:", err);
        setError("Failed to load class data. Please try again.");
      }
    });
  }, [selectedClass, selectedYear, selectedExamId]);

  // ফিল্টার পরিবর্তন হলে ডাটা রিলোড
  useEffect(() => {
    if (selectedClass && selectedYear && selectedExamId) {
      loadClassData();
    }
  }, [selectedClass, selectedYear, selectedExamId, loadClassData]);

  // Refresh after save
  const refresh = useCallback(async () => {
    if (selectedClass && selectedYear && selectedExamId) {
      const subjectData = await getClassSubjectsWithExams(selectedClass.id, selectedYear, selectedExamId);
      const examIds = subjectData
        .map((s) => s.examId)
        .filter((id): id is number => id !== null);
      if (examIds.length > 0) {
        const studentData = await getStudentsWithAllSubjectMarks(selectedClass.id, examIds);
        setStudents(studentData);
      }
    }
  }, [selectedClass, selectedYear, selectedExamId]);

  // Local mark helpers
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
      setLocalMarks((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          if (key.startsWith(student.studentId + "__")) delete next[key];
        }
        return next;
      });
      await refresh();
    } catch {
      toast.error("Failed to save marks");
    } finally {
      setSavingStudentId(null);
    }
  };

  const handleDeleteRow = async (student: StudentExamRow) => {
    setSavingStudentId(student.studentId);
    try {
      const resultIds = Object.values(student.marks)
        .map((m) => m.resultId)
        .filter((id): id is number => id !== null);

      await Promise.all(resultIds.map((id) => deleteOneExamMark(id)));
      toast.success(`Removed all marks for ${student.name}`);
      await refresh();
    } catch {
      toast.error("Failed to delete marks");
    } finally {
      setSavingStudentId(null);
    }
  };

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
        await refresh();
      } catch {
        toast.error("Bulk save failed");
      }
    });
  };

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

  // Class Selector View
  if (!selectedClass) {
    return <ClassSelector classes={classes} onSelect={handleClassSelect} />;
  }

  // Loading filters view
  if (loadingFilters) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading filters...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => { 
            setSelectedClass(null); 
            setSubjects([]); 
            setStudents([]);
            setAvailableYears([]);
            setAvailableExams([]);
            setSelectedYear("");
            setSelectedExamId(null);
          }}
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

        {/* Filter Toggle Button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
            showFilters ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <Filter className="h-3.5 w-3.5" />
          Filters
        </button>

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

      {/* Filter Section */}
      {showFilters && (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Filter Exams</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Session/Year Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Academic Year / Session</label>
              <select
                value={selectedYear}
                onChange={(e) => handleYearChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                disabled={availableYears.length === 0}
              >
                <option value="">Select Session</option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {/* Exam Title Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Exam Title</label>
              <select
                value={selectedExamId || ""}
                onChange={(e) => setSelectedExamId(e.target.value ? Number(e.target.value) : null)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                disabled={!selectedYear || availableExams.length === 0}
              >
                <option value="">Select Exam</option>
                {availableExams.map((exam) => (
                  <option key={exam.id} value={exam.id}>{exam.title}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* No data message */}
          {selectedYear && availableExams.length === 0 && (
            <p className="text-xs text-amber-600 mt-3">
              No exams found for {selectedYear}. Please create exams first.
            </p>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* No exams warning */}
      {!loading && subjectsWithExams.length === 0 && subjects.length > 0 && (
        <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          No exams have been created for subjects in this class yet. Please create exams first.
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading class data…
        </div>
      ) : subjectsWithExams.length > 0 && students.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Table remains the same as your original code */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th rowSpan={2} className="sticky left-0 z-20 bg-gray-50 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-r border-gray-200 min-w-[50px]">#</th>
                  <th rowSpan={2} className="sticky left-[50px] z-20 bg-gray-50 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-r border-gray-200 min-w-[160px]">Student Name</th>
                  {subjectsWithExams.map((subj) => {
                    const cols = primary ? 2 : (subj.practicalMarks ? 4 : 3);
                    return (
                      <th key={subj.subjectId} colSpan={cols} className="px-3 py-2.5 text-center text-xs font-bold text-gray-700 border-r border-gray-200 bg-indigo-50">
                        <div>{subj.subjectName}</div>
                        <div className="text-indigo-400 font-normal text-xs">/{subj.totalMarks}</div>
                      </th>
                    );
                  })}
                  <th rowSpan={2} className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[100px]">Actions</th>
                </tr>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {subjectsWithExams.map((subj) => (
                    primary ? (
                      <>
                        <th key={`${subj.subjectId}-wr`} className="px-3 py-2 text-center text-xs font-medium text-gray-500 border-r border-gray-100 min-w-[70px]">
                          Written <div className="text-gray-400 font-normal">/{subj.writtenMarks}</div>
                        </th>
                        <th key={`${subj.subjectId}-tot`} className="px-3 py-2 text-center text-xs font-medium text-gray-500 border-r border-gray-200 min-w-[60px]">Total</th>
                      </>
                    ) : (
                      <>
                        <th key={`${subj.subjectId}-mcq`} className="px-3 py-2 text-center text-xs font-medium text-gray-500 border-r border-gray-100 min-w-[70px]">
                          MCQ <div className="text-gray-400 font-normal">/{subj.mcqMarks ?? 30}</div>
                        </th>
                        <th key={`${subj.subjectId}-wr`} className="px-3 py-2 text-center text-xs font-medium text-gray-500 border-r border-gray-100 min-w-[70px]">
                          Written <div className="text-gray-400 font-normal">/{subj.writtenMarks}</div>
                        </th>
                        {subj.practicalMarks && (
                          <th key={`${subj.subjectId}-pr`} className="px-3 py-2 text-center text-xs font-medium text-gray-500 border-r border-gray-100 min-w-[70px]">
                            Practical <div className="text-gray-400 font-normal">/{subj.practicalMarks}</div>
                          </th>
                        )}
                        <th key={`${subj.subjectId}-tot`} className="px-3 py-2 text-center text-xs font-medium text-gray-500 border-r border-gray-200 min-w-[60px]">Total</th>
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
                    <tr key={student.studentId} className={`transition-colors ${isEditing ? "bg-blue-50" : "hover:bg-gray-50"}`}>
                      <td className="sticky left-0 z-10 bg-inherit px-4 py-3 text-gray-400 text-xs border-r border-gray-100">{idx + 1}</td>
                      <td className="sticky left-[50px] z-10 bg-inherit px-4 py-3 border-r border-gray-100">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {student.name.charAt(0)}
                          </div>
                          <span className="font-medium text-gray-800 text-xs whitespace-nowrap">{student.name}</span>
                        </div>
                      </td>

                      {subjectsWithExams.map((subj) => {
                        const examId = subj.examId!;
                        const total = calcTotal(student, subj);
                        const resultId = student.marks[examId]?.resultId;

                        return primary ? (
                          <>
                            <td className="px-2 py-3 border-r border-gray-100">
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
                            <td className="px-2 py-3 border-r border-gray-200">
                              <TotalChip value={total} />
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-2 py-3 border-r border-gray-100">
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
                            <td className="px-2 py-3 border-r border-gray-100">
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
                            {subj.practicalMarks && (
                              <td className="px-2 py-3 border-r border-gray-100">
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
                            <td className="px-2 py-3 border-r border-gray-200">
                              <TotalChip value={total} />
                            </td>
                          </>
                        );
                      })}

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
      ) : !loading && subjectsWithExams.length > 0 && students.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
              <Users className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700">No Students Found</h3>
            <p className="text-sm text-gray-500">No students are enrolled in this class. Please add students first.</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// Class Selector Component
function ClassSelector({ classes, onSelect }: { classes: ClassOption[]; onSelect: (c: ClassOption) => void }) {
  if (classes.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700">No Classes Found</h3>
          <p className="text-sm text-gray-500">No classes have been created for your school yet.</p>
        </div>
      </div>
    );
  }

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

// Reusable components (same as before)
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