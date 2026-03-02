// app/dashboard/results/page.tsx
"use client";

import { useState, useEffect } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BookOpen,
  FileText,
  Save,
  Loader2,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  XCircle,
  Trash2
} from "lucide-react";
import {
  getClasses,
  getExamsByClass,
  getAssignmentsByClass,
  getSubjectsByClass,
  getStudentsWithResults,
  saveAllResults,
  deleteResult,
} from "@/app/actions/result-actions";
import { toast } from "react-toastify";

interface Class {
  id: number;
  name: string;
  grade: { level: number };
  _count: { students: number };
}

interface Subject {
  id: number;
  name: string;
}

interface Exam {
  id: number;
  title: string;
  lesson: { subject: Subject };
}

interface Assignment {
  id: number;
  title: string;
  lesson: { subject: Subject };
}

interface Student {
  id: string;
  rollNo: number | null;
  name: string;
  surname: string;
  results: Array<{
    id: number;
    score: number;
  }>;
}

export default function ResultsPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedExam, setSelectedExam] = useState<string>("");
  const [selectedAssignment, setSelectedAssignment] = useState<string>("");
  const [exams, setExams] = useState<Exam[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activeTab, setActiveTab] = useState<"exam" | "assignment">("exam");
  const [scores, setScores] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  // Load classes on mount
  useEffect(() => {
    loadClasses();
    setTimeout(() => setInitialLoading(false), 800);
  }, []);

  // Load exams/assignments when class changes
  useEffect(() => {
    if (selectedClass) {
      if (activeTab === "exam") {
        loadExams(parseInt(selectedClass));
      } else {
        loadAssignments(parseInt(selectedClass));
      }
      loadSubjects(parseInt(selectedClass));
    }
  }, [selectedClass, activeTab]);

  // Load students when exam or assignment changes
  useEffect(() => {
    if (selectedClass) {
      if (activeTab === "exam" && selectedExam) {
        loadStudents(parseInt(selectedClass), parseInt(selectedExam), undefined);
      } else if (activeTab === "assignment" && selectedAssignment) {
        loadStudents(parseInt(selectedClass), undefined, parseInt(selectedAssignment));
      }
    }
  }, [selectedExam, selectedAssignment, selectedClass, activeTab]);

  // Update scores when students data changes
  useEffect(() => {
    const newScores: Record<string, number> = {};
    students.forEach(student => {
      if (student.results[0]) {
        newScores[student.id] = student.results[0].score;
      }
    });
    setScores(newScores);
  }, [students]);

  const loadClasses = async () => {
    const result = await getClasses();
    if (result.success) {
      setClasses(result.data);
    }
  };

  const loadExams = async (classId: number) => {
    setLoading(true);
    const result = await getExamsByClass(classId);
    if (result.success) {
      setExams(result.data);
    }
    setLoading(false);
  };

  const loadAssignments = async (classId: number) => {
    setLoading(true);
    const result = await getAssignmentsByClass(classId);
    if (result.success) {
      setAssignments(result.data);
    }
    setLoading(false);
  };

  const loadSubjects = async (classId: number) => {
    const result = await getSubjectsByClass(classId);
    if (result.success) {
      setSubjects(result.data);
    }
  };

  const loadStudents = async (classId: number, examId?: number, assignmentId?: number) => {
    setLoading(true);
    const result = await getStudentsWithResults(classId, examId, assignmentId);
    if (result.success) {
      setStudents(result.data);
    }
    setLoading(false);
  };

  const handleScoreChange = (studentId: string, value: string) => {
    const score = parseInt(value);
    if (!isNaN(score) && score >= 0 && score <= 100) {
      setScores(prev => ({ ...prev, [studentId]: score }));
    } else if (value === "") {
      setScores(prev => {
        const newScores = { ...prev };
        delete newScores[studentId];
        return newScores;
      });
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    const formData = new FormData();
    
    if (activeTab === "exam" && selectedExam) {
      formData.append("examId", selectedExam);
    } else if (activeTab === "assignment" && selectedAssignment) {
      formData.append("assignmentId", selectedAssignment);
    }

    Object.entries(scores).forEach(([studentId, score]) => {
      formData.append(`score_${studentId}`, score.toString());
    });

    const result = await saveAllResults(formData);
    if (result.success) {
      setShowSuccess(true);
      toast.success("All results saved successfully!", {
        icon: <Sparkles className="h-4 w-4" />,
      });
      setTimeout(() => setShowSuccess(false), 2000);
      
      if (selectedClass) {
        if (activeTab === "exam" && selectedExam) {
          loadStudents(parseInt(selectedClass), parseInt(selectedExam), undefined);
        } else if (activeTab === "assignment" && selectedAssignment) {
          loadStudents(parseInt(selectedClass), undefined, parseInt(selectedAssignment));
        }
      }
    } else {
      toast.error("Failed to save results");
    }
    setSaving(false);
  };

  const handleDelete = async (resultId: number) => {
    if (confirm("Are you sure you want to delete this result?")) {
      setDeletingId(resultId);
      const result = await deleteResult(resultId);
      if (result.success) {
        toast.success("Result deleted!");
        if (selectedClass) {
          if (activeTab === "exam" && selectedExam) {
            loadStudents(parseInt(selectedClass), parseInt(selectedExam), undefined);
          } else if (activeTab === "assignment" && selectedAssignment) {
            loadStudents(parseInt(selectedClass), undefined, parseInt(selectedAssignment));
          }
        }
      }
      setDeletingId(null);
    }
  };

  const getSelectedItem = () => {
    if (activeTab === "exam") {
      return exams.find(e => e.id.toString() === selectedExam);
    } else {
      return assignments.find(a => a.id.toString() === selectedAssignment);
    }
  };

  const selectedItem = getSelectedItem();

  // Loading skeleton
  if (initialLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6 animate-pulse">
        <div className="h-12 w-64 bg-gray-200 rounded-lg"></div>
        <Card>
          <CardHeader>
            <div className="h-8 w-48 bg-gray-200 rounded"></div>
            <div className="h-4 w-72 bg-gray-200 rounded"></div>
          </CardHeader>
          <CardContent>
            <div className="h-10 w-full bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header with animation */}
      <div className="transform transition-all duration-500 hover:scale-[1.02]">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          Result Management
        </h1>
        <p className="text-gray-500">
          Manage student results by exam or assignment
        </p>
      </div>

      {/* Class Selection Card */}
      <div className="transform transition-all duration-500 hover:shadow-xl">
        <Card className="border-2 hover:border-purple-300 transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-purple-600" />
              Select Class
            </CardTitle>
            <CardDescription>
              Choose a class to manage results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select onValueChange={setSelectedClass} value={selectedClass}>
              <SelectTrigger className="w-full md:w-96 transition-all duration-300 focus:ring-2 focus:ring-purple-400">
                <SelectValue placeholder="Choose class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem 
                    key={cls.id} 
                    value={cls.id.toString()}
                    className="hover:bg-purple-50 transition-colors duration-200"
                  >
                    Class {cls.name} (Grade {cls.grade.level}) - {cls._count.students} Students
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      {selectedClass && (
        <div className="transform transition-all duration-500 animate-fadeIn">
          <Card className="border-2 hover:border-purple-300 transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-purple-600" />
                Result Entry
              </CardTitle>
              <CardDescription>
                Select exam or assignment to enter marks
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "exam" | "assignment")} className="mb-6">
                <TabsList className="grid w-full md:w-96 grid-cols-2">
                  <TabsTrigger 
                    value="exam"
                    className="transition-all duration-300 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                  >
                    📝 Exams
                  </TabsTrigger>
                  <TabsTrigger 
                    value="assignment"
                    className="transition-all duration-300 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                  >
                    📋 Assignments
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Selection */}
              <div className={`transition-all duration-500 transform ${activeTab === "exam" ? "translate-x-0" : "-translate-x-full opacity-0 hidden"}`}>
                {activeTab === "exam" ? (
                  <div className="mb-6">
                    <Label>Select Exam</Label>
                    <Select onValueChange={setSelectedExam} value={selectedExam}>
                      <SelectTrigger className="w-full md:w-96 transition-all duration-300 focus:ring-2 focus:ring-purple-400">
                        <SelectValue placeholder="Choose exam" />
                      </SelectTrigger>
                      <SelectContent>
                        {exams.map((exam) => (
                          <SelectItem 
                            key={exam.id} 
                            value={exam.id.toString()}
                            className="hover:bg-purple-50 transition-colors duration-200"
                          >
                            {exam.title} - {exam.lesson.subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="mb-6">
                    <Label>Select Assignment</Label>
                    <Select onValueChange={setSelectedAssignment} value={selectedAssignment}>
                      <SelectTrigger className="w-full md:w-96 transition-all duration-300 focus:ring-2 focus:ring-purple-400">
                        <SelectValue placeholder="Choose assignment" />
                      </SelectTrigger>
                      <SelectContent>
                        {assignments.map((assignment) => (
                          <SelectItem 
                            key={assignment.id} 
                            value={assignment.id.toString()}
                            className="hover:bg-purple-50 transition-colors duration-200"
                          >
                            {assignment.title} - {assignment.lesson.subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Info Card */}
              {selectedItem && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg mb-6 border border-purple-200 transform transition-all duration-500 hover:scale-[1.02]">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5 text-purple-600" />
                    <h3 className="font-semibold text-purple-800">{selectedItem.title}</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Subject: {selectedItem.lesson.subject.name}
                  </p>
                </div>
              )}

              {/* Students Table */}
              {(selectedExam || selectedAssignment) && (
                <div className="transform transition-all duration-500 animate-slideUp">
                  <div className="rounded-md border overflow-hidden shadow-lg">
                    <Table>
                      <TableHeader className="bg-gradient-to-r from-purple-100 to-blue-100">
                        <TableRow>
                          <TableHead className="w-[100px] font-semibold">Roll No</TableHead>
                          <TableHead className="font-semibold">Student Name</TableHead>
                          {subjects.map((subject, index) => (
                            <TableHead 
                              key={subject.id}
                              className="text-center min-w-[120px] font-semibold"
                              style={{ animationDelay: `${index * 50}ms` }}
                            >
                              <span className="transform transition-all duration-300 hover:scale-110 inline-block">
                                {subject.name}
                              </span>
                            </TableHead>
                          ))}
                          <TableHead className="text-right w-[100px] font-semibold">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          // Loading skeletons
                          Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i} className="animate-pulse">
                              <TableCell><Skeleton className="h-6 w-12" /></TableCell>
                              <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                              {subjects.map((_, j) => (
                                <TableCell key={j}><Skeleton className="h-6 w-16 mx-auto" /></TableCell>
                              ))}
                              <TableCell><Skeleton className="h-6 w-20 ml-auto" /></TableCell>
                            </TableRow>
                          ))
                        ) : students.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={subjects.length + 3} className="text-center py-12">
                              <div className="transform transition-all duration-500 hover:scale-110">
                                <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                                <p className="text-gray-500">No students found in this class</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          students.map((student, index) => {
                            const hasResult = student.results[0];
                            return (
                              <TableRow 
                                key={student.id}
                                className={`transition-all duration-300 hover:bg-purple-50 cursor-pointer ${
                                  hoveredRow === student.id ? 'bg-purple-50 scale-[1.01] shadow-md' : ''
                                }`}
                                onMouseEnter={() => setHoveredRow(student.id)}
                                onMouseLeave={() => setHoveredRow(null)}
                                style={{ animationDelay: `${index * 30}ms` }}
                              >
                                <TableCell className="font-medium">
                                  <span className="transform transition-all duration-300 hover:scale-110 inline-block">
                                    {student.rollNo || "N/A"}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <span className="font-medium">
                                    {student.name} {student.surname}
                                  </span>
                                </TableCell>
                                {subjects.map((subject) => (
                                  <TableCell key={subject.id} className="text-center">
                                    <Input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={scores[student.id] || ""}
                                      onChange={(e) => handleScoreChange(student.id, e.target.value)}
                                      className={`w-20 mx-auto text-center transition-all duration-300 hover:shadow-md focus:ring-2 focus:ring-purple-400 ${
                                        scores[student.id] ? 'border-purple-400' : ''
                                      }`}
                                      placeholder="-"
                                    />
                                  </TableCell>
                                ))}
                                <TableCell className="text-right">
                                  {hasResult && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDelete(student.results[0].id)}
                                      disabled={deletingId === student.results[0].id}
                                      className="text-red-500 hover:text-red-600 hover:bg-red-50 transition-all duration-300 transform hover:scale-110"
                                    >
                                      {deletingId === student.results[0].id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-4 w-4" />
                                      )}
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Save All Button */}
                  <div className="mt-6 flex justify-end">
                    <Button 
                      onClick={handleSaveAll} 
                      disabled={saving || Object.keys(scores).length === 0}
                      size="lg"
                      className={`relative overflow-hidden transition-all duration-500 transform hover:scale-105 ${
                        showSuccess ? 'bg-green-600' : 'bg-gradient-to-r from-purple-600 to-blue-600'
                      }`}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : showSuccess ? (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4 animate-bounce" />
                          Saved!
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4 group-hover:rotate-12 transition-transform" />
                          Save All Results
                          {Object.keys(scores).length > 0 && (
                            <Badge 
                              variant="secondary" 
                              className="ml-2 absolute -top-2 -right-2 animate-bounce bg-yellow-400 text-white"
                            >
                              {Object.keys(scores).length}
                            </Badge>
                          )}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Empty states */}
              {!selectedExam && !selectedAssignment && activeTab === "exam" && (
                <div className="text-center py-12 transform transition-all duration-500 hover:scale-105">
                  <FileText className="h-20 w-20 mx-auto mb-4 text-gray-300 animate-pulse" />
                  <p className="text-gray-500">Please select an exam to enter marks</p>
                </div>
              )}

              {!selectedExam && !selectedAssignment && activeTab === "assignment" && (
                <div className="text-center py-12 transform transition-all duration-500 hover:scale-105">
                  <FileText className="h-20 w-20 mx-auto mb-4 text-gray-300 animate-pulse" />
                  <p className="text-gray-500">Please select an assignment to enter marks</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add custom CSS for animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
        
        .animate-slideUp {
          animation: slideUp 0.6s ease-out;
        }
        
        tr {
          animation: fadeIn 0.3s ease-out forwards;
          opacity: 0;
        }
        
        tr:nth-child(1) { animation-delay: 0.1s; }
        tr:nth-child(2) { animation-delay: 0.15s; }
        tr:nth-child(3) { animation-delay: 0.2s; }
        tr:nth-child(4) { animation-delay: 0.25s; }
        tr:nth-child(5) { animation-delay: 0.3s; }
        tr:nth-child(6) { animation-delay: 0.35s; }
        tr:nth-child(7) { animation-delay: 0.4s; }
        tr:nth-child(8) { animation-delay: 0.45s; }
        tr:nth-child(9) { animation-delay: 0.5s; }
        tr:nth-child(10) { animation-delay: 0.55s; }
      `}</style>
    </div>
  );
}