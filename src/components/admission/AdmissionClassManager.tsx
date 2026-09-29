"use client";

import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deleteAdmissionClass,
  upsertAdmissionClass,
} from "@/Actions/admission/admission.actions";

type SessionOption = { id: number; name: string; academicYear: string };
type ClassOption = { id: number; name: string; grade: { level: number } };
type AdmissionClassItem = {
  id: number;
  admissionSessionId: number;
  classId: number;
  seatCapacity: number;
  admissionFee: string | number;
  status: "OPEN" | "CLOSED" | "FULL";
  confirmedCount?: number;
  pendingCount?: number;
  availableSeats?: number;
  class: { name: string; grade: { level: number } };
  admissionSession: { name: string; academicYear: string };
};

export default function AdmissionClassManager({
  sessions,
  schoolClasses,
  admissionClasses,
  isAdmin,
}: {
  sessions: SessionOption[];
  schoolClasses: ClassOption[];
  admissionClasses: AdmissionClassItem[];
  isAdmin: boolean;
}) {
  const [items, setItems] = useState(admissionClasses);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    id: 0,
    admissionSessionId: sessions[0]?.id ?? 0,
    classId: schoolClasses[0]?.id ?? 0,
    seatCapacity: 30,
    admissionFee: 0,
    startDate: "",
    endDate: "",
    status: "OPEN" as "OPEN" | "CLOSED" | "FULL",
  });

  const resetForm = () =>
    setForm({
      id: 0,
      admissionSessionId: sessions[0]?.id ?? 0,
      classId: schoolClasses[0]?.id ?? 0,
      seatCapacity: 30,
      admissionFee: 0,
      startDate: "",
      endDate: "",
      status: "OPEN",
    });

  const onSubmit = () => {
    startTransition(async () => {
      const res = await upsertAdmissionClass(form);
      if (res.success) {
        toast.success(res.message);
        window.location.reload();
      } else toast.error(res.message);
    });
  };

  const onEdit = (item: AdmissionClassItem) => {
    setForm({
      id: item.id,
      admissionSessionId: item.admissionSessionId,
      classId: item.classId,
      seatCapacity: item.seatCapacity,
      admissionFee: Number(item.admissionFee),
      startDate: "",
      endDate: "",
      status: item.status,
    });
  };

  const onDelete = (id: number) => {
    if (!confirm("Delete this admission class?")) return;
    startTransition(async () => {
      const res = await deleteAdmissionClass(id);
      if (res.success) {
        toast.success(res.message);
        setItems((prev) => prev.filter((i) => i.id !== id));
      } else toast.error(res.message);
    });
  };

  return (
    <div className="space-y-6">
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>{form.id ? "Edit Class Config" : "Add Class to Session"}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Session</Label>
              <Select
                value={String(form.admissionSessionId)}
                onValueChange={(v) =>
                  setForm({ ...form, admissionSessionId: Number(v) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name} ({s.academicYear})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Class</Label>
              <Select
                value={String(form.classId)}
                onValueChange={(v) => setForm({ ...form, classId: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {schoolClasses.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      Grade {c.grade.level} - {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Seat Capacity</Label>
              <Input
                type="number"
                value={form.seatCapacity}
                onChange={(e) =>
                  setForm({ ...form, seatCapacity: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Admission Fee (৳)</Label>
              <Input
                type="number"
                value={form.admissionFee}
                onChange={(e) =>
                  setForm({ ...form, admissionFee: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm({ ...form, status: v as typeof form.status })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                  <SelectItem value="FULL">Full</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={onSubmit} disabled={pending}>
                {pending ? "Saving..." : form.id ? "Update" : "Add Class"}
              </Button>
              {form.id > 0 && (
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Card key={item.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{item.class.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {item.admissionSession.name} · Grade {item.class.grade.level}
              </p>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md bg-muted p-2">
                  <p className="text-xs text-muted-foreground">Applications</p>
                  <p className="font-bold">
                    {(item.confirmedCount ?? 0) + (item.pendingCount ?? 0)}
                  </p>
                </div>
                <div className="rounded-md bg-muted p-2">
                  <p className="text-xs text-muted-foreground">Confirmed</p>
                  <p className="font-bold text-emerald-600">{item.confirmedCount ?? 0}</p>
                </div>
                <div className="rounded-md bg-muted p-2">
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="font-bold text-amber-600">{item.pendingCount ?? 0}</p>
                </div>
                <div className="rounded-md bg-muted p-2">
                  <p className="text-xs text-muted-foreground">Available</p>
                  <p className="font-bold">{item.availableSeats ?? 0}</p>
                </div>
              </div>
              <p>
                Fee: ৳{Number(item.admissionFee).toLocaleString("en-BD")} · Seats:{" "}
                {item.seatCapacity} · {item.status}
              </p>
              {isAdmin && (
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => onEdit(item)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onDelete(item.id)}
                  >
                    Delete
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
