"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import Image from "next/image";
import { SubjectSchema, subjectSchema } from "../../lib/FormValidationSchema";
import { createSubject } from "../../Actions/SubjectAction/Action";
import { useFormState } from "react-dom";
import { Dispatch, SetStateAction, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";




const SubjectForm = ({
  setOpen,
  type,
  data,
}: {
  setOpen:Dispatch<SetStateAction<boolean>>;
  type: "create" | "update";
  data?: any;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SubjectSchema>({
    resolver: zodResolver(subjectSchema),
  });
  
  const [state, formAction] = useFormState(
    createSubject ,
    {
      success: false,
      error: false,
    }
  );
const router = useRouter()
  

  const onSubmit = handleSubmit((data) => {
    // console.log("subject data ", data);
    formAction(data)
  });

useEffect(() => {
    if(state.success){
       toast(`Subject has been ${type === "create" ? "created successfully" : "updated successfully"}!`);
       setOpen(false)
       router.refresh()
       

      
    }

  },[state])


  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">{ type === "create" ? "Create a new subject" : "Update Subject"}</h1>
      
      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Subject Name"
          name="name"
          defaultValue={data?.name}
          register={register}
          error={errors?.name}         
        />
        

        
      </div>
      {state.error && <span className="text-red-500 text-sm">Error creating subject. Please try again.</span>}
     
      <button className="bg-blue-400 text-white p-2 rounded-md">
        {type === "create" ? "Create" : "Update"}
      </button>
    </form>
  );
};



export default SubjectForm