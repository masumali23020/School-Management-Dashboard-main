// components/forms/TeacherForm.tsx (fixed)
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
import { teacherSchema, type TeacherSchema } from "@/lib/FormValidationSchema";
import { createTeacher, updateTeacher } from "@/Actions/TeacherActions/teacherActions";

type Props = {
  setOpen:     Dispatch<SetStateAction<boolean>>;
  relatedData: { subjects?: { id: number; name: string }[] };
  type:        "create" | "update";
  data?:       any;
};

const TeacherForm = ({ setOpen, relatedData, type, data }: Props) => {
  const router = useRouter();
  const [imgUrl, setImgUrl] = useState<string | undefined>(data?.img);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TeacherSchema>({
    resolver: zodResolver(teacherSchema),
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
      subjects:  data?.subjects?.map((s: { id: number }) => String(s.id)) ?? [],
      password:  "",
    },
  });

  const [state, formAction] = useFormState(
    type === "create" ? createTeacher : updateTeacher,
    { success: false, error: false }
  );

  const onSubmit = handleSubmit((formData) => {
    // IMPORTANT: Ensure birthday remains as string, not Date
    const payload: TeacherSchema = {
      username: formData.username,
      name: formData.name,
      surname: formData.surname,
      address: formData.address,
      sex: formData.sex,
      birthday: formData.birthday, // This is already a string from the date input
      bloodType: formData.bloodType,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      subjects: formData.subjects || [],
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
      toast.success(`Teacher ${type === "create" ? "created" : "updated"} successfully!`);
      setOpen(false);
      router.refresh();
    }
    if (state.error) {
      toast.error(state.message ?? `Failed to ${type === "create" ? "create" : "update"} teacher.`);
    }
  }, [state, router, setOpen, type]);

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create a new teacher" : "Update teacher"}
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

        {/* Sex */}
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Sex</label>
          <select className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full" {...register("sex")} defaultValue={data?.sex ?? "MALE"}>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
          {errors.sex && <p className="text-xs text-red-400">{errors.sex.message}</p>}
        </div>

        {/* Subjects */}
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Subjects</label>
          <select
            multiple
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("subjects")}
            defaultValue={data?.subjects?.map((s: { id: number }) => String(s.id)) ?? []}
          >
            {relatedData?.subjects?.length ? (
              relatedData.subjects.map((s) => (
                <option value={String(s.id)} key={s.id}>{s.name}</option>
              ))
            ) : (
              <option disabled>No subjects found</option>
            )}
          </select>
          {errors.subjects && <p className="text-xs text-red-400">{errors.subjects.message}</p>}
        </div>

        {/* Photo */}
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
          {imgUrl && (
            <Image src={imgUrl} alt="preview" width={120} height={120} className="rounded-md object-cover mt-2" />
          )}
          {errors.img && <p className="text-xs text-red-400">{errors.img.message}</p>}
        </div>
      </div>

      <button type="submit" className="bg-blue-400 text-white p-2 rounded-md hover:bg-blue-500 transition-colors">
        {type === "create" ? "Create Teacher" : "Update Teacher"}
      </button>
    </form>
  );
};

export default TeacherForm;