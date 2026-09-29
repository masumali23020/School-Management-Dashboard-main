"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  deleteSchoolBySuperAdmin,
  toggleSchoolStatusBySuperAdmin,
  updateSchoolBySuperAdmin,
} from "@/Actions/school/superadmin-school.action";

type SchoolItem = {
  id: number;
  schoolName: string;
  shortName: string | null;
  slug: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  academicSession: string;
  isActive: boolean;
  smsBalance: number;
  expiredAt: Date | null;
  planId: number;
  plan: { id: number; name: string };
  _count: { students: number; employees: number };
};

type PlanItem = {
  id: number;
  name: string;
};

type Props = {
  schools: SchoolItem[];
  plans: PlanItem[];
};

export default function SuperAdminSchoolsClient({ schools, plans }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<SchoolItem | null>(null);
  const [formState, setFormState] = useState({
    schoolName: "",
    shortName: "",
    email: "",
    phone: "",
    address: "",
    academicSession: "",
    planId: 0,
    smsBalance: 0,
    expiredAt: "",
    isActive: true,
  });

  const filteredSchools = useMemo(() => {
    const key = search.trim().toLowerCase();
    if (!key) return schools;
    return schools.filter(
      (s) =>
        s.schoolName.toLowerCase().includes(key) ||
        s.slug.toLowerCase().includes(key) ||
        (s.email ?? "").toLowerCase().includes(key)
    );
  }, [schools, search]);

  const openEdit = (school: SchoolItem) => {
    setEditing(school);
    setFormState({
      schoolName: school.schoolName,
      shortName: school.shortName ?? "",
      email: school.email ?? "",
      phone: school.phone ?? "",
      address: school.address ?? "",
      academicSession: school.academicSession,
      planId: school.planId,
      smsBalance: school.smsBalance,
      expiredAt: school.expiredAt ? new Date(school.expiredAt).toISOString().slice(0, 10) : "",
      isActive: school.isActive,
    });
  };

  const handleUpdate = () => {
    if (!editing) return;
    startTransition(async () => {
      const result = await updateSchoolBySuperAdmin({
        id: editing.id,
        schoolName: formState.schoolName,
        shortName: formState.shortName,
        email: formState.email,
        phone: formState.phone,
        address: formState.address,
        academicSession: formState.academicSession,
        planId: Number(formState.planId),
        smsBalance: Number(formState.smsBalance),
        expiredAt: formState.expiredAt,
        isActive: formState.isActive,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setEditing(null);
      router.refresh();
    });
  };

  const handleToggle = (school: SchoolItem) => {
    startTransition(async () => {
      const nextStatus = !school.isActive;
      const result = await toggleSchoolStatusBySuperAdmin(school.id, nextStatus);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  };

  const handleDelete = (school: SchoolItem) => {
    const accepted = window.confirm(
      `Delete "${school.schoolName}"?\n\nThis will permanently remove this school and all related data.`
    );
    if (!accepted) return;

    startTransition(async () => {
      const result = await deleteSchoolBySuperAdmin(school.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  };

  return (
    <>
      <div className="rounded-xl border border-[#1f2130] bg-[#0f1117] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs text-[#9ca3af]">
            Total Schools: <span className="font-semibold text-white">{schools.length}</span>
          </p>
          <input
            placeholder="Search school, slug, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm rounded-lg border border-[#2a2d3a] bg-[#0a0c10] px-3 py-2 text-sm outline-none focus:border-[#3b6fd4]"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="text-left text-[#6b7280]">
              <tr className="border-b border-[#1f2130]">
                <th className="py-2">School</th>
                <th className="py-2">Plan</th>
                <th className="py-2">Students</th>
                <th className="py-2">Staff</th>
                <th className="py-2">Expiry</th>
                <th className="py-2">Status</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSchools.map((school) => (
                <tr key={school.id} className="border-b border-[#11131a]">
                  <td className="py-3">
                    <p className="font-medium text-white">{school.schoolName}</p>
                    <p className="text-xs text-[#6b7280]">/{school.slug}</p>
                  </td>
                  <td className="py-3">{school.plan.name}</td>
                  <td className="py-3">{school._count.students}</td>
                  <td className="py-3">{school._count.employees}</td>
                  <td className="py-3">
                    {school.expiredAt ? new Date(school.expiredAt).toLocaleDateString("en-BD") : "N/A"}
                  </td>
                  <td className="py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        school.isActive ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-300"
                      }`}
                    >
                      {school.isActive ? "Active" : "Suspended"}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(school)}
                        className="rounded-md bg-[#1f2937] px-3 py-1 text-xs hover:bg-[#374151]"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggle(school)}
                        disabled={isPending}
                        className="rounded-md bg-[#1e3a8a] px-3 py-1 text-xs hover:bg-[#1d4ed8] disabled:opacity-50"
                      >
                        {school.isActive ? "Suspend" : "Activate"}
                      </button>
                      <button
                        onClick={() => handleDelete(school)}
                        disabled={isPending}
                        className="rounded-md bg-[#7f1d1d] px-3 py-1 text-xs hover:bg-[#b91c1c] disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-[#1f2130] bg-[#0f1117] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Edit School: {editing.schoolName}</h2>
              <button onClick={() => setEditing(null)} className="text-sm text-[#9ca3af] hover:text-white">
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input label="School Name" value={formState.schoolName} onChange={(v) => setFormState((p) => ({ ...p, schoolName: v }))} />
              <Input label="Short Name" value={formState.shortName} onChange={(v) => setFormState((p) => ({ ...p, shortName: v }))} />
              <Input label="Email" value={formState.email} onChange={(v) => setFormState((p) => ({ ...p, email: v }))} />
              <Input label="Phone" value={formState.phone} onChange={(v) => setFormState((p) => ({ ...p, phone: v }))} />
              <Input label="Academic Session" value={formState.academicSession} onChange={(v) => setFormState((p) => ({ ...p, academicSession: v }))} />
              <Input
                label="SMS Balance"
                type="number"
                value={String(formState.smsBalance)}
                onChange={(v) => setFormState((p) => ({ ...p, smsBalance: Number(v) || 0 }))}
              />
              <div className="space-y-1">
                <label className="text-xs text-[#9ca3af]">Plan</label>
                <select
                  value={formState.planId}
                  onChange={(e) => setFormState((p) => ({ ...p, planId: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-[#2a2d3a] bg-[#0a0c10] px-3 py-2 text-sm"
                >
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Expiry Date"
                type="date"
                value={formState.expiredAt}
                onChange={(v) => setFormState((p) => ({ ...p, expiredAt: v }))}
              />
            </div>

            <div className="mt-3 space-y-1">
              <label className="text-xs text-[#9ca3af]">Address</label>
              <textarea
                value={formState.address}
                onChange={(e) => setFormState((p) => ({ ...p, address: e.target.value }))}
                rows={3}
                className="w-full rounded-lg border border-[#2a2d3a] bg-[#0a0c10] px-3 py-2 text-sm"
              />
            </div>

            <label className="mt-3 flex items-center gap-2 text-sm text-[#d1d5db]">
              <input
                type="checkbox"
                checked={formState.isActive}
                onChange={(e) => setFormState((p) => ({ ...p, isActive: e.target.checked }))}
              />
              Active School
            </label>

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="rounded-lg border border-[#2a2d3a] px-4 py-2 text-sm">
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={isPending}
                className="rounded-lg bg-[#2563eb] px-4 py-2 text-sm hover:bg-[#1d4ed8] disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Save Update"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-[#9ca3af]">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-[#2a2d3a] bg-[#0a0c10] px-3 py-2 text-sm outline-none focus:border-[#3b6fd4]"
      />
    </div>
  );
}
