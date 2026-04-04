// app/(superadmin)/register-school/page.tsx
"use client";

import { createSchoolAction, CreateSchoolResult } from "@/Actions/school/create-school.action";
import { SchoolRegistrationInput } from "@/lib/FormValidationSchema";
import Link from "next/link";
import { useState, useTransition, useEffect } from "react";

const PLANS = [
  { id: 1, type: "FREE",     label: "Free",     duration: "30 days",  price: "৳0" },
  { id: 2, type: "STANDARD", label: "Standard", duration: "6 months", price: "৳2,500" },
  { id: 3, type: "POPULAR",  label: "Popular",  duration: "1 year",   price: "৳5,000" },
] as const;

type FieldErrors = Partial<Record<keyof SchoolRegistrationInput, string[]>>;

const EMPTY_FORM: SchoolRegistrationInput = {
  schoolName:    "",
  shortName:     "",
  eiinNumber:    "",
  email:         "",
  phone:         "",
  address:       "",
  planId:        1,
  planType:      "FREE",
  adminUsername: "",
  adminPassword: "",
  adminName:     "",
  adminSurname:  "",
  adminEmail:    "",
  adminPhone:    "",
  slug:          "",
};

export default function RegisterSchoolPage() {
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<SchoolRegistrationInput>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<Extract<CreateSchoolResult, { success: true }> | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // ─── Slug Generator Helper ───────────────────────────────────────────────
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")     // স্পেশাল ক্যারেক্টার রিমুভ
      .replace(/[\s_-]+/g, "-")      // স্পেসকে হাইফেন করা
      .replace(/^-+|-+$/g, "");      // শুরু বা শেষের হাইফেন রিমুভ
  };

  // ─── Handlers ───────────────────────────────────────────────────────────────
  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    setServerError(null);

    setForm((prev) => {
      const updatedForm = { ...prev, [name]: value };
      
      // যদি School Name টাইপ করা হয়, তবে অটোমেটিক Slug ফিল্ড আপডেট হবে
      if (name === "schoolName") {
        updatedForm.slug = generateSlug(value);
      }
      return updatedForm;
    });
  }

  function handlePlanSelect(planId: number, planType: "FREE" | "STANDARD" | "POPULAR") {
    setForm((prev) => ({ ...prev, planId, planType }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await createSchoolAction(form);
      if (result.success) {
        setSuccessData(result);
        setForm(EMPTY_FORM);
      } else {
        setFieldErrors(result.fieldErrors ?? {});
        setServerError(result.error);
      }
    });
  }

  // ─── Success State ───────────────────────────────────────────────────────────
  if (successData) {
    return (
      <main className="min-h-screen bg-[#0a0c10] flex items-center justify-center p-6">
        <div className="bg-[#0f1117] border border-[#1a3a2a] rounded-2xl p-10 max-w-md w-full text-center shadow-2xl">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-white mb-2">School Registered!</h2>
          <p className="text-[#4ade80] font-mono text-sm mb-6">{successData.schoolName}</p>
          
          <div className="bg-[#0a1a12] rounded-xl p-4 text-left space-y-2 mb-6 border border-[#1a3a2a]">
            <InfoRow label="School ID"  value={String(successData.schoolId)} />
            <InfoRow label="Public URL"  value={`/${successData.slug}`} />
            <InfoRow label="Admin User" value={successData.adminUsername} />
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href={`/${successData.slug}`}
              className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-mono text-sm py-3 rounded-xl transition-colors text-center"
            >
              View Public Website
            </Link>
            <button
              onClick={() => setSuccessData(null)}
              className="w-full bg-transparent border border-[#2a2d3a] text-[#9ca3af] font-mono text-sm py-3 rounded-xl hover:border-[#4b5563]"
            >
              Register Another
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0c10] py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <p className="font-mono text-[#4b5563] text-xs tracking-widest uppercase">Super Admin Panel</p>
          <h1 className="text-3xl font-bold text-white mt-1">Register New School</h1>
        </div>

        {serverError && (
          <div className="mb-6 bg-[#2d1515] border border-[#5a2020] rounded-xl p-4 text-red-400 font-mono text-sm">
            ⚠ {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <Section title="Subscription Plan">
            <div className="grid grid-cols-3 gap-3">
              {PLANS.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => handlePlanSelect(plan.id, plan.type)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    form.planId === plan.id ? "border-[#3b6fd4] bg-[#0e1a33]" : "border-[#2a2d3a] bg-[#0f1117]"
                  }`}
                >
                  <p className="font-bold text-white text-sm">{plan.label}</p>
                  <p className="text-[#3b6fd4] font-mono text-xs mt-0.5">{plan.price}</p>
                </button>
              ))}
            </div>
          </Section>

          <Section title="School Information">
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="School Name *"
                name="schoolName"
                value={form.schoolName}
                onChange={handleChange}
                disabled={isPending}
                error={fieldErrors.schoolName?.[0]}
                placeholder="Dhaka Model High School"
                colSpan
              />
              <Field
                label="URL Slug (Unique) *"
                name="slug"
                value={form.slug}
                onChange={handleChange}
                disabled={isPending}
                error={fieldErrors.slug?.[0]}
                placeholder="dhaka-model-school"
                hint="School website URL: domain.com/your-slug"
                colSpan
              />
              <Field label="Short Name" name="shortName" value={form.shortName} onChange={handleChange} disabled={isPending} error={fieldErrors.shortName?.[0]} />
              <Field label="EIIN Number" name="eiinNumber" value={form.eiinNumber} onChange={handleChange} disabled={isPending} error={fieldErrors.eiinNumber?.[0]} />
              <Field label="School Email" name="email" value={form.email} onChange={handleChange} disabled={isPending} error={fieldErrors.email?.[0]} />
              <Field label="Phone" name="phone" value={form.phone} onChange={handleChange} disabled={isPending} error={fieldErrors.phone?.[0]} />
              <Field label="Address" name="address" value={form.address} onChange={handleChange} disabled={isPending} error={fieldErrors.address?.[0]} colSpan />
            </div>
          </Section>

          <Section title="Admin Account">
            <div className="grid grid-cols-2 gap-4">
              <Field label="First Name *" name="adminName" value={form.adminName} onChange={handleChange} disabled={isPending} error={fieldErrors.adminName?.[0]} />
              <Field label="Last Name *" name="adminSurname" value={form.adminSurname} onChange={handleChange} disabled={isPending} error={fieldErrors.adminSurname?.[0]} />
              <Field label="Username *" name="adminUsername" value={form.adminUsername} onChange={handleChange} disabled={isPending} error={fieldErrors.adminUsername?.[0]} />
              <div className="relative">
                <Field label="Password *" name="adminPassword" type={showPassword ? "text" : "password"} value={form.adminPassword} onChange={handleChange} disabled={isPending} error={fieldErrors.adminPassword?.[0]} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-7 text-[#4b5563] text-xs font-mono">
                  {showPassword ? "hide" : "show"}
                </button>
              </div>
            </div>
          </Section>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-4 bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-50 text-white font-mono text-sm rounded-xl transition-colors"
          >
            {isPending ? "Registering..." : "Register School"}
          </button>
        </form>
      </div>
    </main>
  );
}

// --- Reusable Components ---
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#0f1117] border border-[#1f2130] rounded-2xl p-6">
      <h3 className="font-mono text-[#4b5563] text-xs tracking-widest uppercase border-b border-[#1f2130] pb-3 mb-5">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, name, value, onChange, disabled, error, placeholder, type = "text", hint, colSpan }: any) {
  return (
    <div className={`flex flex-col gap-1.5 ${colSpan ? "col-span-2" : ""}`}>
      <label className="font-mono text-[#6b7280] text-[11px] tracking-widest uppercase">{label}</label>
      <input
        name={name} type={type} value={value} onChange={onChange} disabled={disabled} placeholder={placeholder}
        className={`bg-[#0a0c10] border rounded-lg text-white text-sm font-mono px-3 py-2.5 outline-none transition-all ${error ? "border-red-800" : "border-[#2a2d3a] focus:border-[#3b6fd4]"}`}
      />
      {hint && !error && <p className="text-[#4b5563] text-[10px] font-mono">{hint}</p>}
      {error && <p className="text-red-400 text-[11px] font-mono">✕ {error}</p>}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[#4b5563] font-mono text-xs">{label}</span>
      <span className="text-[#4ade80] font-mono text-xs">{value}</span>
    </div>
  );
}