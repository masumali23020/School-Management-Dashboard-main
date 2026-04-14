"use client";

import { useState } from "react";
import Image from "next/image";
import SchoolEditModal from "./SchoolEditModal";
import SchoolDeleteModal from "./SchoolDeleteModal";

// ✅ Prisma schema এর সাথে হুবহু মিলানো type
export type SchoolWithCount = {
  id: number;
  schoolName: string;
  shortName: string | null;
  slug: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  establishedYear: string | null;  // ✅ fix
  passRate: string | null;         // ✅ fix
  eiinNumber: string | null;
  academicSession: string;
  isActive: boolean;
  smsBalance: number;
  expiredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  planId: number;
  plan: {
    id: number;
    name: string;
    [key: string]: unknown;
  };
  _count: {
    employees: number;
    students: number;
    parents: number;
    grades: number;
    classes: number;
    subjects: number;
  };
};

export default function SchoolProfileClient({
  school,
  role,
}: {
  school: SchoolWithCount;
  role: string;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isAdmin = role === "admin";

  const stats = [
    { label: "Students",  value: school._count.students,  icon: "🎓", color: "bg-blue-50 text-blue-700 border-blue-100" },
    { label: "Employees", value: school._count.employees, icon: "👩‍🏫", color: "bg-purple-50 text-purple-700 border-purple-100" },
    { label: "Classes",   value: school._count.classes,   icon: "🏫", color: "bg-green-50 text-green-700 border-green-100" },
    { label: "Subjects",  value: school._count.subjects,  icon: "📚", color: "bg-yellow-50 text-yellow-700 border-yellow-100" },
    { label: "Parents",   value: school._count.parents,   icon: "👨‍👩‍👧", color: "bg-pink-50 text-pink-700 border-pink-100" },
    { label: "Grades",    value: school._count.grades,    icon: "📊", color: "bg-orange-50 text-orange-700 border-orange-100" },
  ];

  const infoFields = [
    { label: "School Name",       value: school.schoolName },
    { label: "Short Name",        value: school.shortName },
    { label: "Email",             value: school.email },
    { label: "Phone",             value: school.phone },
    { label: "Address",           value: school.address },
    { label: "EIIN Number",       value: school.eiinNumber },
    { label: "Established Year",  value: school.establishedYear },
    { label: "Academic Session",  value: school.academicSession },
    { label: "Pass Rate",         value: school.passRate ? `${school.passRate}%` : null },
    { label: "SMS Balance",       value: String(school.smsBalance) },
    { label: "Plan",              value: school.plan?.name ?? `Plan #${school.plan?.id}` },
    {
      label: "Plan Expiry",
      value: school.expiredAt
        ? new Intl.DateTimeFormat("en-GB").format(new Date(school.expiredAt))
        : "N/A",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner */}
      <div className="relative h-48 md:h-60 bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 overflow-hidden rounded-b-2xl mx-4">
        {school.bannerUrl ? (
          <Image src={school.bannerUrl} alt="Banner" fill className="object-cover opacity-30" />
        ) : (
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="absolute rounded-full border-2 border-white"
                style={{ width: 80 + i * 60, height: 80 + i * 60, top: `${8 + i * 6}%`, left: `${-4 + i * 18}%` }} />
            ))}
          </div>
        )}
        <div className="absolute inset-0 flex items-end pb-5 px-6">
          <div className="flex items-end gap-4 w-full">
            <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-2xl border-4 border-white bg-white shadow-xl overflow-hidden flex-shrink-0">
              {school.logoUrl ? (
                <Image src={school.logoUrl} alt="Logo" fill className="object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white text-3xl font-bold">
                  {school.schoolName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-white truncate drop-shadow">{school.schoolName}</h1>
              {school.shortName && <p className="text-blue-100 text-sm">{school.shortName}</p>}
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${school.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {school.isActive ? "● Active" : "● Inactive"}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Action Buttons */}
        {isAdmin && (
          <div className="flex gap-3 justify-end">
            <button onClick={() => setEditOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit School
            </button>
            <button onClick={() => setDeleteOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors shadow">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete School
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.map((s) => (
            <div key={s.label} className={`rounded-xl p-4 border ${s.color} flex flex-col items-center gap-1 shadow-sm`}>
              <span className="text-2xl">{s.icon}</span>
              <span className="text-2xl font-bold">{s.value}</span>
              <span className="text-xs font-medium opacity-75">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Info Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-indigo-500 rounded-full" />
            <h2 className="text-base font-semibold text-gray-800">School Information</h2>
          </div>
          <div className="p-6">
            <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
              {infoFields.map((f) => (
                <div key={f.label}>
                  <dt className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">{f.label}</dt>
                  <dd className="text-sm font-medium text-gray-800">
                    {f.value ?? <span className="text-gray-300 italic">Not set</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Slug */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">URL Slug</p>
            <p className="text-sm font-mono text-indigo-600">/{school.slug}</p>
          </div>
        </div>
      </div>

      {editOpen   && <SchoolEditModal   school={school} onClose={() => setEditOpen(false)} />}
      {deleteOpen && <SchoolDeleteModal schoolId={school.id} schoolName={school.schoolName} onClose={() => setDeleteOpen(false)} />}
    </div>
  );
}