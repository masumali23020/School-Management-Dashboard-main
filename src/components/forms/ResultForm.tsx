"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";

import {  DayEnum, lessonSchema, LessonSchema, resultSchema, ResultSchema } from "../../lib/FormValidationSchema";

import { useFormState } from "react-dom";
import { Dispatch, SetStateAction, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { createResult, updateResult } from "../../Actions/ResultAction/ResultAction";

const ResultForm = ({
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
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResultSchema>({
    resolver: zodResolver(resultSchema),
    defaultValues: {
    score: data?.score || "",
    studentId: data?.studentId || "",
    examId: data?.examId || "",
    assignmentId: data?.assignmentId || "",
    id: data?.id || "",
  },
  });

  // AFTER REACT 19 IT'LL BE USEACTIONSTATE

  const [state, formAction] = useFormState(
    type === "create" ? createResult : updateResult,
    {
      success: false,
      error: false,
    }
  );

  const onSubmit = handleSubmit((data) => {
    console.log(data);
    formAction(data);
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(`Result has been ${type === "create" ? "created" : "updated"}!`);
      setOpen(false);
      router.refresh();
    }

    if(state.error){
        toast.error(`Failed to ${type === "create" ? "create" : "update"} result!`)
    }
  }, [state, router, type, setOpen]);

  const { exams,assignments,students } = relatedData;
  console.log("Related Data in ResultForm:", data)

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create a new result" : "Update the result"}
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Score"
          name="score"
       
          register={register}
          error={errors?.score}
        />
       
       

        {data && (
          <InputField
            label=""
            name="id"
            defaultValue={data?.id}
            register={register}
            error={errors?.id}
            type="hidden"
          />
        )}
        {/* Student */}
        <div className="flex flex-col gap-2 w-full md:w-1/3">
          <label className="text-xs text-gray-500">Student</label>
          <select
            {...register("studentId")}
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
      
          >
            <option value="">{data?.student?.name || "Select Student"}</option>
            {students?.map(
              (student: { id: string; name: string }) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              )
            )}
          </select>
          {errors.studentId?.message && (
            <p className="text-xs text-red-400">
              {errors.studentId.message.toString()}
            </p>
          )}
        </div>

        {/* Exam */}
        <div className="flex flex-col gap-2 w-full md:w-1/3">
          <label className="text-xs text-gray-500"> "Exam (Optional)</label>
          <select
            {...register("examId")}
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
        
          >
            <option value="">{data?.exam?.title || "No Exam Selected"}</option>
            {exams?.map((exam: { id: number; title: string }) => (
              <option key={exam.id} value={exam.id}>
                {exam.title}
              </option>
            ))}
          </select>
          {errors.examId?.message && (
            <p className="text-xs text-red-400">
              {errors.examId.message.toString()}
            </p>
          )}
        </div>

        {/* Assignment */}
        <div className="flex flex-col gap-2 w-full md:w-1/3">
          <label className="text-xs text-gray-500">
            Assignment (Optional)
          </label>
          <select
            {...register("assignmentId")}
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
 
          >
            <option value=""> {data?.assignment?.title || "Assignment (Optional)"}</option>
            {assignments?.map(
              (assignment: { id: number; title: string }) => (
                <option key={assignment.id} value={assignment.id}>
                  {assignment.title}
                </option>
              )
            )}
          </select>
          {errors.assignmentId?.message && (
            <p className="text-xs text-red-400">
              {errors.assignmentId.message.toString()}
            </p>
          )}
        </div>

      </div>
      {state.error && (
        <span className="text-red-500">Something went wrong!</span>
      )}
      <button className="bg-blue-400 text-white p-2 rounded-md">
        {type === "create" ? "Create" : "Update"}
      </button>
    </form>
  );
};

export default ResultForm;
