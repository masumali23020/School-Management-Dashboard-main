// app/dashboard/results/page.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  getClasses,
  getAssignmentsByClass,
  getSubjectsByClass,
  getStudentsByClass,
  getResultsByAssignment,
  saveResult,
  deleteResult,
  testDatabase,
} from "@/app/actions/result-actions";
import { Loader2, Save, Trash2, Database, RefreshCw } from "lucide-react";
import { toast } from "react-toastify";

export default function ResultsPage() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState("");
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [results, setResults] = useState({});
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState({
    classes: false,
    assignments: false,
    students: false,
    saving: false
  });
  const [dbStats, setDbStats] = useState(null);

  // Load classes on mount
  useEffect(() => {
    loadClasses();
    checkDatabase();
  }, []);

  // Load assignments when class changes
  useEffect(() => {
    if (selectedClass) {
      loadAssignments(parseInt(selectedClass));
      loadSubjects(parseInt(selectedClass));
      loadStudents(parseInt(selectedClass));
    }
  }, [selectedClass]);

  // Load results when assignment changes
  useEffect(() => {
    if (selectedAssignment) {
      loadResults(parseInt(selectedAssignment));
    }
  }, [selectedAssignment]);

  const checkDatabase = async () => {
    const result = await testDatabase();
    if (result.success) {
      setDbStats(result.data.stats);
      console.log("Database stats:", result.data.stats);
    }
  };

  const loadClasses = async () => {
    setLoading(prev => ({ ...prev, classes: true }));
    const result = await getClasses();
    if (result.success) {
      setClasses(result.data);
    }
    setLoading(prev => ({ ...prev, classes: false }));
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

  const loadResults = async (assignmentId: number) => {
    const result = await getResultsByAssignment(assignmentId);
    if (result.success) {
      // Create a map of results
      const resultsMap = {};
      result.data.forEach(r => {
        resultsMap[r.studentId] = r;
      });
      setResults(resultsMap);
      
      // Set scores from results
      const scoresMap = {};
      result.data.forEach(r => {
        scoresMap[r.studentId] = r.score;
      });
      setScores(scoresMap);
    }
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

  const handleSave = async (studentId: string) => {
    const score = scores[studentId];
    if (!score) {
      toast.error("Please enter a score");
      return;
    }

    setLoading(prev => ({ ...prev, saving: true }));
    
    const result = await saveResult({
      studentId,
      assignmentId: parseInt(selectedAssignment),
      score
    });

    if (result.success) {
      toast.success("Saved successfully!");
      // Reload results
      loadResults(parseInt(selectedAssignment));
    } else {
      toast.error(result.error || "Failed to save");
    }
    
    setLoading(prev => ({ ...prev, saving: false }));
  };

  const handleDelete = async (resultId: number) => {
    if (!confirm("Are you sure you want to delete this result?")) return;
    
    const result = await deleteResult(resultId);
    if (result.success) {
      toast.success("Deleted successfully!");
      loadResults(parseInt(selectedAssignment));
    } else {
      toast.error("Failed to delete");
    }
  };

  const selectedAssignmentData = assignments.find(
    (a: any) => a.id.toString() === selectedAssignment
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">📊 Result Management</h1>
        {dbStats && (
          <div className="flex items-center gap-2 text-sm bg-blue-50 px-3 py-1 rounded-full">
            <Database className="h-4 w-4 text-blue-600" />
            <span>{dbStats.students} Students | {dbStats.results} Results</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={checkDatabase}
              className="h-6 w-6 p-0"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Class Selection */}
      <Card>
        <CardHeader>
          <CardTitle>📚 Select Class</CardTitle>
        </CardHeader>
        <CardContent>
          <Select onValueChange={setSelectedClass} value={selectedClass}>
            <SelectTrigger className="w-full md:w-96">
              <SelectValue placeholder="Choose a class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((cls: any) => (
                <SelectItem key={cls.id} value={cls.id.toString()}>
                  Class {cls.name} (Grade {cls.grade?.level}) - {cls._count?.students} Students
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Assignment Selection */}
      {selectedClass && (
        <Card>
          <CardHeader>
            <CardTitle>📝 Select Assignment</CardTitle>
          </CardHeader>
          <CardContent>
            {loading.assignments ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading assignments...
              </div>
            ) : (
              <Select onValueChange={setSelectedAssignment} value={selectedAssignment}>
                <SelectTrigger className="w-full md:w-96">
                  <SelectValue placeholder="Choose an assignment" />
                </SelectTrigger>
                <SelectContent>
                  {assignments.map((ass: any) => (
                    <SelectItem key={ass.id} value={ass.id.toString()}>
                      {ass.title} - {ass.lesson?.subject?.name || "No Subject"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {assignments.length === 0 && !loading.assignments && (
              <p className="text-yellow-600 text-sm mt-2">
                No assignments found for this class
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Assignment Info */}
      {selectedAssignmentData && (
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-lg">{selectedAssignmentData.title}</h3>
            <p className="text-sm text-gray-600">
              Subject: {selectedAssignmentData.lesson?.subject?.name} | 
              Due: {new Date(selectedAssignmentData.dueDate).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Students Table */}
      {selectedAssignment && (
        <Card>
          <CardHeader>
            <CardTitle>👨‍🎓 Student Marks</CardTitle>
          </CardHeader>
          <CardContent>
            {loading.students ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    
                    <TableHead>Student Name</TableHead>
                    {subjects.map((sub: any) => (
                      <TableHead key={sub.id} className="text-center">
                        {sub.name}
                      </TableHead>
                    ))}
                    <TableHead className="text-right w-40">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student: any) => {
                    const result = results[student.id];
                    return (
                      <TableRow key={student.id}>
                    
                        <TableCell>
                          {student.name} {student.surname}
                        </TableCell>
                        {subjects.map((sub: any) => (
                          <TableCell key={sub.id} className="text-center">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={scores[student.id] || ""}
                              onChange={(e) => handleScoreChange(student.id, e.target.value)}
                              className="w-20 mx-auto text-center"
                              placeholder="-"
                            />
                          </TableCell>
                        ))}
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSave(student.id)}
                              disabled={loading.saving || !scores[student.id]}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            {result && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDelete(result.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  
                  {students.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={subjects.length + 3} className="text-center py-8">
                        No students found in this class
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}