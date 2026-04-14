// components/forms/TeacherForm.tsx (fixed - submit button issue resolved)
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

const TeacherForm = ({ setOpen, relatedData, type, data }: {
  type: "create" | "update";
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: any;
}) => {
  const router = useRouter();
  const [imgUrl, setImgUrl] = useState(data?.img || "");
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
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
    { success: false, error: false, message: "" }
  );

  const onSubmit = handleSubmit((formData) => {
    const payload: TeacherSchema = {
      username: formData.username,
      name: formData.name,
      surname: formData.surname,
      address: formData.address,
      sex: formData.sex,
      birthday: formData.birthday,
      bloodType: formData.bloodType,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      subjects: formData.subjects || [],
      img: imgUrl || "",
      password: formData.password || undefined,
    };
    
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

  // Clear upload error after 5 seconds
  useEffect(() => {
    if (uploadError) {
      const timer = setTimeout(() => setUploadError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [uploadError]);

  return (
    <form className="flex flex-col gap-8 max-h-[90vh] overflow-y-auto px-2" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create a new teacher" : "Update teacher"}
      </h1>

      {/* Authentication Information */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <span className="text-xs text-gray-400 font-medium">Authentication Information</span>
        <div className="flex justify-between flex-wrap gap-4 mt-4">
          <InputField 
            label="Username" 
            name="username" 
            defaultValue={data?.username} 
            register={register} 
            error={errors.username} 
            
          />
          <InputField 
            label="Email"    
            name="email"    
            defaultValue={data?.email}    
            register={register} 
            error={errors.email} 
            type="email"
          />
          <InputField
            label={type === "update" ? "Password (leave blank to keep)" : "Password"}
            name="password" 
            type="password" 
            defaultValue=""
            register={register} 
            error={errors.password}
          />
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <span className="text-xs text-gray-400 font-medium">Personal Information</span>
        <div className="flex justify-between flex-wrap gap-4 mt-4">
          <InputField 
            label="First Name"  
            name="name"      
            defaultValue={data?.name}      
            register={register} 
            error={errors.name} 
         
          />
          <InputField 
            label="Last Name"   
            name="surname"   
            defaultValue={data?.surname}   
            register={register} 
            error={errors.surname} 
           
          />
          <InputField 
            label="Phone"       
            name="phone"     
            defaultValue={data?.phone}     
            register={register} 
            error={errors.phone} 
            type="tel"
          />
          <InputField 
            label="Address"     
            name="address"   
            defaultValue={data?.address}   
            register={register} 
            error={errors.address} 
            
          />
          <InputField 
            label="Blood Type"  
            name="bloodType" 
            defaultValue={data?.bloodType} 
            register={register} 
            error={errors.bloodType} 
          />
          <InputField
            label="Birthday" 
            name="birthday" 
            type="date"
            defaultValue={data?.birthday ? new Date(data.birthday).toISOString().split("T")[0] : ""}
            register={register} 
            error={errors.birthday} 
         
          />

          {/* Sex Dropdown */}
          <div className="flex flex-col gap-2 w-full md:w-1/4">
            <label className="text-xs text-gray-500">
              Sex <span className="text-red-500">*</span>
            </label>
            <select 
              className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full focus:ring-blue-400 outline-none" 
              {...register("sex")} 
              defaultValue={data?.sex ?? "MALE"}
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
            {errors.sex && <p className="text-xs text-red-400">{errors.sex.message}</p>}
          </div>

          {/* Subjects Multi-select */}
          <div className="flex flex-col gap-2 w-full md:w-1/4">
            <label className="text-xs text-gray-500">Subjects (Hold Ctrl to select multiple)</label>
            <select
              multiple
              size={4}
              className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full focus:ring-blue-400 outline-none"
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
            <p className="text-xs text-gray-400">Tip: Press Ctrl/Cmd to select multiple subjects</p>
          </div>

          {/* Photo Upload - FIXED VERSION with proper state management */}
          <div className="flex flex-col gap-2 w-full md:w-1/4">
            <label className="text-xs text-gray-500">Profile Picture</label>
            <CldUploadWidget
              uploadPreset="school_app"
              options={{
                maxFileSize: 100000,
                clientAllowedFormats: ["jpg", "jpeg", "png", "webp"],
                maxImageFileSize: 100000,
                cropping: true,
                croppingAspectRatio: 1,
                croppingDefaultSelectionRatio: 1,
                croppingShowDimensions: true,
                minImageWidth: 300,
                minImageHeight: 300,
                maxImageWidth: 300,
                maxImageHeight: 300,
                showAdvancedOptions: false,
                multiple: false,
                folder: "teacher_photos",
                tags: ["teacher", "profile"],
              }}
              onSuccess={(result: any, { widget }) => {
                const info = result.info;
                
                if (info.bytes > 100000) {
                  setUploadError(`Image size ${(info.bytes / 1024).toFixed(2)}KB exceeds 100KB limit`);
                  setIsUploading(false); // Important: Turn off uploading state on error
                  return;
                }
                
                if (info.width !== 300 || info.height !== 300) {
                  setUploadError(`Image must be 300x300px. Got ${info.width}x${info.height}`);
                  setIsUploading(false); // Important: Turn off uploading state on error
                  return;
                }
                
                setImgUrl(info.secure_url);
                setUploadError("");
                setIsUploading(false); // Important: Turn off uploading state on success
                widget.close();
                toast.success("Image uploaded successfully!");
              }}
              onError={(error) => {
                console.error("Upload error:", error);
                setUploadError("Upload failed. Please try again.");
                setIsUploading(false); // Important: Turn off uploading state on error
              }}
              onUploadAdded={() => {
                setIsUploading(true);
                setUploadError("");
              }}
              onClose={() => {
                // This ensures that if the widget is closed without uploading,
                // the uploading state is cleared
                setIsUploading(false);
              }}
            >
              {({ open }) => (
                <div>
                  <div 
                    className="text-xs text-gray-500 flex items-center gap-2 cursor-pointer hover:text-blue-500 transition-colors group"
                    onClick={() => open()}
                  >
                    <Image 
                      src="/upload.svg" 
                      alt="upload" 
                      width={28} 
                      height={28} 
                      unoptimized 
                      className="group-hover:scale-110 transition-transform"
                    />
                    <span className="group-hover:underline">
                      {isUploading ? "Uploading..." : "Upload a photo (300x300, max 100KB)"}
                    </span>
                  </div>
                  
                  {uploadError && (
                    <p className="text-red-500 text-xs mt-2 bg-red-50 p-2 rounded">
                      ⚠️ {uploadError}
                    </p>
                  )}
                </div>
              )}
            </CldUploadWidget>
            
            {/* Image Preview */}
            {imgUrl && (
              <div className="mt-3 relative inline-block">
                <div className="relative">
                  <Image 
                    src={imgUrl} 
                    alt="Preview" 
                    width={100} 
                    height={100} 
                    className="rounded-md object-cover border-2 border-green-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImgUrl("");
                      setValue("img", "");
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                    title="Remove image"
                  >
                    ×
                  </button>
                </div>
                <p className="text-green-500 text-xs mt-1">✓ Image uploaded</p>
              </div>
            )}
            
            <p className="text-gray-400 text-xs mt-1">
              Requirements: Square image (300x300), Max 100KB, JPG/PNG/WEBP
            </p>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex gap-4 justify-end sticky bottom-0 bg-white py-4 border-t">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          Cancel
        </button>
        <button 
          type="submit" 
          className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isUploading}
        >
          {isUploading ? "Uploading Image..." : (type === "create" ? "Create Teacher" : "Update Teacher")}
        </button>
      </div>
    </form>
  );
};

export default TeacherForm;