// src/components/meals/MealFilterBar.tsx
"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  GraduationCap,
  CalendarRange,
  LayoutGrid,
  X,
  Loader2,
} from "lucide-react";
import { ClassForFilter } from "@/Actions/meals/meal.actions";


interface Props {
  sessions: string[];           // distinct academicYear values
  classes: ClassForFilter[];    // { id: number, name: string }
  studentCount: number;

  selectedYear: string;         // "all" | "2026" …
  selectedClassId: string;      // "all" | "12" …

  onYearChange: (v: string) => void;
  onClassChange: (v: string) => void;
  onReset: () => void;

  isPending?: boolean;
  className?: string;
}

export function MealFilterBar({
  sessions,
  classes,
  studentCount,
  selectedYear,
  selectedClassId,
  onYearChange,
  onClassChange,
  onReset,
  isPending,
  className,
}: Props) {
  const hasFilter = selectedYear !== "all" || selectedClassId !== "all";
  const selectedClass = classes.find((c) => String(c.id) === selectedClassId);

  return (
    <div className={cn("rounded-xl border bg-muted/30 p-3 space-y-3", className)}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <LayoutGrid className="h-4 w-4" />
          Filter students
        </div>
        <div className="flex items-center gap-2">
          {isPending && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}
          <Badge variant="secondary" className="text-xs tabular-nums">
            {studentCount} student{studentCount !== 1 ? "s" : ""}
          </Badge>
          {hasFilter && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={onReset}
            >
              <X className="h-3 w-3" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Dropdowns */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">

        {/* Academic year */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <CalendarRange className="h-3.5 w-3.5" />
            Academic year
          </label>
          <Select
            value={selectedYear}
            onValueChange={onYearChange}
            disabled={isPending}
          >
            <SelectTrigger className="h-9 bg-background text-sm">
              <SelectValue placeholder="All years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All years</SelectItem>
              {sessions.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Class — only active after year chosen */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <GraduationCap className="h-3.5 w-3.5" />
            Class
            {selectedYear === "all" && (
              <span className="text-[10px] opacity-60">(select year first)</span>
            )}
          </label>
          <Select
            value={selectedClassId}
            onValueChange={onClassChange}
            disabled={isPending || selectedYear === "all"}
          >
            <SelectTrigger className="h-9 bg-background text-sm">
              <SelectValue placeholder="All classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active filter pills */}
      {hasFilter && (
        <div className="flex flex-wrap gap-1.5">
          {selectedYear !== "all" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              <CalendarRange className="h-3 w-3" />
              {selectedYear}
            </span>
          )}
          {selectedClass && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              <GraduationCap className="h-3 w-3" />
              {selectedClass.name}
            </span>
          )}
        </div>
      )}
    </div>
  );
}