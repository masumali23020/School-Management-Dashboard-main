// components/results/ExamMarksTable.tsx
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
import { Skeleton } from "@/components/ui/skeleton";
import { MarkInputCell } from "./MarkInputCell";
import { GradeBadge } from "./GradeBadge";
import { ResultActions } from "./ResultActions";
import { Student, Subject, Exam, ScoreState } from "./types";
import { Users } from "lucide-react";

interface ExamMarksTableProps {
  students: Student[];
  subjects: Subject[];
  exam: Exam | null;
  scores: Record<string, ScoreState>;
  onScoreChange: (studentId: string, field: string, value: number | undefined) => void;
  onSave: (studentId: string) => void;
  onDelete?: (resultId: number) => void;
  results: Record<string, any>;
  isSaving?: boolean;
  loading?: boolean;
  saveSuccess?: Record<string, boolean>;
}

export function ExamMarksTable({
  students,
  subjects,
  exam,
  scores,
  onScoreChange,
  onSave,
  onDelete,
  results,
  isSaving = false,
  loading = false,
  saveSuccess = {}
}: ExamMarksTableProps) {
  
  const getMarkingScheme = (subject: Subject) => {
    // You can customize this based on subject and class
    const hasMcq = exam?.mcqMarks ? true : false;
    const hasWritten = exam?.writtenMarks ? true : false;
    const hasPractical = exam?.practicalMarks ? true : false;
    
    return { hasMcq, hasWritten, hasPractical };
  };

  const calculateTotal = (studentId: string) => {
    const studentScores = scores[studentId];
    if (!studentScores) return 0;
    
    const { mcq = 0, written = 0, practical = 0 } = studentScores;
    return mcq + written + practical;
  };

  const isHigherClass = (student: Student) => {
    return student.class?.grade?.level >= 6;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Loading Students...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Users className="h-6 w-6 text-purple-600" />
          👨‍🎓 Student Marks Entry
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="rounded-lg border shadow-sm">
          <Table>
            <TableHeader className="bg-gradient-to-r from-purple-100 to-blue-100">
              <TableRow>
                <TableHead className="w-20 font-bold">Roll</TableHead>
                <TableHead className="font-bold">Student Name</TableHead>
                <TableHead className="w-24 font-bold">Grade</TableHead>
                
                {subjects.map((subject) => {
                  const scheme = getMarkingScheme(subject);
                  return (
                    <TableHead 
                      key={`header-${subject.id}`} 
                      className="text-center min-w-[250px] bg-white/50"
                    >
                      <div className="space-y-2">
                        <div className="font-bold text-purple-700">{subject.name}</div>
                        <div className="flex justify-center gap-2 text-xs">
                          {scheme.hasMcq && (
                            <Badge variant="outline" className="bg-blue-50">
                              MCQ ({exam?.mcqMarks})
                            </Badge>
                          )}
                          {scheme.hasWritten && (
                            <Badge variant="outline" className="bg-green-50">
                              Written ({exam?.writtenMarks})
                            </Badge>
                          )}
                          {scheme.hasPractical && (
                            <Badge variant="outline" className="bg-orange-50">
                              Practical ({exam?.practicalMarks})
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableHead>
                  );
                })}
                
                <TableHead className="text-right w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={subjects.length + 4} className="text-center py-12">
                    <div className="text-gray-400">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      No students found in this class
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                students.map((student) => {
                  const result = results[student.id];
                  const higherClass = isHigherClass(student);
                  const total = calculateTotal(student.id);
                  const hasChanges = scores[student.id] !== undefined;
                  
                  return (
                    <TableRow 
                      key={`student-${student.id}`}
                      className="hover:bg-purple-50/50 transition-colors"
                    >
                      <TableCell className="font-medium">
                        {student.rollNo || "—"}
                      </TableCell>
                      
                      <TableCell>
                        <div>
                          <span className="font-medium">{student.name} {student.surname}</span>
                          {higherClass && (
                            <Badge className="ml-2 bg-blue-100 text-blue-700">Higher</Badge>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant="outline">Grade {student.class?.grade?.level}</Badge>
                      </TableCell>
                      
                      {subjects.map((subject) => {
                        const scheme = getMarkingScheme(subject);
                        return (
                          <TableCell key={`${student.id}-${subject.id}`} className="text-center">
                            <div className="flex justify-center gap-1">
                              {scheme.hasMcq && (
                                <MarkInputCell
                                  value={scores[student.id]?.mcq}
                                  onChange={(v) => onScoreChange(student.id, 'mcq', v)}
                                  maxMarks={exam?.mcqMarks || 30}
                                  placeholder="MCQ"
                                />
                              )}
                              
                              {scheme.hasWritten && (
                                <MarkInputCell
                                  value={scores[student.id]?.written}
                                  onChange={(v) => onScoreChange(student.id, 'written', v)}
                                  maxMarks={exam?.writtenMarks || 70}
                                  placeholder="W"
                                />
                              )}
                              
                              {scheme.hasPractical && (
                                <MarkInputCell
                                  value={scores[student.id]?.practical}
                                  onChange={(v) => onScoreChange(student.id, 'practical', v)}
                                  maxMarks={exam?.practicalMarks || 25}
                                  placeholder="P"
                                />
                              )}
                              
                              {!scheme.hasMcq && !scheme.hasWritten && !scheme.hasPractical && (
                                <MarkInputCell
                                  value={scores[student.id]?.total}
                                  onChange={(v) => onScoreChange(student.id, 'total', v)}
                                  maxMarks={100}
                                  placeholder="Total"
                                />
                              )}
                            </div>
                            
                            {total > 0 && (
                              <div className="mt-1">
                                <GradeBadge score={total} />
                              </div>
                            )}
                          </TableCell>
                        );
                      })}
                      
                      <TableCell className="text-right">
                        <ResultActions
                          onSave={() => onSave(student.id)}
                          onDelete={result ? () => onDelete?.(result.id) : undefined}
                          isSaving={isSaving}
                          showDelete={!!result}
                          hasChanges={hasChanges}
                          saveSuccess={saveSuccess[student.id]}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}