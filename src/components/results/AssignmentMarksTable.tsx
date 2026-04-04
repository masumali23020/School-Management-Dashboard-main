// components/results/AssignmentMarksTable.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, 
  Save, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle,
  Loader2,
  Sparkles,
  AlertCircle,
  GraduationCap,
  Users,
  Database
} from "lucide-react";
import { Student, Assignment, Result } from "./types";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

interface AssignmentMarksTableProps {
  students: Student[];
  assignment: Assignment | null;
  onSave: (studentId: string, score: number) => Promise<any>;
  onDelete: (resultId: number) => Promise<any>;
  results: Record<string, Result>;
  loading?: boolean;
  isSaving?: boolean;
}

interface EditingState {
  [studentId: string]: {
    isEditing: boolean;
    value: string;
  };
}

export function AssignmentMarksTable({
  students,
  assignment,
  onSave,
  onDelete,
  results,
  loading = false,
  isSaving = false
}: AssignmentMarksTableProps) {
  const router = useRouter();
  const [editingStates, setEditingStates] = useState<EditingState>({});
  const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});
  const [deleteStates, setDeleteStates] = useState<Record<string, boolean>>({});
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [localResults, setLocalResults] = useState<Record<string, Result>>({});
  const [dataLoaded, setDataLoaded] = useState(false);

  // যখন results প্রপ্স পরিবর্তন হয়, তখন localResults আপডেট করি
  useEffect(() => {
    if (results && Object.keys(results).length > 0) {
      setLocalResults(results);
      setDataLoaded(true);
    } else {
      setLocalResults({});
      setDataLoaded(false);
    }
  }, [results]);

  // যখন assignment পরিবর্তন হয়, তখন ডাটা রিসেট করি
  useEffect(() => {
    setEditingStates({});
    setSavingStates({});
    setDeleteStates({});
    setDataLoaded(false);
  }, [assignment?.id]);

  const getInitialValue = (studentId: string) => {
    const result = localResults[studentId];
    return result?.score?.toString() || "";
  };

  const startEditing = (studentId: string) => {
    setEditingStates(prev => ({
      ...prev,
      [studentId]: {
        isEditing: true,
        value: getInitialValue(studentId)
      }
    }));
  };

  const cancelEditing = (studentId: string) => {
    setEditingStates(prev => {
      const newState = { ...prev };
      delete newState[studentId];
      return newState;
    });
  };

  const handleValueChange = (studentId: string, value: string) => {
    if (value === "" || /^\d+$/.test(value)) {
      setEditingStates(prev => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          value
        }
      }));
    }
  };

  const validateScore = (score: number): boolean => {
    return score >= 0 && score <= 100;
  };

  const handleSave = async (studentId: string) => {
    const editingState = editingStates[studentId];
    if (!editingState) return;

    const scoreValue = parseInt(editingState.value);
    
    if (isNaN(scoreValue)) {
      toast.error("Please enter a valid number");
      return;
    }

    if (!validateScore(scoreValue)) {
      toast.error("Score must be between 0 and 100");
      return;
    }

    setSavingStates(prev => ({ ...prev, [studentId]: true }));

    try {
      const result = await onSave(studentId, scoreValue);
      
      if (result?.success) {
        // ডাটাবেস থেকে পাওয়া রেজাল্ট আইডি ব্যবহার করি
        const newResult: Result = {
          id: result.data?.id || Date.now(),
          score: scoreValue,
          studentId: studentId,
          assignmentId: assignment?.id || 0
        };

        // লোকাল স্টেট আপডেট করি
        setLocalResults(prev => ({
          ...prev,
          [studentId]: newResult
        }));

        toast.success(
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="font-semibold">
                {result.operation === 'updated' ? '✓ Marks Updated!' : '✓ Marks Saved!'}
              </p>
              <p className="text-sm">
                {students.find(s => s.id === studentId)?.name} scored {scoreValue}
              </p>
            </div>
          </div>
        );

        cancelEditing(studentId);
      }
    } catch (error) {
      toast.error("Failed to save marks");
    } finally {
      setSavingStates(prev => ({ ...prev, [studentId]: false }));
    }
  };

  const handleDelete = async (studentId: string, resultId: number) => {
    toast.info(
      <div className="flex flex-col gap-3 p-2">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="h-5 w-5" />
          <span className="font-semibold">Delete Result?</span>
        </div>
        <p className="text-sm text-gray-600">
          Delete marks for {students.find(s => s.id === studentId)?.name}?
        </p>
        <div className="flex justify-end gap-2 mt-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => toast.dismiss()}
          >
            Cancel
          </Button>
          <Button 
            size="sm" 
            variant="destructive"
            onClick={async () => {
              toast.dismiss();
              setDeleteStates(prev => ({ ...prev, [studentId]: true }));
              
              try {
                const result = await onDelete(resultId);
                
                if (result?.success) {
                  // লোকাল স্টেট থেকে রিমুভ করি
                  setLocalResults(prev => {
                    const newResults = { ...prev };
                    delete newResults[studentId];
                    return newResults;
                  });

                  toast.success("Result deleted successfully!");
                }
              } catch (error) {
                toast.error("Failed to delete result");
              } finally {
                setDeleteStates(prev => ({ ...prev, [studentId]: false }));
              }
            }}
          >
            Delete
          </Button>
        </div>
      </div>,
      { position: "top-center", autoClose: false }
    );
  };

  const getScoreColor = (score: number) => {
    const percentage = (score / 100) * 100;
    if (percentage >= 80) return "bg-green-100 text-green-700 border-green-300";
    if (percentage >= 60) return "bg-blue-100 text-blue-700 border-blue-300";
    if (percentage >= 40) return "bg-yellow-100 text-yellow-700 border-yellow-300";
    return "bg-red-100 text-red-700 border-red-300";
  };

  const getGradeLetter = (score: number) => {
    const percentage = (score / 100) * 100;
    if (percentage >= 80) return "A+";
    if (percentage >= 70) return "A";
    if (percentage >= 60) return "A-";
    if (percentage >= 50) return "B";
    if (percentage >= 40) return "C";
    if (percentage >= 33) return "D";
    return "F";
  };

  // লোডিং স্টেট
  if (loading) {
    return (
      <Card className="border-2 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading Students...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const savedCount = Object.keys(localResults).length;
  const pendingCount = students.length - savedCount;

  return (
    <Card className="border-2 shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-6 w-6 text-green-600" />
            Assignment Marks Entry
          </CardTitle>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-white px-3 py-1">
              <Users className="h-3 w-3 mr-1" />
              {students.length} Students
            </Badge>
            <Badge className="bg-green-600 px-3 py-1">
              Max: 100
            </Badge>
            {dataLoaded && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 px-3 py-1">
                <Database className="h-3 w-3 mr-1" />
                Loaded
              </Badge>
            )}
          </div>
        </div>
        {assignment && (
          <p className="text-sm text-gray-600 mt-1">
            {assignment.title} • {assignment.lesson?.subject?.name}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-100">
              <TableRow>
                <TableHead className="w-20 text-center font-semibold">Roll</TableHead>
                <TableHead className="font-semibold">Student Name</TableHead>
                <TableHead className="w-24 text-center font-semibold">Grade</TableHead>
                <TableHead className="text-center min-w-[300px] font-semibold">Marks</TableHead>
                <TableHead className="text-right w-36 font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-16">
                    <div className="text-gray-400">
                      <GraduationCap className="h-16 w-16 mx-auto mb-3 opacity-30" />
                      <p className="text-lg font-medium">No Students Found</p>
                      <p className="text-sm">This class has no students enrolled</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                students.map((student) => {
                  const result = localResults[student.id];
                  const editing = editingStates[student.id];
                  const isEditing = editing?.isEditing || false;
                  const isSavingThis = savingStates[student.id] || isSaving;
                  const isDeleting = deleteStates[student.id];
                  const isHovered = hoveredRow === student.id;
                  
                  return (
                    <TableRow 
                      key={student.id}
                      className={`transition-all duration-200 ${
                        isHovered ? 'bg-green-50' : ''
                      } ${result ? 'border-l-4 border-l-green-400' : ''}`}
                      onMouseEnter={() => setHoveredRow(student.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      <TableCell className="text-center font-medium">
                        {student.rollNo || "—"}
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{student.name} {student.surname}</span>
                          {result && (
                            <Badge className="bg-green-100 text-green-700 text-xs px-2 py-0">
                              Saved
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-purple-50">
                          Grade {student.class?.grade?.level}
                        </Badge>
                      </TableCell>
                      
                      
                      <TableCell className="text-center">
                        {isEditing ? (
                          // Edit Mode
                          <div className="flex items-center justify-center gap-2">
                            <Input
                              type="text"
                              value={editing.value}
                              onChange={(e) => handleValueChange(student.id, e.target.value)}
                              className="w-24 text-center border-2 border-green-400 focus:ring-2 focus:ring-green-400"
                              placeholder="Marks"
                              autoFocus
                              disabled={isSavingThis}
                            />
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSave(student.id)}
                                disabled={isSavingThis}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8 w-8 p-0"
                              >
                                {isSavingThis ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => cancelEditing(student.id)}
                                disabled={isSavingThis}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          // View Mode
                          <div className="flex items-center justify-center gap-3">
                            {result ? (
                              <>
                                <Badge 
                                  className={`${getScoreColor(result.score)} px-3 py-1 text-sm font-medium cursor-pointer hover:scale-105 transition-transform`}
                                  onClick={() => startEditing(student.id)}
                                >
                                  {result.score} / 100
                                </Badge>
                                <Badge variant="outline" className="bg-white px-2">
                                  {getGradeLetter(result.score)}
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  {Math.round((result.score / 100) * 100)}%
                                </span>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => startEditing(student.id)}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-dashed border-blue-200"
                              >
                                <Save className="h-3 w-3 mr-1" />
                                Add Marks
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                      
                      <TableCell className="text-right">
                        {result && !isEditing && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(student.id, result.id)}
                            disabled={isDeleting}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            {isDeleting ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3 mr-1" />
                            )}
                            Delete
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

        {/* Footer with statistics */}
        {students.length > 0 && (
          <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Total: {students.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-green-600 font-medium">Saved: {savedCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <span className="text-yellow-600 font-medium">Pending: {pendingCount}</span>
              </div>
            </div>
       
          </div>
        )}
      </CardContent>
    </Card>
  );
}