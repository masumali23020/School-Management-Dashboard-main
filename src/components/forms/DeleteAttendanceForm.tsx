// components/forms/DeleteAttendanceForm.tsx
"use client";

import { Dispatch, SetStateAction, useEffect } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";


import { Button } from "@/components/ui/button";
import { deleteAttendance } from "@/Actions/attendance/attendance";

const DeleteAttendanceForm = ({
  id,
  setOpen,
}: {
  id: number;
  setOpen: Dispatch<SetStateAction<boolean>>;
}) => {
  const [state, formAction] = useFormState(deleteAttendance, {
    success: false,
    error: false,
    message: "",
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast.success(state.message || "Attendance deleted successfully!");
      setOpen(false);
      router.refresh();
    } else if (state.error && state.message) {
      toast.error(state.message);
    }
  }, [state, router, setOpen]);

  return (
    <form action={formAction} className="p-4 space-y-4">
      <input type="hidden" name="id" value={id} />
      
      <p className="text-center">Are you sure you want to delete this attendance record?</p>
      
      <div className="flex gap-2 justify-center">
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button type="submit" variant="destructive">
          Delete
        </Button>
      </div>
    </form>
  );
};

export default DeleteAttendanceForm;