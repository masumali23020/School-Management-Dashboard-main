"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";


import { Dispatch, SetStateAction, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { createExam, updateExam } from "@/Actions/ExamAction/examActionFormModal";
import { CheckSquare, Square } from "lucide-react";
import { examSchema, ExamSchema } from "@/lib/FormValidationSchema";
import InputField from "./InputField";

type ClassOption = { id: number; name: string; gradeLevel: number };

const ExamForm = ({
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
  } = useForm<ExamSchema>({
    resolver: zodResolver(examSchema),
  });

  const classes: ClassOption[] = relatedData?.classes || [];

  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    new Set(classes.map((c) => c.id))
  );

  // ✅ useFormState এর বদলে useTransition ব্যবহার করুন
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const allSelected = selectedIds.size === classes.length && classes.length > 0;

  const toggleAll = () =>
    setSelectedIds(
      allSelected ? new Set() : new Set(classes.map((c) => c.id))
    );

  const toggleOne = (id: number) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // ✅ সঠিকভাবে action call করুন
  const onSubmit = handleSubmit((formData) => {
    console.log("=== Form Submit ===");
    console.log("formData:", formData);
    console.log("selectedIds:", Array.from(selectedIds));

    if (selectedIds.size === 0) {
      toast.error("কমপক্ষে একটি class select করুন!");
      return;
    }

    const payload = {
      ...formData,
      classIds: Array.from(selectedIds),
    };

    console.log("payload:", payload);

    startTransition(async () => {
      try {
        const result = type === "create"
          ? await createExam({ success: false, error: false }, payload)
          : await updateExam({ success: false, error: false }, payload);

        console.log("Result:", result);

        if (result.success) {
          toast.success(
            result.message ||
            `Exam has been ${type === "create" ? "created" : "updated"}!`
          );
          setOpen(false);
          router.refresh();
        } else {
          toast.error(result.message || "Something went wrong!");
        }
      } catch (err) {
        console.error("Submit error:", err);
        toast.error("Something went wrong!");
      }
    });
  });

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create a new exam" : "Update the exam"}
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Exam title"
          name="title"
          defaultValue={data?.title}
          register={register}
          error={errors?.title}
        />
        <InputField
          label="Start Date"
          name="startTime"
          defaultValue={
            data?.startTime
              ? new Date(data.startTime).toISOString().slice(0, 16)
              : ""
          }
          register={register}
          error={errors?.startTime}
          type="datetime-local"
        />
        <InputField
          label="End Date"
          name="endTime"
          defaultValue={
            data?.endTime
              ? new Date(data.endTime).toISOString().slice(0, 16)
              : ""
          }
          register={register}
          error={errors?.endTime}
          type="datetime-local"
        />
        <InputField
          label="Session (Year)"
          name="session"
          defaultValue={data?.session || new Date().getFullYear()}
          register={register}
          error={errors?.session}
          type="number"
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
      </div>

      {/* ── Class Multi-Select ── */}
      {classes.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Select Classes <span className="text-red-500">*</span>
              <span className="text-xs text-gray-400 font-normal ml-1">
                ({selectedIds.size}/{classes.length} selected)
              </span>
            </label>
            <button
              type="button"
              onClick={toggleAll}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border
                          text-xs font-semibold transition-all ${
                            allSelected
                              ? "border-blue-500 bg-blue-500 text-white"
                              : "border-blue-300 bg-blue-50 text-blue-600 hover:border-blue-500"
                          }`}
            >
              {allSelected
                ? <CheckSquare className="h-3.5 w-3.5" />
                : <Square className="h-3.5 w-3.5" />}
              All Classes
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-gray-50
                          border border-gray-200 rounded-xl max-h-48 overflow-y-auto">
            {classes.map((cls) => {
              const checked = selectedIds.has(cls.id);
              const primary = cls.gradeLevel <= 5;
              return (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => toggleOne(cls.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border
                              text-sm font-medium transition-all select-none ${
                                checked
                                  ? "border-blue-400 bg-blue-50 text-blue-700"
                                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                              }`}
                >
                  {checked
                    ? <CheckSquare className="h-4 w-4 flex-shrink-0 text-blue-500" />
                    : <Square className="h-4 w-4 flex-shrink-0 text-gray-300" />}
                  <span className="truncate">{cls.name}</span>
                  <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                    primary ? "bg-green-100 text-green-600" : "bg-purple-100 text-purple-600"
                  }`}>
                    G{cls.gradeLevel}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedIds.size === 0 && (
            <p className="text-xs text-red-400">
              কমপক্ষে একটি class select করুন
            </p>
          )}
        </div>
      )}

      {/* ✅ isPending দিয়ে loading দেখান */}
      <button
        type="submit"
        disabled={isPending}
        className="bg-blue-400 text-white p-2 rounded-md disabled:opacity-50 
                   flex items-center justify-center gap-2"
      >
        {isPending ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent 
                             rounded-full animate-spin" />
            Processing...
          </>
        ) : (
          type === "create" ? "Create" : "Update"
        )}
      </button>
    </form>
  );
};

export default ExamForm;