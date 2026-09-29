import { z } from "zod";

export const admissionSessionSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(2, "Session name is required"),
  academicYear: z.string().min(4, "Academic year is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  status: z.enum(["DRAFT", "OPEN", "CLOSED", "ARCHIVED"]).default("DRAFT"),
});

export const admissionClassSchema = z.object({
  id: z.coerce.number().optional(),
  admissionSessionId: z.coerce.number(),
  classId: z.coerce.number(),
  seatCapacity: z.coerce.number().int().min(1, "Seat capacity must be at least 1"),
  admissionFee: z.coerce.number().min(0, "Fee cannot be negative"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(["OPEN", "CLOSED", "FULL"]).default("OPEN"),
});

export const admissionSettingSchema = z.object({
  admissionEnabled: z.boolean(),
  bkashNumber: z.string().optional(),
  paymentInstruction: z.string().optional(),
  applicationPrefix: z.string().min(2).max(10).default("ADM"),
  admissionPrefix: z.string().min(2).max(10).default("ADM"),
  invoicePrefix: z.string().min(2).max(20).default("INV-ADM"),
});

export const admissionApplicationSchema = z.object({
  admissionSessionId: z.coerce.number(),
  admissionClassId: z.coerce.number(),
  studentName: z.string().min(2, "Student name is required"),
  studentNameBangla: z.string().optional(),
  surname: z.string().min(1, "Surname is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["MALE", "FEMALE"]),
  birthCertificateNumber: z.string().optional(),
  bloodGroup: z.string().min(1, "Blood group is required"),
  religion: z.string().optional(),
  nationality: z.string().optional(),
  studentPhoto: z.string().optional(),
  fatherName: z.string().min(2, "Father name is required"),
  fatherMobile: z.string().min(10, "Valid father mobile is required"),
  fatherOccupation: z.string().optional(),
  fatherNid: z.string().optional(),
  motherName: z.string().optional(),
  motherMobile: z.string().optional(),
  motherOccupation: z.string().optional(),
  motherNid: z.string().optional(),
  guardianName: z.string().optional(),
  guardianMobile: z.string().optional(),
  guardianRelation: z.string().optional(),
  presentAddress: z.string().min(5, "Present address is required"),
  permanentAddress: z.string().optional(),
  division: z.string().optional(),
  district: z.string().optional(),
  upazila: z.string().optional(),
  villageArea: z.string().optional(),
  previousSchool: z.string().optional(),
  previousClass: z.string().optional(),
  previousResult: z.string().optional(),
  previousSchoolAddress: z.string().optional(),
  transferCertificateNumber: z.string().optional(),
  medicalInfo: z.string().optional(),
});

export const admissionSearchSchema = z.object({
  schoolSlug: z.string().min(1),
  applicationNumber: z.string().min(3),
  mobile: z.string().min(10, "Mobile number is required"),
});

export const admissionPaymentSubmitSchema = z.object({
  applicationNumber: z.string().min(3),
  schoolSlug: z.string().min(1),
  senderMobile: z.string().min(10, "Sender mobile is required"),
  transactionId: z.string().min(5, "Transaction ID is required"),
});

export const admissionPaymentVerifySchema = z.object({
  paymentId: z.coerce.number(),
  action: z.enum(["verify", "reject"]),
  rejectionReason: z.string().optional(),
});

export const admissionApplicationActionSchema = z.object({
  applicationId: z.coerce.number(),
  action: z.enum(["review", "approve", "reject", "confirm", "cancel"]),
  note: z.string().optional(),
  rejectionReason: z.string().optional(),
});

export const admissionFilterSchema = z.object({
  sessionId: z.coerce.number().optional(),
  classId: z.coerce.number().optional(),
  applicationStatus: z.string().optional(),
  paymentStatus: z.string().optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().optional(),
});

export type AdmissionSessionInput = z.infer<typeof admissionSessionSchema>;
export type AdmissionClassInput = z.infer<typeof admissionClassSchema>;
export type AdmissionSettingInput = z.infer<typeof admissionSettingSchema>;
export type AdmissionApplicationInput = z.infer<typeof admissionApplicationSchema>;
export type AdmissionPaymentSubmitInput = z.infer<typeof admissionPaymentSubmitSchema>;
export type AdmissionPaymentVerifyInput = z.infer<typeof admissionPaymentVerifySchema>;
export type AdmissionApplicationActionInput = z.infer<typeof admissionApplicationActionSchema>;
export type AdmissionFilterInput = z.infer<typeof admissionFilterSchema>;
export type AdmissionSearchInput = z.infer<typeof admissionSearchSchema>;
