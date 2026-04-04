// components/forms/GradeForm.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import { useFormState } from "react-dom";
import { Dispatch, SetStateAction, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { createGrade, updateGrade } from "@/Actions/GradeActions/GradeActions";
import { gradeSchema, type GradeSchema } from "@/lib/FormValidationSchema";

const GradeForm = ({
  type,
  data,
  setOpen,
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
  } = useForm<GradeSchema>({
    resolver: zodResolver(gradeSchema),
    defaultValues: {
      id: data?.id,
      level: data?.level || "",
    },
  });

  const [state, formAction] = useFormState(
    type === "create" ? createGrade : updateGrade,
    {
      success: false,
      error: false,
      message: "",
    }
  );

  const onSubmit = handleSubmit((formData) => {
    const payload: GradeSchema = {
      level: formData.level,
    };
    
    // Only add id for update
    if (type === "update" && data?.id) {
      payload.id = data.id;
    }
    
    formAction(payload);
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast.success(`Grade has been ${type === "create" ? "created" : "updated"} successfully!`);
      setOpen(false);
      router.refresh();
    }
    if (state.error) {
      toast.error(state.message || `Failed to ${type === "create" ? "create" : "update"} grade!`);
    }
  }, [state, router, type, setOpen]);

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create a new Grade" : "Update the Grade"}
      </h1>
      
      <span className="text-xs text-gray-400 font-medium">
        Grade Information
      </span>
      
      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Grade Level"
          name="level"
          defaultValue={data?.level}
          register={register}
          error={errors?.level}
       
        />
        
        {/* Hidden ID field for update */}
        {type === "update" && data?.id && (
          <input type="hidden" {...register("id")} value={data.id} />
        )}
      </div>
      
      {state.error && (
        <span className="text-red-500 text-sm">{state.message}</span>
      )}
      
      <button 
        type="submit" 
        className="bg-blue-400 text-white p-2 rounded-md hover:bg-blue-500 transition-colors"
      >
        {type === "create" ? "Create Grade" : "Update Grade"}
      </button>
    </form>
  );
};

export default GradeForm;