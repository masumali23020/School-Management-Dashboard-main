// components/results/ClassSelector.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookOpen } from "lucide-react";
import { Class } from "./types";

interface ClassSelectorProps {
  classes: Class[];
  selectedClass: string;
  onSelect: (value: string) => void;
  loading?: boolean;
}

export function ClassSelector({ 
  classes, 
  selectedClass, 
  onSelect, 
  loading 
}: ClassSelectorProps) {
  return (
    <Card className="border-2 hover:shadow-lg transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <BookOpen className="h-6 w-6 text-purple-600" />
          📚 Select Class
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Select onValueChange={onSelect} value={selectedClass} disabled={loading}>
          <SelectTrigger className="w-full md:w-96 bg-white/50 backdrop-blur-sm border-2 focus:ring-2 focus:ring-purple-400 transition-all">
            <SelectValue placeholder={loading ? "Loading classes..." : "Choose a class"} />
          </SelectTrigger>
          <SelectContent>
            {classes.map((cls) => (
              <SelectItem 
                key={`class-${cls.id}`} 
                value={cls.id.toString()}
                className="hover:bg-purple-50 cursor-pointer"
              >
                <span className="font-medium">Class {cls.name}</span>
                <span className="text-sm text-gray-500 ml-2">
                  (Grade {cls.grade?.level}) • {cls._count?.students} Students
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}