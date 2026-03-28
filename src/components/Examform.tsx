"use client";

import { Dispatch, SetStateAction, useEffect, useState, useTransition } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Loader2, CheckSquare, Square, Users, BookOpen } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import InputField from "./InputField";
import { examSchema, ExamSchema } from "@/lib/FormValidationSchema";
import { getSubjectsForClass } from "@/app/actions/examActions/examActions";


// ── Types ─────────────────────────────────────────────────────────────────────

type ClassOption = {
  id: number;
  name: string;
  gradeLevel: number;
};

// ── Create schema (just 3 fields) ─────────────────────────────────────────────

const createSchema = z.object({
  title: z.string().min(1, { message: "Exam title is required!" }),
  startTime: z.coerce.date({ message: "Start date is required!" }),
  endTime: z.coerce.date({ message: "End date is required!" }),
});
type CreateSchema = z.infer<typeof createSchema>;

// ── Root ──────────────────────────────────────────────────────────────────────

const ExamForm = ({
  type,
  data,
  setOpen,
  relatedData,
}: {
  type: "create" | "update";
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: { classes?: ClassOption[] };
}) => {
  const router = useRouter();

  if (type === "update") {
    return <UpdateExamForm data={data} setOpen={setOpen} router={router} />;
  }
console.log("Rendering CreateExamForm with relatedData:", relatedData);
  return (
    <CreateExamForm
      setOpen={setOpen}
      router={router}
      classes={relatedData?.classes ?? []}
    />
  );
};

export default ExamForm;

// ── CREATE ────────────────────────────────────────────────────────────────────

function CreateExamForm({
  setOpen,
  router,
  classes,
}: {
  setOpen: Dispatch<SetStateAction<boolean>>;
  router: ReturnType<typeof useRouter>;
  classes: ClassOption[];
}) {
  const [selectAll, setSelectAll] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    new Set(classes.map((c) => c.id))
  );
  const [submitting, setSubmitting] = useState(false);
  console.log("Received classes for exam form:", classes);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateSchema>({ resolver: zodResolver(createSchema) });

  // ── Toggle a single class ─────────────────────────────────────────────────
  const toggleClass = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      // sync selectAll state
      setSelectAll(next.size === classes.length);
      return next;
    });
  };

  // ── Toggle all ────────────────────────────────────────────────────────────
  const handleToggleAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
      setSelectAll(false);
    } else {
      setSelectedIds(new Set(classes.map((c) => c.id)));
      setSelectAll(true);
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const onSubmit = handleSubmit(async (values) => {
    if (selectedIds.size === 0) {
      toast.error("Please select at least one class");
      return;
    }

    setSubmitting(true);
    try {
      // For each selected class, fetch subjects then build payload
      const classBlocks = await Promise.all(
        classes
          .filter((c) => selectedIds.has(c.id))
          .map(async (cls) => {
            const subjects = await getSubjectsForClass(cls.id);
            const primary = cls.gradeLevel <= 5;
            return {
              classId: cls.id,
              className: cls.name,
              gradeLevel: cls.gradeLevel,
              subjects: subjects.map((s) => ({
                ...s,
                title: values.title,           // same title for all
                mcqMarks: primary ? null : 30,
                writtenMarks: primary ? 100 : 60,
                practicalMarks: null,
                totalMarks: primary ? 100 : 90,
                include: true,
              })),
            };
          })
      );

      const totalSubjects = classBlocks.reduce(
        (acc, b) => acc + b.subjects.length,
        0
      );

      if (totalSubjects === 0) {
        toast.error("No subjects/lessons found for the selected classes");
        return;
      }

      const result = await createMultiClassExams({
        startTime: values.startTime,
        endTime: values.endTime,
        academicYear: "2024",
        classes: classBlocks,
      });

      if (result.success) {
        toast(
          `✅ ${result.created} exam(s) created across ${classBlocks.length} class(es)!`
        );
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.message ?? "Something went wrong");
      }
    } catch (e) {
      toast.error("Failed to create exams");
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">Create a new exam</h1>

      {/* ── Three main inputs ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <InputField
          label="Exam Title"
          name="title"
          register={register}
          error={errors.title}
          placeholder="e.g. Mid-Term Exam 2024"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField
            label="Start Date"
            name="startTime"
            register={register}
            error={errors.startTime}
            type="datetime-local"
          />
          <InputField
            label="End Date"
            name="endTime"
            register={register}
            error={errors.endTime}
            type="datetime-local"
          />
        </div>
      </div>

      {/* ── Class selector ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Select Classes
          </label>
          {/* All Classes toggle */}
          <button
            type="button"
            onClick={handleToggleAll}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 text-xs font-semibold transition-all ${
              selectAll
                ? "border-blue-500 bg-blue-500 text-white"
                : "border-blue-200 bg-blue-50 text-blue-600 hover:border-blue-400"
            }`}
          >
            {selectAll ? (
              <CheckSquare className="h-3.5 w-3.5" />
            ) : (
              <Square className="h-3.5 w-3.5" />
            )}
            All Classes
          </button>
        </div>

        {/* Class pills */}
        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200 max-h-40 overflow-y-auto">
          {classes.map((cls) => {
            const checked = selectedIds.has(cls.id);
            const primary = cls.gradeLevel <= 5;
            return (
              <button
                key={cls.id}
                type="button"
                onClick={() => toggleClass(cls.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all select-none ${
                  checked
                    ? "border-blue-400 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                }`}
              >
                {checked ? (
                  <CheckSquare className="h-3.5 w-3.5 flex-shrink-0" />
                ) : (
                  <Square className="h-3.5 w-3.5 flex-shrink-0 text-gray-300" />
                )}
                {cls.name}
                <span
                  className={`px-1.5 py-0.5 rounded-full text-xs ${
                    primary
                      ? "bg-green-100 text-green-600"
                      : "bg-purple-100 text-purple-600"
                  }`}
                >
                  G{cls.gradeLevel}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selection summary */}
        <p className="text-xs text-gray-400">
          {selectedIds.size === 0
            ? "No class selected"
            : selectedIds.size === classes.length
            ? `All ${classes.length} classes selected`
            : `${selectedIds.size} of ${classes.length} classes selected`}
        </p>
      </div>

      {/* ── Submit ────────────────────────────────────────────────────────── */}
      <button
        type="submit"
        disabled={submitting || selectedIds.size === 0}
        className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Creating exams…
          </>
        ) : (
          <>
            <BookOpen className="h-4 w-4" />
            Create Exam
          </>
        )}
      </button>
    </form>
  );
}

