"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import { useFormState } from "react-dom";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { assignmentSchema, AssignmentSchema } from "../../lib/FormValidationSchema";
import { createAssignment, updateAssignment } from "../../Actions/AssignmentAction/AssignmentAction";

// Custom Submit Button Component with Loading Animation
const SubmitButton = ({ 
  isLoading, 
  isDisabled, 
  type 
}: { 
  isLoading: boolean; 
  isDisabled: boolean;
  type: "create" | "update";
}) => {
  return (
    <button 
      type="submit"
      disabled={isDisabled || isLoading}
      className={`
        relative p-2 rounded-md text-white font-medium
        transition-all duration-200 ease-in-out
        ${(isDisabled || isLoading) 
          ? "bg-gray-400 cursor-not-allowed" 
          : "bg-blue-500 hover:bg-blue-600 active:scale-95"
        }
      `}
    >
      {isLoading ? (
        <div className="flex items-center justify-center gap-2">
          {/* Spinner Animation */}
          <svg 
            className="animate-spin h-5 w-5 text-white" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Processing...</span>
        </div>
      ) : (
        <span>{type === "create" ? "Create Assignment" : "Update Assignment"}</span>
      )}
    </button>
  );
};

const AssignmentForm = ({
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
  const [selectedLesson, setSelectedLesson] = useState<number | null>(data?.lessonId || null);
  const [lessonHasAssignment, setLessonHasAssignment] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<AssignmentSchema>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      id: data?.id,
      title: data?.title,
      dueDate: data?.dueDate ? new Date(data.dueDate) : undefined,
      lessonId: data?.lessonId,
    },
  });

  const watchedLessonId = watch("lessonId");

  // Check if selected lesson already has an assignment
  useEffect(() => {
    if (watchedLessonId && relatedData?.lessonsWithAssignments) {
      const hasAssignment = relatedData.lessonsWithAssignments.includes(watchedLessonId);
      setLessonHasAssignment(hasAssignment);
    }
  }, [watchedLessonId, relatedData]);

  const [state, formAction] = useFormState(
    type === "create" ? createAssignment : updateAssignment,
    {
      success: false,
      error: false,
      message: "",
    }
  );

  const onSubmit = handleSubmit(async (data) => {
    setIsSubmitting(true);
    const formattedData = {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : new Date(),
    };
    await formAction(formattedData);
    // Small delay to ensure state updates
    setTimeout(() => setIsSubmitting(false), 500);
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast.success(`Assignment has been ${type === "create" ? "created" : "updated"}!`);
      setTimeout(() => {
        setOpen(false);
        router.refresh();
      }, 1000);
    } else if (state.error && state.message) {
      toast.error(state.message);
      setIsSubmitting(false);
    }
  }, [state, router, type, setOpen]);

  const { lessons } = relatedData;
  const rawLessons = relatedData?.lessons || [];

  // Flatten lessons array
  const lessonsAssignment = rawLessons.flatMap((item: any) =>
    item.lessons ? item.lessons : item
  );

  // Get lessons that don't have assignments yet (for create mode)
  const availableLessons = type === "create" 
    ? lessonsAssignment.filter((lesson: any) => 
        !relatedData?.lessonsWithAssignments?.includes(lesson.id)
      )
    : lessonsAssignment;

  const isButtonDisabled = (lessonHasAssignment && type === "create") || isSubmitting;

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create a new assignment" : "Update the assignment"}
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Assignment title"
          name="title"
          defaultValue={data?.title}
          register={register}
          error={errors?.title}
        />
 
        <InputField
          label="Due Date"
          name="dueDate"
          defaultValue={data?.dueDate ? new Date(data.dueDate).toISOString().slice(0, 16) : undefined}
          register={register}
          error={errors?.dueDate}
          type="datetime-local"
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

        <div className="w-full">
          <select
            className={`ring-[1.5px] p-2 rounded-md text-sm w-full ${
              lessonHasAssignment && type === "create" 
                ? "ring-red-500 bg-red-50" 
                : "ring-gray-300"
            }`}
            {...register("lessonId", { valueAsNumber: true })}
            onChange={(e) => setSelectedLesson(parseInt(e.target.value))}
            disabled={isSubmitting}
          >
            <option value="">Select Lesson</option>
            {availableLessons.map((lesson: any) => (
              <option key={lesson.id} value={lesson.id}>
                {lesson.name} - {lesson.class?.name || "No Class"}
              </option>
            ))}
          </select>
          
          {lessonHasAssignment && type === "create" && (
            <p className="text-red-500 text-sm mt-1">
              ⚠️ This lesson already has an assignment! Only one assignment allowed per lesson.
            </p>
          )}
        </div>
      </div>

      {state.error && state.message && (
        <span className="text-red-500">{state.message}</span>
      )}

      {state.success && (
        <span className="text-green-500">{state.message}</span>
      )}

      <SubmitButton 
        isLoading={isSubmitting}
        isDisabled={isButtonDisabled}
        type={type}
      />
    </form>
  );
};

export default AssignmentForm;