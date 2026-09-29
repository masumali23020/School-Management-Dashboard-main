// components/results/ExamSelector.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, FileText } from "lucide-react";
import { Exam } from "./types";

interface ExamSelectorProps {
  exams: Exam[];
  selectedExam: string;
  onSelect: (value: string) => void;
  loading?: boolean;
}

export function ExamSelector({ exams, selectedExam, onSelect, loading }: ExamSelectorProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('bn-BD', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <Card className="border-2 hover:shadow-lg transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <FileText className="h-6 w-6 text-blue-600" />
          📝 Select Exam
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Select onValueChange={onSelect} value={selectedExam} disabled={loading}>
          <SelectTrigger className="w-full md:w-96 bg-white/50 backdrop-blur-sm border-2 focus:ring-2 focus:ring-blue-400">
            <SelectValue placeholder={loading ? "Loading exams..." : "Choose an exam"} />
          </SelectTrigger>
          <SelectContent>
            {exams.map((exam) => (
              <SelectItem 
                key={`exam-${exam.id}`} 
                value={exam.id.toString()}
                className="hover:bg-blue-50"
              >
                <div className="flex flex-col gap-1 py-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{exam.title}</span>
                    <Badge variant="secondary" className="text-xs">
                      {exam.lesson?.subject?.name}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(exam.startTime)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Total: {exam.totalMarks}
                    </span>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {exams.length === 0 && !loading && (
          <p className="text-amber-600 text-sm mt-2 flex items-center gap-1">
            <span className="text-lg">⚠️</span>
            No exams found for this class
          </p>
        )}
      </CardContent>
    </Card>
  );
}