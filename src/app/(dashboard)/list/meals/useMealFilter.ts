// src/hooks/useMealFilter.ts
"use client";

import { ClassForFilter, getClassesByYear, getFilteredStudents, StudentForMeal } from "@/Actions/meals/meal.actions";
import { useState, useTransition, useCallback } from "react";


interface UseMealFilterOptions {
  initialClasses: ClassForFilter[];
  initialStudents: StudentForMeal[];
}

export interface MealFilterState {
  selectedYear: string;       // "all" | "2026" | "2025" …
  selectedClassId: string;    // "all" | "12" | "7" … (Int stored as string for <Select>)
  classes: ClassForFilter[];
  filteredStudents: StudentForMeal[];
  isPending: boolean;
  onYearChange: (year: string) => void;
  onClassChange: (classId: string) => void;
  onReset: () => void;
}

/**
 * Cascading filter: academicYear → class → students
 *
 * academicYear changes  → re-fetch classes active that year
 *                        → re-fetch students enrolled that year
 * classId changes       → re-fetch students for (year + class)
 * reset                 → restore initial (all-school) data
 */
export function useMealFilter({
  initialClasses,
  initialStudents,
}: UseMealFilterOptions): MealFilterState {
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedClassId, setSelectedClassId] = useState("all");
  const [classes, setClasses] = useState<ClassForFilter[]>(initialClasses);
  const [filteredStudents, setFilteredStudents] =
    useState<StudentForMeal[]>(initialStudents);
  const [isPending, startTransition] = useTransition();

  const onYearChange = useCallback(
    (year: string) => {
      setSelectedYear(year);
      setSelectedClassId("all"); // always reset class when year changes

      startTransition(async () => {
        if (year === "all") {
          setClasses(initialClasses);
          setFilteredStudents(initialStudents);
          return;
        }
        // Parallel: classes with history in this year + students enrolled this year
        const [newClasses, newStudents] = await Promise.all([
          getClassesByYear(year),
          getFilteredStudents({ academicYear: year }),
        ]);
        setClasses(newClasses);
        setFilteredStudents(newStudents);
      });
    },
    [initialClasses, initialStudents]
  );

  const onClassChange = useCallback(
    (classIdStr: string) => {
      setSelectedClassId(classIdStr);

      startTransition(async () => {
        // Build params — classId is an Int in the DB
        const params: { academicYear?: string; classId?: number } = {};
        if (selectedYear !== "all") params.academicYear = selectedYear;
        if (classIdStr !== "all") params.classId = Number(classIdStr);

        const newStudents = await getFilteredStudents(params);
        setFilteredStudents(newStudents);
      });
    },
    [selectedYear]
  );

  const onReset = useCallback(() => {
    setSelectedYear("all");
    setSelectedClassId("all");
    setClasses(initialClasses);
    setFilteredStudents(initialStudents);
  }, [initialClasses, initialStudents]);

  return {
    selectedYear,
    selectedClassId,
    classes,
    filteredStudents,
    isPending,
    onYearChange,
    onClassChange,
    onReset,
  };
}