// ── UPDATE ────────────────────────────────────────────────────────────────────

function UpdateExamForm({
  data,
  setOpen,
  router,
}: {
  data: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
  router: ReturnType<typeof useRouter>;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ExamSchema>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      id: data?.id,
      title: data?.title,
      startTime: data?.startTime,
      endTime: data?.endTime,
      totalMarks: data?.totalMarks ?? 100,
      mcqMarks: data?.mcqMarks ?? null,
      writtenMarks: data?.writtenMarks ?? null,
      practicalMarks: data?.practicalMarks ?? null,
    },
  });

  const [state, formAction] = useFormState(updateExam, {
    success: false,
    error: false,
  });

  const onSubmit = handleSubmit((values) => formAction(values));

  useEffect(() => {
    if (state.success) {
      toast("Exam updated successfully!");
      setOpen(false);
      router.refresh();
    }
    if (state.error) toast.error("Failed to update exam");
  }, [state]);

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">Update the exam</h1>

      {/* Context badges */}
      {data?.lesson && (
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-medium">
            {data.lesson.subject?.name}
          </span>
          <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">
            {data.lesson.class?.name}
          </span>
        </div>
      )}

      <input type="hidden" {...register("id")} />

      <InputField
        label="Exam Title"
        name="title"
        defaultValue={data?.title}
        register={register}
        error={errors.title}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField
          label="Start Date"
          name="startTime"
          defaultValue={data?.startTime}
          register={register}
          error={errors.startTime}
          type="datetime-local"
        />
        <InputField
          label="End Date"
          name="endTime"
          defaultValue={data?.endTime}
          register={register}
          error={errors.endTime}
          type="datetime-local"
        />
      </div>

      {state.error && (
        <p className="text-sm text-red-500">Something went wrong!</p>
      )}

      <button
        type="submit"
        className="bg-blue-400 text-white py-2 px-4 rounded-md"
      >
        Update
      </button>
    </form>
  );
}