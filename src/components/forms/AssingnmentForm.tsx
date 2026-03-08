"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import Image from "next/image";


import { useFormState } from "react-dom";
import { Dispatch, SetStateAction, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { assignmentSchema, AssignmentSchema } from "../../lib/FormValidationSchema";
import { createAssignment, updateAssignment } from "../../Actions/AssignmentAction/AssignmentAction";

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
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AssignmentSchema>({
    resolver: zodResolver(assignmentSchema),
     defaultValues: {
      id: data?.id,
      title: data?.title,
      startDate: data?.startDate,
      dueDate: data?.dueDate,
      lessonId: data?.lessonId,
    },
  });

  // AFTER REACT 19 IT'LL BE USEACTIONSTATE

  const [state, formAction] = useFormState(
    type === "create" ? createAssignment : updateAssignment,
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
      toast(`Exam has been ${type === "create" ? "created" : "updated"}!`);
      setOpen(false);
      router.refresh();
    }
  }, [state, router, type, setOpen]);

  const { lessons } = relatedData;
  console.log("lessons ass ", relatedData);
  const rawLessons = relatedData?.lessons || [];

// যদি nested থাকে তাহলে flatten করবো
const lessonsAssignment = rawLessons.flatMap((item: any) =>
  item.lessons ? item.lessons : item
);

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
          label="Start Date"
          name="startDate"
          defaultValue={data?.startDate.toString().slice(0, 16)}
          register={register}
          error={errors?.startDate}
          type="datetime-local"
        />
        <InputField
          label="Due Date"
          name="dueDate"
          defaultValue={data?.dueDate}
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
    <select
  className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
  {...register("lessonId", { valueAsNumber: true })}
>
  <option value="">Select Lesson</option>

  {lessonsAssignment.map((lesson: any) => (
    <option key={lesson.id} value={lesson.id}>
      {lesson.name}
    </option>
  ))}
</select>
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

export default AssignmentForm;
