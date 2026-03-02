// components/forms/ClassSubjectTeacherForm.tsx

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { classSubjectTeacherSchema, ClassSubjectTeacherSchema } from "@/lib/FormValidationSchema";
import { useFormState } from "react-dom";
import { Dispatch, SetStateAction, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { createClassSubjectTeacher, updateClassSubjectTeacher } from "@/Actions/ClassSubjectTeacherActions/ClassSubjectTeacherActions";

const ClassSubjectTeacherForm = ({
  setOpen,
  type,
  data,
  relatedData,
}: {
  setOpen: Dispatch<SetStateAction<boolean>>;
  type: "create" | "update";
  data?: any;
  relatedData: any;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClassSubjectTeacherSchema>({
    resolver: zodResolver(classSubjectTeacherSchema),
    defaultValues: {
      id: data?.id,
      classId: data?.classId,
      subjectId: data?.subjectId,
      teacherId: data?.teacherId || "",
      academicYear: data?.academicYear || new Date().getFullYear().toString(),
    },
  });

  const [state, formAction] = useFormState(
    type === "create" ? createClassSubjectTeacher : updateClassSubjectTeacher,
    { 
      success: false, 
      error: false,
      message: "" 
    }
  );

  const router = useRouter();

  const onSubmit = handleSubmit((formData) => {
    formAction(formData);
  });

  useEffect(() => {
    if (state.success) {
      toast.success(state.message || `Assignment ${type === "create" ? "created" : "updated"} successfully!`);
      setOpen(false);
      router.refresh();
    }
    
    if (state.error && state.message) {
      toast.error(state.message);
    }
  }, [state, router, setOpen, type]);

  const { classes, subjects, teachers } = relatedData;

  return (
    <form className="flex flex-col gap-8 p-4" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" 
          ? "Assign Subject to Class with Teacher" 
          : "Update Assignment"}
      </h1>

      <div className="flex flex-wrap gap-4">
        {/* Class Select */}
        <div className="flex flex-col gap-2 w-full md:w-[48%]">
          <label className="text-xs text-gray-500 font-medium">
            Class <span className="text-red-500">*</span>
          </label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full bg-white"
            {...register("classId")}
            defaultValue={data?.classId || ""}
          >
            <option value="">Select a class</option>
            {classes?.map((cls: any) => (
              <option value={cls.id} key={cls.id}>
                {cls.name} (Grade {cls.grade?.level})
              </option>
            ))}
          </select>
          {errors.classId && (
            <p className="text-xs text-red-400">{errors.classId.message}</p>
          )}
        </div>

        {/* Subject Select */}
        <div className="flex flex-col gap-2 w-full md:w-[48%]">
          <label className="text-xs text-gray-500 font-medium">
            Subject <span className="text-red-500">*</span>
          </label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full bg-white"
            {...register("subjectId")}
            defaultValue={data?.subjectId || ""}
          >
            <option value="">Select a subject</option>
            {subjects?.map((subject: any) => (
              <option value={subject.id} key={subject.id}>
                {subject.name} {subject.code && `(${subject.code})`}
              </option>
            ))}
          </select>
          {errors.subjectId && (
            <p className="text-xs text-red-400">{errors.subjectId.message}</p>
          )}
        </div>

        {/* Teacher Select */}
        <div className="flex flex-col gap-2 w-full md:w-[48%]">
          <label className="text-xs text-gray-500 font-medium">
            Teacher <span className="text-red-500">*</span>
          </label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full bg-white"
            {...register("teacherId")}
            defaultValue={data?.teacherId || ""}
          >
            <option value="">Select a teacher</option>
            {teachers?.map((teacher: any) => (
              <option value={teacher.id} key={teacher.id}>
                {teacher.name} {teacher.surname}
              </option>
            ))}
          </select>
          {errors.teacherId && (
            <p className="text-xs text-red-400">{errors.teacherId.message}</p>
          )}
        </div>

        {/* Academic Year */}
        <div className="flex flex-col gap-2 w-full md:w-[48%]">
          <label className="text-xs text-gray-500 font-medium">
            Academic Year <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            placeholder="e.g., 2024 or 2024-2025"
            {...register("academicYear")}
            defaultValue={data?.academicYear || new Date().getFullYear().toString()}
          />
          {errors.academicYear && (
            <p className="text-xs text-red-400">{errors.academicYear.message}</p>
          )}
        </div>

        {type === "update" && (
          <input type="hidden" {...register("id")} />
        )}
      </div>

      {state.error && state.message && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {state.message}
        </div>
      )}

      <button
        type="submit"
        className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition"
      >
        {type === "create" ? "Create Assignment" : "Update Assignment"}
      </button>
    </form>
  );
};

export default ClassSubjectTeacherForm;