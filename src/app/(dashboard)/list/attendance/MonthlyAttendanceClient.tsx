"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { format, eachDayOfInterval, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "react-toastify";
import { CalendarIcon, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { bulkAttendance } from "@/Actions/attendance/attendance";

interface MonthlyAttendanceClientProps {
  classes: any[];
  currentMonth: Date;
}

export default function MonthlyAttendanceClient({ classes, currentMonth }: MonthlyAttendanceClientProps) {
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState<Date>(currentMonth);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>("2026-2027");
  const [attendanceData, setAttendanceData] = useState<Record<string, Record<string, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const days = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(selectedMonth),
      end: endOfMonth(selectedMonth)
    });
  }, [selectedMonth]);

  // ক্লাস বা মাস পরিবর্তন হলে ডাটা রিসেট করা
  useEffect(() => {
    if (!selectedClass) return;

    const initialData: Record<string, Record<string, boolean>> = {};
    
    selectedClass.students?.forEach((student: any) => {
      initialData[student.id] = {};
      
      days.forEach(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const existingAttendance = student.attendances?.find(
          (att: any) => att && format(new Date(att.date), 'yyyy-MM-dd') === dateKey
        );
        initialData[student.id][dateKey] = existingAttendance ? existingAttendance.present : false;
      });
    });
    
    setAttendanceData(initialData);
  }, [selectedClass, selectedMonth, days]);

  // student এর rollNumber বের করার ফাংশন
  const getStudentRollNumber = (student: any) => {
    // student এর classHistory array থেকে current academic year এর rollNumber বের করা
    const classHistory = student.classHistory?.find(
      (history: any) => history.academicYear === selectedAcademicYear
    );
    
    return classHistory?.rollNumber || "N/A";
  };

  // চেকবক্স চেঞ্জ হ্যান্ডলার
  const handleAttendanceChange = useCallback((studentId: string, date: Date, checked: boolean) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [dateKey]: checked,
      }
    }));
  }, []);

  // সবাইকে একসাথে প্রেজেন্ট/অ্যাবসেন্ট করার হ্যান্ডলার
  const handleMarkAll = useCallback((date: Date, value: boolean) => {
    if (!selectedClass) return;
    
    const dateKey = format(date, 'yyyy-MM-dd');
    
    setAttendanceData(prev => {
      const updated = { ...prev };
      
      selectedClass.students?.forEach((student: any) => {
        if (!updated[student.id]) {
          updated[student.id] = {};
        }
        updated[student.id][dateKey] = value;
      });
      
      return updated;
    });
  }, [selectedClass]);

  // সাবমিট ফাংশন
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!selectedClass) {
      toast.error("Please select a class");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendancesToSubmit: any[] = [];

    selectedClass.students?.forEach((student: any) => {
      days.forEach(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const isPresent = attendanceData[student.id]?.[dateKey] || false;

        if (day > today) return;

        const existingAttendance = student.attendances?.find(
          (att: any) => format(new Date(att.date), 'yyyy-MM-dd') === dateKey
        );

        const dbValue = existingAttendance ? existingAttendance.present : false;
        
        if (isPresent !== dbValue) {
          attendancesToSubmit.push({
            studentId: student.id,
            date: day.toISOString(),
            present: isPresent,
          });
        }
      });
    });

    if (attendancesToSubmit.length === 0) {
      toast.info("No changes to save.");
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("attendances", JSON.stringify(attendancesToSubmit));

    try {
      const result = await bulkAttendance({ success: false, error: false }, formData);

      if (result.success) {
        toast.success(result.message || "Attendance saved successfully!");
        router.refresh();
      } else {
        toast.error(result.message || "Failed to save attendance");
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong!");
    } finally {
      setIsSubmitting(false);
    }
  };

  // অ্যাটেনডেন্স কাউন্ট ক্যালকুলেশন
  const calculateAttendance = useCallback((studentId: string) => {
    if (!attendanceData[studentId]) return { present: 0, total: 0 };
    
    const studentDays = attendanceData[studentId];
    let present = 0;
    let total = 0;
    
    days.forEach(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const today = new Date();
      today.setHours(0,0,0,0);
      if (day <= today) {
        total++;
        if (studentDays[dateKey]) present++;
      }
    });
    
    return { present, total };
  }, [attendanceData, days]);

  const monthName = format(selectedMonth, 'MMMM yyyy');

  if (!classes.length) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          No classes found.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
     
        <CardTitle>Monthly Attendance - {monthName}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit}>
          <div className="space-y-6">
            
            {/* কন্ট্রোলস: ক্লাস সিলেক্ট এবং মাস পরিবর্তন */}
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-4">
                <Select
                  value={selectedClass?.id?.toString()}
                  onValueChange={(value) => {
                    const cls = classes.find((c: any) => c.id === parseInt(value));
                    console.log("Selected Class:", cls);
                    setSelectedClass(cls);
                  }}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls: any) => (
                      <SelectItem key={cls.id} value={cls.id.toString()}>
                        {cls.name} {cls.grade && `- Grade ${cls.grade.level}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Academic Year Selector */}
                <Select
                  value={selectedAcademicYear}
                  onValueChange={setSelectedAcademicYear}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Academic Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024-2025">2024-2025</SelectItem>
                    <SelectItem value="2025-2026">2025-2026</SelectItem>
                    <SelectItem value="2026-2027">2026-2027</SelectItem>
                  </SelectContent>
                </Select>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[200px]" disabled={isSubmitting}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(selectedMonth, 'MMMM yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      month={selectedMonth}
                      onMonthChange={setSelectedMonth}
                      className="rounded-md border"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                  disabled={isSubmitting}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                  disabled={isSubmitting}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* অ্যাটেনডেন্স টেবিল */}
            {selectedClass && selectedClass.students?.length > 0 ? (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-white min-width-[180px] z-10">Roll Number</TableHead>
                      <TableHead className="sticky left-[100px] bg-white min-w-[200px] z-10">Student Name</TableHead>
                      <TableHead className="sticky left-[300px] bg-white min-w-[80px] z-10">Stats</TableHead>
                      {days.map((day) => {
                        const isFuture = day > new Date();
                        return (
                          <TableHead key={day.toISOString()} className={cn("min-w-[60px] text-center", isFuture && "text-muted-foreground")}>
                            <div>{format(day, 'dd')}</div>
                            <div className="text-xs">{format(day, 'EEE')}</div>
                            {!isFuture && (
                              <div className="flex gap-1 justify-center mt-1">
                                <Button type="button" variant="ghost" size="sm" className="h-5 w-5 p-0 text-xs bg-green-100 hover:bg-green-200" onClick={() => handleMarkAll(day, true)}>P</Button>
                                <Button type="button" variant="ghost" size="sm" className="h-5 w-5 p-0 text-xs bg-red-100 hover:bg-red-200" onClick={() => handleMarkAll(day, false)}>A</Button>
                              </div>
                            )}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedClass.students.map((student: any) => {
                      const stats = calculateAttendance(student.id);
                      const rollNumber = getStudentRollNumber(student);
                      
                      return (
                        <TableRow key={student.id}>
                          <TableCell className="sticky left-0 bg-white font-medium">
                            {rollNumber}
                          </TableCell>
                          <TableCell className="sticky left-[100px] bg-white">
                            {student.name} {student.surname}
                          </TableCell>
                          <TableCell className="sticky left-[300px] bg-white text-xs text-gray-500">
                            {stats.present}/{stats.total}
                          </TableCell>
                          {days.map((day) => {
                            const dateKey = format(day, 'yyyy-MM-dd');
                            const isPresent = attendanceData[student.id]?.[dateKey] || false;
                            const isFuture = day > new Date();

                            return (
                              <TableCell key={`${student.id}-${dateKey}`} className="text-center">
                                <Checkbox
                                  checked={isPresent}
                                  onCheckedChange={(checked) => handleAttendanceChange(student.id, day, checked as boolean)}
                                  disabled={isSubmitting || isFuture}
                                  className={cn(
                                    "data-[state=checked]:bg-green-500",
                                    isPresent ? "border-green-500" : "border-gray-300",
                                    isFuture && "opacity-50 cursor-not-allowed"
                                  )}
                                />
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : selectedClass ? (
              <div className="text-center py-10 text-muted-foreground">No students in this class.</div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">Please select a class to view attendance.</div>
            )}

            {/* সাবমিট বাটন */}
            {selectedClass && selectedClass.students?.length > 0 && (
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isSubmitting} className="min-w-[150px]">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : "Save Attendance"}
                </Button>
              </div>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}