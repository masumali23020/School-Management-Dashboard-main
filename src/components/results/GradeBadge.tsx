// components/results/GradeBadge.tsx
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface GradeBadgeProps {
  score: number;
  totalMarks?: number;
  className?: string;
}

export function GradeBadge({ score, totalMarks = 100, className }: GradeBadgeProps) {
  const percentage = (score / totalMarks) * 100;
  
  const getGradeInfo = (percent: number) => {
    if (percent >= 80) return { letter: 'A+', color: 'bg-green-100 text-green-700 border-green-300' };
    if (percent >= 70) return { letter: 'A', color: 'bg-green-50 text-green-600 border-green-200' };
    if (percent >= 60) return { letter: 'A-', color: 'bg-blue-100 text-blue-700 border-blue-300' };
    if (percent >= 50) return { letter: 'B', color: 'bg-blue-50 text-blue-600 border-blue-200' };
    if (percent >= 40) return { letter: 'C', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' };
    if (percent >= 33) return { letter: 'D', color: 'bg-orange-100 text-orange-700 border-orange-300' };
    return { letter: 'F', color: 'bg-red-100 text-red-700 border-red-300' };
  };

  const { letter, color } = getGradeInfo(percentage);

  return (
    <Badge variant="outline" className={cn("font-bold px-3 py-1", color, className)}>
      {letter} ({score})
    </Badge>
  );
}