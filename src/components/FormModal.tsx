"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { deleteSubject } from "../Actions/SubjectAction/Action";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { FormContainerProps } from "./FormContainer";

import { deleteClass } from "../Actions/ClassActions/classAction";
import { deleteTeacher } from "../Actions/TeacherActions/teacherActions";
import { deleteStudent } from "../Actions/studentAction/studentAction";
import { deleteExam } from "../Actions/ExamAction/EcamAction";

import { deleteAssignment } from "../Actions/AssignmentAction/AssignmentAction";
import { deleteEvent } from "../Actions/EventAction/EventAction";

import { deleteAnnouncement } from "../Actions/AnnousmentAction/AnnousmentAction";

import { deleteLesson } from "../Actions/loessonAction/LessonAction";

import { deleteResult } from "../Actions/ResultAction/ResultAction";
// import AttendanceForm from "./forms/AttendanceForm";


// USE LAZY LOADING
// import ClassForm from "./forms/ClassForm";
// import TeacherForm from "./forms/TeacherForm";
// import StudentForm from "./forms/StudentForm";
// import SubjectForm from "./forms/SubjectForm";
// import ExamForm from "./forms/ExamForm";
// import AssignmentForm from "./forms/AssingnmentForm";
// import EventForm from "./forms/EventForm";
// import AnnousmentForm from "./forms/AnnousmentForm";

const TeacherForm = dynamic(() => import("./forms/TeacherForm"), {
  loading: () => <h1>Loading...</h1>,
});
const StudentForm = dynamic(() => import("./forms/StudentForm"), {
  loading: () => <h1>Loading...</h1>,
});
const SubjectForm = dynamic(() => import("./forms/SubjectForm"), {
  loading: () => <h1>Loading...</h1>,
});
const ClassForm = dynamic(() => import("./forms/ClassForm"), {
  loading: () => <h1>Loading...</h1>,
});

const ExamForm = dynamic(() => import("./forms/ExamForm"), {
  loading: () => <h1>Loading...</h1>,
});
const AssignmentForm = dynamic(() => import("./forms/AssingnmentForm"), {
  loading: () => <h1>Loading...</h1>,
});
const AnnousmentForm = dynamic(() => import("./forms/AnnousmentForm"), {
  loading: () => <h1>Loading...</h1>,
});
const EventForm = dynamic(() => import("./forms/EventForm"), {
  loading: () => <h1>Loading...</h1>,
});
const LessonForm = dynamic(() => import("./forms/LessonForm"), {
  loading: () => <h1>Loading...</h1>,
});
const ResultForm = dynamic(() => import("./forms/ResultForm"), {
  loading: () => <h1>Loading...</h1>,
});


const deleteActionMap = {
  subject: deleteSubject,
  class: deleteClass,
  teacher: deleteTeacher,
  student: deleteStudent,
  exam: deleteExam,
  // TODO: OTHER DELETE ACTIONS
  // parent: deleteSubject,
  lesson: deleteLesson,
  assignment: deleteAssignment,
  result: deleteResult,
  // attendance: deleteSubject,
  event: deleteEvent,
  announcement: deleteAnnouncement,
};

const forms: {
  [key: string]: (
    setOpen: Dispatch<SetStateAction<boolean>>,
    relatedData: any,
    type: "create" | "update",
    data?: any,
  ) => JSX.Element;
} = {
teacher: (
  setOpen,
  relatedData,
  type,
  data
) => (
  <TeacherForm
    type={type}
    data={data}
    setOpen={setOpen}
    relatedData={relatedData}
  />
),
  class: (setOpen, relatedData, type, data) => (
    <ClassForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  student: (setOpen, relatedData, type, data) => (
    <StudentForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  subject: (setOpen, relatedData, type, data) => (
    <SubjectForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  exam: (setOpen, relatedData, type, data) => (
    <ExamForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  assignment: (setOpen, relatedData, type, data) => (
    <AssignmentForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  event: (setOpen, relatedData, type, data) => (
    <EventForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  announcement: (setOpen, relatedData, type, data) => (
    <AnnousmentForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
   
  ),
  lesson: (setOpen, relatedData, type, data) => (
    <LessonForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
   
  ),
  result: (setOpen, relatedData, type, data) => (
    <ResultForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
   
  ),
  
};

const FormModal = ({
  table,
  type,
  data,
  id,
  relatedData,
}: FormContainerProps & { relatedData: any }) => {
  const size = type === "create" ? "w-8 h-8" : "w-7 h-7";
  const bgColor =
    type === "create"
      ? "bg-lamaYellow"
      : type === "update"
        ? "bg-lamaSky"
        : "bg-lamaPurple";

  const [open, setOpen] = useState(false);

  const Form = () => {
    const [state, formAction] = useFormState(deleteActionMap[table], {
      success: false,
      error: false,
    });

    const router = useRouter();

    useEffect(() => {
      if (state.success) {
        toast(`${table} has been deleted!`);
        setOpen(false);
        router.refresh();
      }
    }, [state, router]);

    return type === "delete" && id ? (
      <form action={formAction} className="p-4 flex flex-col gap-4">
        <input type="text | number" name="id" value={id} hidden />
        <span className="text-center font-medium">
          All data will be lost. Are you sure you want to delete this {table}?
        </span>
        <button className="bg-red-700 text-white py-2 px-4 rounded-md border-none w-max self-center">
          Delete
        </button>
      </form>
    ) : type === "create" || type === "update" ? (
      forms[table](setOpen, relatedData, type, data)
    ) : (
      "Form not found!"
    );
  };

  return (
    <>
      <button
        className={`${size} flex items-center justify-center rounded-full ${bgColor}`}
        onClick={() => setOpen(true)}
      >
        <Image src={`/${type}.png`} alt="" width={16} height={16} />
      </button>
      {open && (
        <div className="w-screen h-screen absolute left-0 top-0 bg-black bg-opacity-60 z-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-md relative w-[90%] md:w-[70%] lg:w-[60%] xl:w-[50%] 2xl:w-[40%]">
            <Form />
            <div
              className="absolute top-4 right-4 cursor-pointer"
              onClick={() => setOpen(false)}
            >
              <Image src="/close.png" alt="" width={14} height={14} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
export default FormModal;
