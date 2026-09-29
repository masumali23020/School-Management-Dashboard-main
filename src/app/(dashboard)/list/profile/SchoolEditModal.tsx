"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { SchoolWithCount } from "./SchoolProfileClient";
import { updateSchool } from "@/Actions/SchoolAction/SchoolAction";

// ── Validation Schema ──
const schoolSchema = z.object({
  id: z.number(),
  schoolName: z.string().min(2, "Minimum 2 characters required"),
  shortName: z.string().optional(),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  establishedYear: z.string().optional(),
  passRate: z.string().optional(),
  eiinNumber: z.string().optional(),
  academicSession: z.string().min(1, "Academic session is required"),
  logoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  bannerUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type SchoolSchema = z.infer<typeof schoolSchema>;

type Props = { school: SchoolWithCount; onClose: () => void };

// ── Reusable Input ──
function Field({
  label,
  name,
  type = "text",
  placeholder,
  register,
  error,
}: {
  label: string;
  name: keyof SchoolSchema;
  type?: string;
  placeholder?: string;
  register: any;
  error?: { message?: string };
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        {...register(name)}
        className={`w-full px-3 py-2 text-sm rounded-lg border ${
          error ? "border-red-300 bg-red-50 focus:ring-red-200" : "border-gray-200 bg-gray-50 focus:ring-indigo-200"
        } focus:outline-none focus:ring-2 transition-all`}
      />
      {error?.message && <p className="text-xs text-red-500">{error.message}</p>}
    </div>
  );
}

export default function SchoolEditModal({ school, onClose }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"basic" | "contact" | "academic" | "media">("basic");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SchoolSchema>({
    resolver: zodResolver(schoolSchema),
    defaultValues: {
      id: school.id,
      schoolName: school.schoolName ?? "",
      shortName: school.shortName ?? "",
      email: school.email ?? "",
      phone: school.phone ?? "",
      address: school.address ?? "",
      establishedYear: school.establishedYear ?? "",
      passRate: school.passRate ?? "",
      eiinNumber: school.eiinNumber ?? "",
      academicSession: school.academicSession ?? "2026",
      logoUrl: school.logoUrl ?? "",
      bannerUrl: school.bannerUrl ?? "",
    },
  });

  // ✅ useFormState বাদ দিয়ে direct call — "Something went wrong" error fix
  const onSubmit = handleSubmit(async (data) => {
    setLoading(true);
    try {
      const result = await updateSchool(data);
      if (result.success) {
        toast.success("School updated successfully!");
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? "Update failed. Please try again.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  });

  const tabs = [
    { key: "basic",    label: "Basic Info", icon: "🏫" },
    { key: "contact",  label: "Contact",    icon: "📞" },
    { key: "academic", label: "Academic",   icon: "📚" },
    { key: "media",    label: "Media URLs", icon: "🖼️" },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Edit School Profile</h2>
            <p className="text-xs text-gray-400">{school.schoolName}</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors text-sm">
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden">
          <input type="hidden" {...register("id", { valueAsNumber: true })} />

          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === "basic" && (
              <div className="space-y-4">
                <Field label="School Name *" name="schoolName" register={register} error={errors.schoolName} placeholder="e.g. Dhaka Model High School" />
                <Field label="Short Name"    name="shortName"  register={register} error={errors.shortName}  placeholder="e.g. DMHS" />
                <Field label="EIIN Number"   name="eiinNumber" register={register} error={errors.eiinNumber} placeholder="e.g. 108546" />
              </div>
            )}

            {activeTab === "contact" && (
              <div className="space-y-4">
                <Field label="Email" name="email" type="email" register={register} error={errors.email} placeholder="school@example.com" />
                <Field label="Phone" name="phone" register={register} error={errors.phone} placeholder="+880 1XXX-XXXXXX" />
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Address</label>
                  <textarea {...register("address")} rows={3} placeholder="Full school address..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none transition-all" />
                </div>
              </div>
            )}

            {activeTab === "academic" && (
              <div className="space-y-4">
                <Field label="Academic Session *" name="academicSession" register={register} error={errors.academicSession} placeholder="e.g. 2026" />
                <Field label="Established Year"   name="establishedYear" register={register} error={errors.establishedYear} placeholder="e.g. 1995" />
                <Field label="Pass Rate (%)"       name="passRate"        register={register} error={errors.passRate}        placeholder="e.g. 92.5" />
              </div>
            )}

            {activeTab === "media" && (
              <div className="space-y-4">
                <Field label="Logo URL"   name="logoUrl"   register={register} error={errors.logoUrl}   placeholder="https://..." />
                <Field label="Banner URL" name="bannerUrl" register={register} error={errors.bannerUrl} placeholder="https://..." />
                <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                  💡 Direct image URLs (HTTPS). Recommended: Logo 200×200px, Banner 1200×300px
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}