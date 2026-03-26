"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useFormState } from "react-dom";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { parentSchema, ParentSchema } from "@/lib/FormValidationSchema";
import { createParent, updateParent } from "@/Actions/ParentActions/ParentActions";
import InputField from "../InputField";

const ParentForm = ({
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
    setValue,
  } = useForm<ParentSchema>({
    resolver: zodResolver(parentSchema),
    defaultValues: {
      ...(type === "update" && data ? {
        id: data.id,
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email,
        phone: data.phone,
        address: data.address,
      } : {})
    }
  });

  // State for selected classes and students
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>(
    data?.students?.map((s: any) => s.id) || []
  );
  
  // Store students by class
  const [studentsByClass, setStudentsByClass] = useState<Record<string, any[]>>({});

  const [state, formAction] = useFormState(
    type === "create" ? createParent : updateParent,
    {
      success: false,
      error: false,
    }
  );

  const onSubmit = handleSubmit((formData) => {
    console.log("Form submitted with data:", formData);
    console.log("Selected students:", selectedStudents);
    formAction({ ...formData, studentIds: selectedStudents });
  });

  const router = useRouter();

  // এই useEffect টি সঠিকভাবে কাজ করবে
  useEffect(() => {
    if (state.success) {
      toast.success(`Parent has been ${type === "create" ? "created" : "updated"} successfully!`);
      setOpen(false); // Modal close হবে
      router.refresh(); // Page refresh হবে
    }
    if (state.error) {
      toast.error(`Failed to ${type === "create" ? "create" : "update"} parent!`);
    }
  }, [state, router, type, setOpen]);

  // Update form value when selectedStudents change
  useEffect(() => {
    setValue("studentIds", selectedStudents);
  }, [selectedStudents, setValue]);

  // Organize students by class
  useEffect(() => {
    if (relatedData?.students) {
      const byClass: Record<string, any[]> = {};
      relatedData.students.forEach((student: any) => {
        const classId = student.classId;
        if (!byClass[classId]) {
          byClass[classId] = [];
        }
        byClass[classId].push(student);
      });
      setStudentsByClass(byClass);
    }
  }, [relatedData?.students]);

  // ... rest of the component code remains the same ...
  // (handleClassSelect, handleStudentSelect, handleSelectAllFromClass functions)

  const handleClassSelect = (classId: string) => {
    setSelectedClasses(prev => {
      if (prev.includes(classId)) {
        // Remove class and deselect all students from that class
        const studentsToRemove = studentsByClass[classId]?.map(s => s.id) || [];
        setSelectedStudents(current => 
          current.filter(id => !studentsToRemove.includes(id))
        );
        return prev.filter(id => id !== classId);
      } else {
        return [...prev, classId];
      }
    });
  };

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const handleSelectAllFromClass = (classId: string, students: any[]) => {
    const studentIds = students.map(s => s.id);
    const allSelected = studentIds.every(id => selectedStudents.includes(id));
    
    if (allSelected) {
      // Deselect all from this class
      setSelectedStudents(prev => 
        prev.filter(id => !studentIds.includes(id))
      );
    } else {
      // Select all from this class
      const newStudentIds = [
        ...selectedStudents,
        ...studentIds.filter(id => !selectedStudents.includes(id))
      ];
      setSelectedStudents(newStudentIds);
    }
  };

  const { classes } = relatedData;

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create a new parent" : "Update the parent"}
      </h1>
      
      {/* Hidden ID field */}
      {type === "update" && data?.id && (
        <input 
          type="hidden" 
          {...register("id")} 
          defaultValue={data.id}
        />
      )}
      
      <span className="text-xs text-gray-400 font-medium">
        Authentication Information
      </span>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Username"
          name="username"
          defaultValue={data?.username}
          register={register}
          error={errors?.username}
        />
        <InputField
          label="Email"
          name="email"
          defaultValue={data?.email}
          register={register}
          error={errors?.email}
        />
        <InputField
          label="Password"
          name="password"
          type="password"
          defaultValue={data?.password}
          register={register}
          error={errors?.password}
        />
      </div>

      <span className="text-xs text-gray-400 font-medium">
        Personal Information
      </span>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Father Name"
          name="name"
          defaultValue={data?.name}
          register={register}
          error={errors.name}
        />
        <InputField
          label="Mother Name"
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
        />
        <InputField
          label="Address"
          name="address"
          defaultValue={data?.address}
          register={register}
          error={errors.address}
        />
        
        {/* Classes Selection - Multiple Classes Allowed */}
        <div className="flex flex-col gap-4 w-full">
          <label className="text-sm font-medium text-gray-700">
            Select Classes (You can select multiple classes)
          </label>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {classes?.map((cls: any) => {
              const classStudents = studentsByClass[cls.id] || [];
              const isClassSelected = selectedClasses.includes(cls.id);
              const selectedCount = classStudents.filter(
                (s: any) => selectedStudents.includes(s.id)
              ).length;
              
              return (
                <div
                  key={cls.id}
                  className={`
                    border rounded-lg p-3 cursor-pointer transition-colors
                    ${isClassSelected 
                      ? 'bg-blue-50 border-blue-300' 
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }
                  `}
                  onClick={() => handleClassSelect(cls.id)}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isClassSelected}
                      onChange={() => {}} // Handled by div click
                      className="w-4 h-4 text-blue-600 rounded"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1">
                      <h3 className="font-medium">{cls.name}</h3>
                      <p className="text-xs text-gray-600">
                        Grade: {cls.grade?.level} | Students: {classStudents.length}
                      </p>
                      {isClassSelected && (
                        <p className="text-xs text-blue-600 mt-1">
                          Selected: {selectedCount}/{classStudents.length}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Students List - Shows only for selected classes */}
        {selectedClasses.length > 0 && (
          <div className="flex flex-col gap-6 w-full mt-4">
            <h3 className="font-medium text-gray-700">
              Select Students from Selected Classes
            </h3>
            
            {selectedClasses.map(classId => {
              const classStudents = studentsByClass[classId] || [];
              const classInfo = classes?.find((c: any) => c.id === classId);
              const selectedInClass = classStudents.filter(
                (s: any) => selectedStudents.includes(s.id)
              ).length;
              
              if (classStudents.length === 0) return null;
              
              return (
                <div key={classId} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h4 className="font-semibold text-md">
                        {classInfo?.name} (Grade: {classInfo?.grade?.level})
                      </h4>
                      <p className="text-sm text-gray-600">
                        {selectedInClass} of {classStudents.length} selected
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectAllFromClass(classId, classStudents)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {selectedInClass === classStudents.length 
                        ? "Deselect All" 
                        : "Select All"}
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2">
                    {classStudents.map((student: any) => {
                      const isSelected = selectedStudents.includes(student.id);
                      
                      return (
                        <label
                          key={student.id}
                          className={`
                            flex items-center p-2 rounded-lg cursor-pointer
                            ${isSelected ? 'bg-blue-50' : 'bg-gray-50'}
                            border hover:bg-blue-50 transition-colors
                          `}
                        >
                          <div className="flex items-center gap-3 w-full">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleStudentSelect(student.id)}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <div className="flex justify-between w-full">
                              <span className="font-medium">
                                {student.name} {student.surname}
                              </span>
                              <span className="text-sm text-gray-600">
                                Roll: {student.rollNumber || student.id.slice(-6)}
                              </span>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Selected Students Summary */}
        {selectedStudents.length > 0 && (
          <div className="bg-green-50 p-4 rounded-lg w-full mt-4">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium text-green-800">
                Total Selected Students: {selectedStudents.length}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedClasses([]);
                  setSelectedStudents([]);
                }}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Clear All
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3 max-h-24 overflow-y-auto">
              {relatedData?.students
                ?.filter((s: any) => selectedStudents.includes(s.id))
                .map((s: any) => {
                  const studentClass = classes?.find((c: any) => c.id === s.classId);
                  return (
                    <span
                      key={s.id}
                      className="bg-green-200 text-green-800 px-2 py-1 rounded-full text-xs"
                    >
                      {s.name} ({studentClass?.name} - Roll: {s.rollNumber || s.id.slice(-6)})
                    </span>
                  );
                })}
            </div>
          </div>
        )}
        
        <input
          type="hidden"
          {...register("studentIds")}
          value={selectedStudents}
        />
      </div>

      {state.error && (
        <span className="text-red-500">Something went wrong!</span>
      )}
      
      <button 
        type="submit" 
        className="bg-blue-400 text-white p-2 rounded-md hover:bg-blue-500 transition-colors"
      >
        {type === "create" ? "Create" : "Update"}
      </button>
    </form>
  );
};

export default ParentForm;