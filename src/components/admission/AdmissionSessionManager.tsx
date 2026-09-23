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
  createAdmissionSession,
  deleteAdmissionSession,
  updateAdmissionSession,
} from "@/Actions/admission/admission.actions";

type Session = {
  id: number;
  name: string;
  academicYear: string;
  startDate: string | Date;
  endDate: string | Date;
  status: "DRAFT" | "OPEN" | "CLOSED" | "ARCHIVED";
  _count?: { admissionClasses: number; admissionApplications: number };
};

export default function AdmissionSessionManager({
  sessions,
  isAdmin,
}: {
  sessions: Session[];
  isAdmin: boolean;
}) {
  const [items, setItems] = useState(sessions);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    id: 0,
    name: "",
    academicYear: new Date().getFullYear().toString(),
    startDate: "",
    endDate: "",
    status: "DRAFT" as Session["status"],
  });

  const resetForm = () =>
    setForm({
      id: 0,
      name: "",
      academicYear: new Date().getFullYear().toString(),
      startDate: "",
      endDate: "",
      status: "DRAFT",
    });

  const onSubmit = () => {
    startTransition(async () => {
      const action = form.id ? updateAdmissionSession : createAdmissionSession;
      const res = await action(form);
      if (res.success) {
        toast.success(res.message);
        window.location.reload();
      } else toast.error(res.message);
    });
  };

  const onEdit = (s: Session) => {
    setForm({
      id: s.id,
      name: s.name,
      academicYear: s.academicYear,
      startDate: new Date(s.startDate).toISOString().slice(0, 10),
      endDate: new Date(s.endDate).toISOString().slice(0, 10),
      status: s.status,
    });
  };

  const onDelete = (id: number) => {
    if (!confirm("Delete this session?")) return;
    startTransition(async () => {
      const res = await deleteAdmissionSession(id);
      if (res.success) {
        toast.success(res.message);
        setItems((prev) => prev.filter((s) => s.id !== id));
      } else toast.error(res.message);
    });
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Admission Sessions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.map((s) => (
            <div key={s.id} className="rounded-lg border p-3 text-sm">
              <p className="font-semibold">{s.name}</p>
              <p className="text-muted-foreground">
                {s.academicYear} · {s.status}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{form.id ? "Edit Session" : "Create Session"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Session Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="2027 Admission"
            />
          </div>
          <div className="space-y-2">
            <Label>Academic Year</Label>
            <Input
              value={form.academicYear}
              onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) =>
                setForm({ ...form, status: v as Session["status"] })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button onClick={onSubmit} disabled={pending}>
              {pending ? "Saving..." : form.id ? "Update" : "Create"}
            </Button>
            {form.id > 0 && (
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground">No sessions yet.</p>
          )}
          {items.map((s) => (
            <div
              key={s.id}
              className="flex items-start justify-between rounded-lg border p-3"
            >
              <div>
                <p className="font-semibold">{s.name}</p>
                <p className="text-xs text-muted-foreground">
                  {s.academicYear} · {s.status} · {s._count?.admissionClasses ?? 0}{" "}
                  classes · {s._count?.admissionApplications ?? 0} applications
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => onEdit(s)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onDelete(s.id)}
                  disabled={pending}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
