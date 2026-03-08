// components/results/AssignmentSelector.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, Clock } from "lucide-react";
import { Assignment } from "./types";

interface AssignmentSelectorProps {
  assignments: Assignment[];
  selectedAssignment: string;
  onSelect: (value: string) => void;
  loading?: boolean;
}

export function AssignmentSelector({ 
  assignments, 
  selectedAssignment, 
  onSelect, 
  loading 
}: AssignmentSelectorProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('bn-BD', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const selectedAssignmentData = assignments.find(a => a.id.toString() === selectedAssignment);

  return (
    <Card className="border-2 hover:shadow-lg transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <FileText className="h-6 w-6 text-green-600" />
          📋 Select Assignment
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Select onValueChange={onSelect} value={selectedAssignment} disabled={loading}>
          <SelectTrigger className="w-full md:w-96 bg-white/50 backdrop-blur-sm border-2 focus:ring-2 focus:ring-green-400">
            <SelectValue placeholder={loading ? "Loading assignments..." : "Choose an assignment"} />
          </SelectTrigger>
          <SelectContent>
            {assignments.map((assignment) => (
              <SelectItem 
                key={`assignment-${assignment.id}`} 
                value={assignment.id.toString()}
                className="hover:bg-green-50"
              >
                <div className="flex flex-col gap-1 py-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{assignment.title}</span>
                    <Badge variant="secondary" className="text-xs bg-green-100">
                      {assignment.lesson?.subject?.name}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Start: {formatDate(assignment.startDate)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Due: {formatDate(assignment.dueDate)}
                    </span>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {selectedAssignmentData && (
          <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-green-800">{selectedAssignmentData.title}</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Subject: {selectedAssignmentData.lesson?.subject?.name} • 
                  Total Marks: {selectedAssignmentData.totalMarks || 100}
                </p>
              </div>
              <Badge className="bg-green-600">
                Due: {formatDate(selectedAssignmentData.dueDate)}
              </Badge>
            </div>
          </div>
        )}
        
        {assignments.length === 0 && !loading && (
          <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-amber-600 text-sm flex items-center gap-2">
              <span className="text-lg">📭</span>
              No assignments found for this class
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}