"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  createSubscriptionPlanBySuperAdmin,
  deleteSubscriptionPlanBySuperAdmin,
  updateSubscriptionPlanBySuperAdmin,
} from "@/Actions/school/superadmin-plan.action";

type Plan = {
  id: number;
  name: PlanType;
  price: { toString: () => string } | number | string;
  maxStudents: number;
  maxEmployees: number;
  hasSMS: boolean;
  hasAnalytics: boolean;
  _count: { schools: number };
};

type Props = {
  plans: Plan[];
};

type PlanType = "FREE" | "STANDARD" | "POPULAR";

type FormState = {
  id?: number;
  name: PlanType;
  price: string;
  maxStudents: string;
  maxEmployees: string;
  hasSMS: boolean;
  hasAnalytics: boolean;
};

const PLAN_TYPES: PlanType[] = ["FREE", "STANDARD", "POPULAR"];

export default function SuperAdminPlansClient({ plans }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Plan | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>({
    name: "FREE",
    price: "0",
    maxStudents: "50",
    maxEmployees: "5",
    hasSMS: false,
    hasAnalytics: false,
  });

  const openCreate = () => {
    setCreating(true);
    setEditing(null);
    setForm({
      name: "FREE",
      price: "0",
      maxStudents: "50",
      maxEmployees: "5",
      hasSMS: false,
      hasAnalytics: false,
    });
  };

  const openEdit = (plan: Plan) => {
    setEditing(plan);
    setCreating(false);
    setForm({
      id: plan.id,
      name: plan.name,
      price: String(plan.price),
      maxStudents: String(plan.maxStudents),
      maxEmployees: String(plan.maxEmployees),
      hasSMS: plan.hasSMS,
      hasAnalytics: plan.hasAnalytics,
    });
  };

  const closeModal = () => {
    setCreating(false);
    setEditing(null);
  };

  const handleSave = () => {
    const payload = {
      id: form.id,
      name: form.name,
      price: Number(form.price),
      maxStudents: Number(form.maxStudents),
      maxEmployees: Number(form.maxEmployees),
      hasSMS: form.hasSMS,
      hasAnalytics: form.hasAnalytics,
    };

    if (
      Number.isNaN(payload.price) ||
      Number.isNaN(payload.maxStudents) ||
      Number.isNaN(payload.maxEmployees)
    ) {
      toast.error("Price and limits must be valid numbers.");
      return;
    }

    startTransition(async () => {
      const result = creating
        ? await createSubscriptionPlanBySuperAdmin(payload)
        : await updateSubscriptionPlanBySuperAdmin(payload);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      closeModal();
      router.refresh();
    });
  };

  const handleDelete = (plan: Plan) => {
    const ok = window.confirm(`Delete ${plan.name} plan?`);
    if (!ok) return;

    startTransition(async () => {
      const result = await deleteSubscriptionPlanBySuperAdmin(plan.id);
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
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-[#9ca3af]">Manage all subscription plans from one place.</p>
          <button onClick={openCreate} className="rounded-lg bg-[#2563eb] px-4 py-2 text-sm hover:bg-[#1d4ed8]">
            + Create Plan
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="text-left text-[#6b7280]">
              <tr className="border-b border-[#1f2130]">
                <th className="py-2">Plan</th>
                <th className="py-2">Price</th>
                <th className="py-2">Max Students</th>
                <th className="py-2">Max Employees</th>
                <th className="py-2">SMS</th>
                <th className="py-2">Analytics</th>
                <th className="py-2">Schools</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.id} className="border-b border-[#11131a]">
                  <td className="py-3 font-semibold">{plan.name}</td>
                  <td className="py-3">৳{String(plan.price)}</td>
                  <td className="py-3">{plan.maxStudents}</td>
                  <td className="py-3">{plan.maxEmployees}</td>
                  <td className="py-3">{plan.hasSMS ? "Yes" : "No"}</td>
                  <td className="py-3">{plan.hasAnalytics ? "Yes" : "No"}</td>
                  <td className="py-3">{plan._count.schools}</td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(plan)}
                        className="rounded-md bg-[#1f2937] px-3 py-1 text-xs hover:bg-[#374151]"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(plan)}
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

      {(creating || editing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-xl border border-[#1f2130] bg-[#0f1117] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{creating ? "Create Plan" : `Edit Plan: ${editing?.name}`}</h2>
              <button onClick={closeModal} className="text-sm text-[#9ca3af] hover:text-white">
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs text-[#9ca3af]">Plan Type</label>
                <select
                  disabled={!creating}
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value as PlanType }))}
                  className="w-full rounded-lg border border-[#2a2d3a] bg-[#0a0c10] px-3 py-2 text-sm disabled:opacity-70"
                >
                  {PLAN_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <Input label="Price" type="number" value={form.price} onChange={(v) => setForm((p) => ({ ...p, price: v }))} />
              <Input
                label="Max Students"
                type="number"
                value={form.maxStudents}
                onChange={(v) => setForm((p) => ({ ...p, maxStudents: v }))}
              />
              <Input
                label="Max Employees"
                type="number"
                value={form.maxEmployees}
                onChange={(v) => setForm((p) => ({ ...p, maxEmployees: v }))}
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-[#d1d5db]">
                <input
                  type="checkbox"
                  checked={form.hasSMS}
                  onChange={(e) => setForm((p) => ({ ...p, hasSMS: e.target.checked }))}
                />
                Has SMS
              </label>
              <label className="flex items-center gap-2 text-sm text-[#d1d5db]">
                <input
                  type="checkbox"
                  checked={form.hasAnalytics}
                  onChange={(e) => setForm((p) => ({ ...p, hasAnalytics: e.target.checked }))}
                />
                Has Analytics
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={closeModal} className="rounded-lg border border-[#2a2d3a] px-4 py-2 text-sm">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isPending}
                className="rounded-lg bg-[#2563eb] px-4 py-2 text-sm hover:bg-[#1d4ed8] disabled:opacity-50"
              >
                {isPending ? "Saving..." : creating ? "Create Plan" : "Update Plan"}
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
