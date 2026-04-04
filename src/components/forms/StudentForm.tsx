// components/forms/StudentForm.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useFormState } from "react-dom";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import Image from "next/image";
import { CldUploadWidget } from "next-cloudinary";

import InputField from "../InputField";
import { studentSchema, type StudentSchema } from "@/lib/FormValidationSchema";
import { createStudent, updateStudent } from "@/Actions/studentAction/studentAction";

type Props = {
  setOpen:     Dispatch<SetStateAction<boolean>>;
  relatedData: { 
    classes?: { id: number; name: string; capacity?: number }[];
    grades?: { id: number; level: string }[];
    parents?: { id: string; name: string; surname: string }[];
  };
  type:        "create" | "update";
  data?:       any;
};

const StudentForm = ({ setOpen, relatedData, type, data }: Props) => {
  const router = useRouter();
  const [imgUrl, setImgUrl] = useState<string | undefined>(data?.img);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StudentSchema>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      id:        data?.id ?? undefined,
      username:  data?.username   ?? "",
      name:      data?.name       ?? "",
      surname:   data?.surname    ?? "",
      email:     data?.email      ?? "",
      phone:     data?.phone      ?? "",
      address:   data?.address    ?? "",
      bloodType: data?.bloodType  ?? "",
      sex:       data?.sex        ?? "MALE",
      birthday:  data?.birthday
        ? new Date(data.birthday).toISOString().split("T")[0]
        : "",
      gradeId:   data?.gradeId    ?? 0,
      classId:   data?.classId    ?? 0,
      parentId:  data?.parentId   ?? "",
      password:  "",
    },
  });

  const [state, formAction] = useFormState(
    type === "create" ? createStudent : updateStudent,
    { success: false, error: false, message: "" }
  );

  const onSubmit = handleSubmit((formData) => {
    const payload: StudentSchema = {
      username: formData.username,
      name: formData.name,
      surname: formData.surname,
      address: formData.address,
      sex: formData.sex,
      birthday: formData.birthday,
      bloodType: formData.bloodType,
      gradeId: formData.gradeId,
      classId: formData.classId,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      parentId: formData.parentId || undefined,
      img: imgUrl || "",
      password: formData.password || undefined,
    };
    
    // Only add id for update
    if (type === "update" && data?.id) {
      payload.id = data.id;
    }
    
    formAction(payload);
  });

  useEffect(() => {
    if (state.success) {
      toast.success(`Student ${type === "create" ? "created" : "updated"} successfully!`);
      setOpen(false);
      router.refresh();
    }
    if (state.error) {
      toast.error(state.message || `Failed to ${type === "create" ? "create" : "update"} student.`);
    }
  }, [state, router, setOpen, type]);

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create a new student" : "Update student"}
      </h1>

      <span className="text-xs text-gray-400 font-medium">Authentication Information</span>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField label="Username" name="username" defaultValue={data?.username} register={register} error={errors.username} />
        <InputField label="Email"    name="email"    defaultValue={data?.email}    register={register} error={errors.email} />
        <InputField
          label={type === "update" ? "Password (leave blank to keep)" : "Password"}
          name="password" type="password" defaultValue=""
          register={register} error={errors.password}
        />
      </div>

      <span className="text-xs text-gray-400 font-medium">Personal Information</span>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField label="First Name"  name="name"      defaultValue={data?.name}      register={register} error={errors.name} />
        <InputField label="Last Name"   name="surname"   defaultValue={data?.surname}   register={register} error={errors.surname} />
        <InputField label="Phone"       name="phone"     defaultValue={data?.phone}     register={register} error={errors.phone} />
        <InputField label="Address"     name="address"   defaultValue={data?.address}   register={register} error={errors.address} />
        <InputField label="Blood Type"  name="bloodType" defaultValue={data?.bloodType} register={register} error={errors.bloodType} />
        <InputField
          label="Birthday" name="birthday" type="date"
          defaultValue={data?.birthday ? new Date(data.birthday).toISOString().split("T")[0] : ""}
          register={register} error={errors.birthday}
        />

        {/* Grade */}
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Grade</label>
          <select 
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full" 
            {...register("gradeId", { valueAsNumber: true })} 
            defaultValue={data?.gradeId || 0}
          >
            <option value={0}>Select Grade</option>
            {relatedData?.grades?.map((grade) => (
              <option value={grade.id} key={grade.id}>{grade.level}</option>
            ))}
          </select>
          {errors.gradeId && <p className="text-xs text-red-400">{errors.gradeId.message}</p>}
        </div>

        {/* Class */}
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Class</label>
          <select 
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full" 
            {...register("classId", { valueAsNumber: true })} 
            defaultValue={data?.classId || 0}
          >
            <option value={0}>Select Class</option>
            {relatedData?.classes?.map((cls) => (
              <option value={cls.id} key={cls.id}>{cls.name}</option>
            ))}
          </select>
          {errors.classId && <p className="text-xs text-red-400">{errors.classId.message}</p>}
        </div>

        {/* Parent */}
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Parent</label>
          <select 
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full" 
            {...register("parentId")} 
            defaultValue={data?.parentId || ""}
          >
            <option value="">No Parent</option>
            {relatedData?.parents?.map((parent) => (
              <option value={parent.id} key={parent.id}>{parent.name} {parent.surname}</option>
            ))}
          </select>
          {errors.parentId && <p className="text-xs text-red-400">{errors.parentId.message}</p>}
        </div>

        {/* Sex */}
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Sex</label>
          <select className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full" {...register("sex")} defaultValue={data?.sex ?? "MALE"}>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
          {errors.sex && <p className="text-xs text-red-400">{errors.sex.message}</p>}
        </div>

        {/* Photo Upload */}
        <div className="flex flex-col gap-2 w-full md:w-1/4 justify-center">
          <CldUploadWidget
            uploadPreset="school_app"
            onSuccess={(result: any, { widget }) => {
              setImgUrl(result.info.secure_url);
              widget.close();
            }}
          >
            {({ open }) => (
              <div className="text-xs text-gray-500 flex items-center gap-2 cursor-pointer" onClick={() => open()}>
                <Image src="/upload.svg" alt="upload" width={28} height={28} unoptimized />
                <span>Upload a photo</span>
              </div>
            )}
          </CldUploadWidget>
          {(imgUrl || data?.img) && (
            <Image 
              src={imgUrl || data?.img} 
              alt="preview" 
              width={120} 
              height={120} 
              className="rounded-md object-cover mt-2" 
            />
          )}
          {errors.img && <p className="text-xs text-red-400">{errors.img.message}</p>}
        </div>
      </div>

      <button type="submit" className="bg-blue-400 text-white p-2 rounded-md hover:bg-blue-500 transition-colors">
        {type === "create" ? "Create Student" : "Update Student"}
      </button>
    </form>
  );
};

export default StudentForm;