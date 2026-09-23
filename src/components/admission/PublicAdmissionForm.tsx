"use client";

import { useState, useTransition, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  admissionApplicationSchema,
  type AdmissionApplicationInput,
} from "@/schemas/admission";
import { submitAdmissionApplication } from "@/Actions/admission/admission.actions";
import { calculateAgeFromDOB } from "@/lib/admission/age";

type OpenClass = {
  id: number;
  sessionId: number;
  sessionName: string;
  class: { name: string; grade: { level: number } };
  admissionFee: string | number;
  availableSeats: number;
};

export default function PublicAdmissionForm({
  schoolSlug,
  schoolBasePath,
  openClasses,
}: {
  schoolSlug: string;
  schoolBasePath?: string;
  openClasses: OpenClass[];
}) {
  const router = useRouter();
  const base = schoolBasePath ?? `/${schoolSlug}`;
  const [pending, startTransition] = useTransition();
  const [selectedClass, setSelectedClass] = useState<OpenClass | null>(
    openClasses[0] ?? null
  );

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<AdmissionApplicationInput>({
    resolver: zodResolver(admissionApplicationSchema),
    defaultValues: {
      gender: "MALE",
      nationality: "Bangladeshi",
      admissionSessionId: openClasses[0]?.sessionId,
      admissionClassId: openClasses[0]?.id,
    },
  });

  const dateOfBirth = useWatch({ control, name: "dateOfBirth" });
  const ageLabel = useMemo(() => {
    if (!dateOfBirth) return null;
    return calculateAgeFromDOB(dateOfBirth).label;
  }, [dateOfBirth]);

  const onSelectClass = (classId: string) => {
    const found = openClasses.find((c) => c.id === Number(classId));
    setSelectedClass(found ?? null);
    if (found) {
      setValue("admissionClassId", found.id);
      setValue("admissionSessionId", found.sessionId);
    }
  };

  const onSubmit = handleSubmit((data) => {
    startTransition(async () => {
      const res = await submitAdmissionApplication(schoolSlug, data);
      if (res.success && res.data?.applicationNumber && res.data.verificationCode) {
        toast.success(res.message);
        router.push(
          `${base}/admission/application/${encodeURIComponent(res.data.applicationNumber)}?v=${encodeURIComponent(res.data.verificationCode)}`
        );
      } else {
        toast.error(res.message);
      }
    });
  });

  if (openClasses.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Currently no classes are open for admission.
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Select Class</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select
            value={String(selectedClass?.id ?? "")}
            onValueChange={onSelectClass}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose class" />
            </SelectTrigger>
            <SelectContent>
              {openClasses.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.class.name} (Grade {c.class.grade.level}) — ৳
                  {Number(c.admissionFee).toLocaleString("en-BD")} — {c.availableSeats}{" "}
                  seats left
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Student Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Student Name *</Label>
            <Input {...register("studentName")} />
            {errors.studentName && (
              <p className="text-xs text-red-500">{errors.studentName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Name (Bangla)</Label>
            <Input {...register("studentNameBangla")} />
          </div>
          <div className="space-y-2">
            <Label>Surname *</Label>
            <Input {...register("surname")} />
          </div>
          <div className="space-y-2">
            <Label>Date of Birth *</Label>
            <Input type="date" {...register("dateOfBirth")} />
            {ageLabel && (
              <p className="text-xs text-muted-foreground">Age: {ageLabel}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Gender *</Label>
            <Select
              defaultValue="MALE"
              onValueChange={(v) => setValue("gender", v as "MALE" | "FEMALE")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MALE">Male</SelectItem>
                <SelectItem value="FEMALE">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Blood Group *</Label>
            <Input {...register("bloodGroup")} placeholder="A+" />
          </div>
          <div className="space-y-2">
            <Label>Religion</Label>
            <Input {...register("religion")} />
          </div>
          <div className="space-y-2">
            <Label>Nationality</Label>
            <Input {...register("nationality")} defaultValue="Bangladeshi" />
          </div>
          <div className="space-y-2">
            <Label>Birth Certificate Number</Label>
            <Input {...register("birthCertificateNumber")} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Photo URL</Label>
            <Input {...register("studentPhoto")} placeholder="https://..." />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Parent / Guardian</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Father Name *</Label>
            <Input {...register("fatherName")} />
          </div>
          <div className="space-y-2">
            <Label>Father Mobile *</Label>
            <Input {...register("fatherMobile")} />
          </div>
          <div className="space-y-2">
            <Label>Father Occupation</Label>
            <Input {...register("fatherOccupation")} />
          </div>
          <div className="space-y-2">
            <Label>Father NID (optional)</Label>
            <Input {...register("fatherNid")} />
          </div>
          <div className="space-y-2">
            <Label>Mother Name</Label>
            <Input {...register("motherName")} />
          </div>
          <div className="space-y-2">
            <Label>Mother Mobile</Label>
            <Input {...register("motherMobile")} />
          </div>
          <div className="space-y-2">
            <Label>Mother Occupation</Label>
            <Input {...register("motherOccupation")} />
          </div>
          <div className="space-y-2">
            <Label>Mother NID (optional)</Label>
            <Input {...register("motherNid")} />
          </div>
          <div className="space-y-2">
            <Label>Guardian Name</Label>
            <Input {...register("guardianName")} />
          </div>
          <div className="space-y-2">
            <Label>Guardian Mobile</Label>
            <Input {...register("guardianMobile")} />
          </div>
          <div className="space-y-2">
            <Label>Guardian Relation</Label>
            <Input {...register("guardianRelation")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Address</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Present Address *</Label>
            <Textarea {...register("presentAddress")} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Permanent Address</Label>
            <Textarea {...register("permanentAddress")} />
          </div>
          <div className="space-y-2">
            <Label>Division</Label>
            <Input {...register("division")} />
          </div>
          <div className="space-y-2">
            <Label>District</Label>
            <Input {...register("district")} />
          </div>
          <div className="space-y-2">
            <Label>Upazila</Label>
            <Input {...register("upazila")} />
          </div>
          <div className="space-y-2">
            <Label>Village / Area</Label>
            <Input {...register("villageArea")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Academic & Additional Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Previous School</Label>
            <Input {...register("previousSchool")} />
          </div>
          <div className="space-y-2">
            <Label>Previous Class</Label>
            <Input {...register("previousClass")} />
          </div>
          <div className="space-y-2">
            <Label>Previous Result / GPA</Label>
            <Input {...register("previousResult")} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Previous School Address</Label>
            <Textarea {...register("previousSchoolAddress")} />
          </div>
          <div className="space-y-2">
            <Label>Transfer Certificate Number</Label>
            <Input {...register("transferCertificateNumber")} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Medical / Other Information</Label>
            <Textarea {...register("medicalInfo")} />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending}>
        {pending ? "Submitting..." : "Submit Application"}
      </Button>
    </form>
  );
}
