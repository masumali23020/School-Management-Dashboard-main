"use client";

import { useState } from "react";
import FormContainer from "./FormContainer";


type Props = {
  teacher: any;
  role: string;
};

const TeacherEditButton = ({ teacher, role }: Props) => {
  const [open, setOpen] = useState(false);

  if (role !== "admin") return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
      >
        Edit
      </button>

      {open && (
        <FormContainer
          table="teacher"
          type="update"
          data={teacher}
          open={open}
          setOpen={setOpen}
        />
      )}
    </>
  );
};

export default TeacherEditButton;