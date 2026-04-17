// components/forms/LessonForm.tsx

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import { DayEnum, lessonSchema, LessonSchema } from "../../lib/FormValidationSchema";
import { useFormState } from "react-dom";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { createLesson, updateLesson } from "../../Actions/loessonAction/LessonAction";

const LessonForm = ({
  type,
  data,
  setOpen,
  relatedData,
}: {
  type: "create" | "update";
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: any;
}) => {

const [selectedClass, setSelectedClass] = useState<number | string>(data?.classId || "");
  const [filteredAssignments, setFilteredAssignments] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LessonSchema>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      id: data?.id,
      name: data?.name || "",
      day: data?.day || "",
      startTime: data?.startTime ? new Date(data.startTime).toISOString().slice(0, 16) : "",
      endTime: data?.endTime ? new Date(data.endTime).toISOString().slice(0, 16) : "",
      classId: data?.classId || undefined,
      subjectId: data?.subjectId || "",
      teacherId: data?.teacherId || "",
      classSubjectTeacherId: data?.classSubjectTeacherId || "",
    },
  });

  const [state, formAction] = useFormState(
    type === "create" ? createLesson : updateLesson,
    {
      success: false,
      error: false,
      message: "",
    }
  );

  const router = useRouter();

  // Watch for class changes to filter assignments
  const watchClassId = watch("classId");

  useEffect(() => {
    if (watchClassId && relatedData?.assignments) {
      const filtered = relatedData.assignments.filter(
        (assignment: any) => assignment.classId === parseInt(watchClassId.toString())
      );
      setFilteredAssignments(filtered);
      
      // Clear selected assignment if it doesn't belong to this class
      if (data?.classSubjectTeacherId) {
        const stillExists = filtered.some(
          (a: any) => a.id === data.classSubjectTeacherId
        );
        if (!stillExists) {
          setValue("classSubjectTeacherId", 0);
        }
      }
    } else {
      setFilteredAssignments([]);
    }
  }, [watchClassId, relatedData, setValue, data]);

  const onSubmit = handleSubmit((formData) => {
    formAction(formData);
   
  });
    useEffect(() => {
    if (state.success) {
      toast(
        `Lesson has been ${type === "create" ? "created successfully" : "updated successfully"}!`,
      );
      setOpen(false);
      router.refresh();
    }
    if(state.error){
      toast.error(`Error ${type === "create" ? "creating" : "updating"} Lesson. Please try again.`);
    }

  }, [state, router, setOpen, type]);



  const { classes, subjects, teachers, assignments } = relatedData || {};

  return (
    <form className="flex flex-col gap-8 p-4" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create a new lesson" : "Update the lesson"}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Lesson Name */}
        <InputField
          label="Lesson Name *"
          name="name"
          defaultValue={data?.name}
          register={register}
          error={errors?.name}
          
        />

        {/* Day Selection */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500 font-medium">
            Day <span className="text-red-500">*</span>
          </label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full bg-white"
            {...register("day")}
            defaultValue={data?.day}
          >
            <option value="">Select Day</option>
            {DayEnum.options.map((day) => (
              <option value={day} key={day}>
                {day}
              </option>
            ))}
          </select>
          {errors.day?.message && (
            <p className="text-xs text-red-400">{errors.day.message}</p>
          )}
        </div>

        {/* Start Time */}
        <InputField
          label="Start Time *"
          name="startTime"
          defaultValue={data?.startTime ? new Date(data.startTime).toISOString().slice(0, 16) : ""}
          register={register}
          error={errors?.startTime}
          type="datetime-local"
        />

        {/* End Time */}
        <InputField
          label="End Time *"
          name="endTime"
          defaultValue={data?.endTime ? new Date(data.endTime).toISOString().slice(0, 16) : ""}
          register={register}
          error={errors?.endTime}
          type="datetime-local"
        />

        {/* Class Selection */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500 font-medium">
            Class <span className="text-red-500">*</span>
          </label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full bg-white"
            {...register("classId")}
            defaultValue={data?.classId}
          >
            <option value="">Select Class</option>
            {classes?.map((classItem: { id: number; name: string; grade?: { level: number } }) => (
              <option value={classItem.id} key={classItem.id}>
                {classItem.name} {classItem.grade && `(Grade ${classItem.grade.level})`}
              </option>
            ))}
          </select>
          {errors.classId?.message && (
            <p className="text-xs text-red-400">{errors.classId.message}</p>
          )}
        </div>

        {/* Class-Subject-Teacher Assignment Selection */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500 font-medium">
            Subject & Teacher Assignment <span className="text-red-500">*</span>
          </label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full bg-white"
            {...register("classSubjectTeacherId")}
            defaultValue={data?.classSubjectTeacherId}
            disabled={!watchClassId}
          >
            <option value="">
              {watchClassId ? "Select subject & teacher" : "First select a class"}
            </option>
            {filteredAssignments.map((assignment: any) => (
              <option value={assignment.id} key={assignment.id}>
                {assignment.subject?.name} - {assignment.teacher?.name} {assignment.teacher?.surname} ({assignment.academicYear})
              </option>
            ))}
          </select>
          {errors.classSubjectTeacherId?.message && (
            <p className="text-xs text-red-400">{errors.classSubjectTeacherId.message}</p>
          )}
        </div>

        {/* Hidden fields for backward compatibility */}
        <input type="hidden" {...register("subjectId")} />
        <input type="hidden" {...register("teacherId")} />

        {/* Hidden ID field for update */}
        {type === "update" && (
          <input type="hidden" {...register("id")} />
        )}
      </div>

      {/* Display selected assignment details */}
      {watchClassId && filteredAssignments.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
          No subject-teacher assignments found for this class. Please create an assignment first.
        </div>
      )}

      {state.error && state.message && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {state.message}
        </div>
      )}

      <button
        type="submit"
        className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition"
      >
        {type === "create" ? "Create Lesson" : "Update Lesson"}
      </button>
    </form>
  );
};

export default LessonForm;