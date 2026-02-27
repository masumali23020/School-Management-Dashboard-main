// components/forms/BulkAttendanceForm.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { format, eachDayOfInterval, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { bulkAttendance } from "@/Actions/attendance/attendance";

interface BulkAttendanceFormProps {
  classData: any;
  month: Date;
  students: any[];
}

export default function BulkAttendanceForm({ classData, month, students }: BulkAttendanceFormProps) {
  const [attendanceData, setAttendanceData] = useState<Record<string, Record<string, boolean>>>({});
  const router = useRouter();

  const days = eachDayOfInterval({
    start: startOfMonth(month),
    end: endOfMonth(month)
  });

  // useFormState ব্যবহার
  const [state, formAction] = useFormState(bulkAttendance, {
    success: false,
    error: false,
    message: "",
  });

  // ইফেক্ট for state changes
  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      router.refresh();
    } else if (state.error && state.message) {
      toast.error(state.message);
    }
  }, [state, router]);

  // Initialize attendance data
  useEffect(() => {
    const initialData: Record<string, Record<string, boolean>> = {};
    
    students.forEach((student) => {
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
  }, [students, month]);

  const handleAttendanceChange = (studentId: string, date: Date, checked: boolean) => {
    setAttendanceData(prev => {
      const dateKey = format(date, 'yyyy-MM-dd');
      return {
        ...prev,
        [studentId]: {
          ...(prev[studentId] || {}),
          [dateKey]: checked,
        }
      };
    });
  };

  const handleMarkAll = (date: Date, value: boolean) => {
    setAttendanceData(prev => {
      const dateKey = format(date, 'yyyy-MM-dd');
      const updated = { ...prev };
      
      students.forEach((student) => {
        if (!updated[student.id]) {
          updated[student.id] = {};
        }
        updated[student.id][dateKey] = value;
      });
      
      return updated;
    });
  };

  const handleSubmit = async (formData: FormData) => {
    // অ্যাটেন্ডেন্স ডাটা প্রস্তুত করুন
    const attendances = [];
    
    for (const student of students) {
      for (const day of days) {
        const dateKey = format(day, 'yyyy-MM-dd');
        const isPresent = attendanceData[student.id]?.[dateKey] || false;
        
        const existingAttendance = student.attendances?.find(
          (att: any) => att && format(new Date(att.date), 'yyyy-MM-dd') === dateKey
        );

        attendances.push({
          id: existingAttendance?.id,
          studentId: student.id,
          lessonId: 1, // আপনার লজিক অনুযায়ী পরিবর্তন করুন
          date: day,
          present: isPresent,
        });
      }
    }

    // FormData এ ডাটা যোগ করুন
    formData.append("attendances", JSON.stringify(attendances));
    formAction(formData);
  };

  return (
    <form action={handleSubmit}>
      <input type="hidden" name="classId" value={classData.id} />
      <input type="hidden" name="month" value={month.toISOString()} />

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-white min-w-[200px] z-10">
                Student Name
              </TableHead>
              {days.map((day) => (
                <TableHead key={format(day, 'yyyy-MM-dd')} className="min-w-[80px] text-center">
                  <div className="space-y-2">
                    <div>{format(day, 'dd')}</div>
                    <div className="text-xs">{format(day, 'EEE')}</div>
                    <div className="flex gap-1 justify-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-xs bg-green-100"
                        onClick={() => handleMarkAll(day, true)}
                      >
                        P
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-xs bg-red-100"
                        onClick={() => handleMarkAll(day, false)}
                      >
                        A
                      </Button>
                    </div>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.id}>
                <TableCell className="sticky left-0 bg-white font-medium">
                  {student.name} {student.surname}
                </TableCell>
                {days.map((day) => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const isPresent = attendanceData[student.id]?.[dateKey] || false;
                  
                  return (
                    <TableCell key={`${student.id}-${dateKey}`} className="text-center">
                      <Checkbox
                        checked={isPresent}
                        onCheckedChange={(checked) => 
                          handleAttendanceChange(student.id, day, checked as boolean)
                        }
                        name={`attendance[${student.id}][${dateKey}]`}
                      />
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end gap-4 mt-4">
        <Button type="submit">
          Save All Attendance
        </Button>
      </div>
    </form>
  );
}