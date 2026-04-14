// "use server";

// // src/Actions/employeeActions.ts
// // createAdmin, createTeacher, createStaff, createCashier — সব এখানে

// import { clerkClient } from "@clerk/nextjs/server";
// import prisma from "@/lib/db";
// import { UserRole } from "@prisma/client";

// // ── Types (তোমার schema অনুযায়ী adjust করো) ──────────────────────────────
// import {
//   AdminSchema,
//   TeacherSchema,
//   StaffSchema,
//   CashierSchema,        // না থাকলে StaffSchema ব্যবহার করো
// } from "@/lib/FormValidationSchema";

// type CreateState = { success: boolean; error: boolean };

// // ── Clerk role → publicMetadata mapping ────────────────────────────────────
// // ⚠️ BUG FIX: আগে সব role এ hardcoded "teacher" ছিল।
// //    এখন প্রতিটা role আলাদাভাবে সেট করা হচ্ছে।
// const ROLE_META: Record<UserRole, string> = {
//   ADMIN:   "admin",
//   CASHIER: "cashier",
//   TEACHER: "teacher",
//   STAFF:   "staff",
// };

// // ── Shared create helper ───────────────────────────────────────────────────
// async function createEmployeeInClerkAndDB(
//   data: {
//     username:    string;
//     password:    string;
//     name:        string;
//     surname:     string;
//     email?:      string | null;
//     phone?:      string | null;
//     address:     string;
//     img?:        string | null;
//     bloodType:   string;
//     sex:         "MALE" | "FEMALE";
//     birthday:    Date;
//     designation?: string | null;
//     subjects?:   string[];
//   },
//   role: UserRole
// ) {
//   const client = await clerkClient();

//   // 1. Clerk user তৈরি করো
//   const user = await client.users.createUser({
//     username:       data.username,
//     password:       data.password,
//     firstName:      data.name,
//     lastName:       data.surname,
//     publicMetadata: { role: ROLE_META[role] }, // ✅ সঠিক role
//   });

//   // 2. Employee row তৈরি করো — id = user.id (Clerk userId)
//   //    এটাই processedById FK এর জন্য দরকার
//   await prisma.employee.create({
//     data: {
//       id:          user.id,          // ✅ Clerk userId = Employee.id
//       username:    data.username,
//       role,
//       name:        data.name,
//       surname:     data.surname,
//       email:       data.email       ?? null,
//       phone:       data.phone       ?? null,
//       address:     data.address,
//       img:         data.img         ?? null,
//       bloodType:   data.bloodType,
//       sex:         data.sex,
//       birthday:    data.birthday,
//       designation: data.designation ?? null,
//       ...(data.subjects?.length
//         ? {
//             subjects: {
//               connect: data.subjects.map((subjectId: string) => ({
//                 id: parseInt(subjectId),
//               })),
//             },
//           }
//         : {}),
//     },
//   });

//   return user.id;
// }

// // ── Shared update helper ───────────────────────────────────────────────────
// async function updateEmployeeInClerkAndDB(
//   id: string,
//   data: {
//     username:    string;
//     password?:   string;
//     name:        string;
//     surname:     string;
//     email?:      string | null;
//     phone?:      string | null;
//     address:     string;
//     img?:        string | null;
//     bloodType:   string;
//     sex:         "MALE" | "FEMALE";
//     birthday:    Date;
//     designation?: string | null;
//     subjects?:   string[];
//   }
// ) {
//   const client = await clerkClient();

//   await client.users.updateUser(id, {
//     username:  data.username,
//     firstName: data.name,
//     lastName:  data.surname,
//     ...(data.password ? { password: data.password } : {}),
//   });

//   await prisma.employee.update({
//     where: { id },
//     data: {
//       username:    data.username,
//       name:        data.name,
//       surname:     data.surname,
//       email:       data.email       ?? null,
//       phone:       data.phone       ?? null,
//       address:     data.address,
//       img:         data.img         ?? null,
//       bloodType:   data.bloodType,
//       sex:         data.sex,
//       birthday:    data.birthday,
//       designation: data.designation ?? null,
//       ...(data.subjects
//         ? {
//             subjects: {
//               set: data.subjects.map((subjectId: string) => ({
//                 id: parseInt(subjectId),
//               })),
//             },
//           }
//         : {}),
//     },
//   });
// }

// // ── Shared delete helper ───────────────────────────────────────────────────
// async function deleteEmployeeFromClerkAndDB(id: string) {
//   const client = await clerkClient();
//   await client.users.deleteUser(id);
//   await prisma.employee.delete({ where: { id } });
// }

// // ═══════════════════════════════════════════════════════════════════════
// // ADMIN
// // ═══════════════════════════════════════════════════════════════════════

// export const createAdmin = async (state: CreateState, data: AdminSchema) => {
//   try {
//     await createEmployeeInClerkAndDB(data, UserRole.ADMIN);
//     return { success: true, error: false };
//   } catch (err) {
//     console.error("createAdmin error:", err);
//     return { success: false, error: true };
//   }
// };

// export const updateAdmin = async (state: CreateState, data: AdminSchema) => {
//   if (!data.id) return { success: false, error: true };
//   try {
//     await updateEmployeeInClerkAndDB(data.id, data);
//     return { success: true, error: false };
//   } catch (err) {
//     console.error("updateAdmin error:", err);
//     return { success: false, error: true };
//   }
// };

// export const deleteAdmin = async (state: CreateState, formData: FormData) => {
//   const id = formData.get("id") as string;
//   try {
//     await deleteEmployeeFromClerkAndDB(id);
//     return { success: true, error: false };
//   } catch (err) {
//     console.error("deleteAdmin error:", err);
//     return { success: false, error: true };
//   }
// };

// // ═══════════════════════════════════════════════════════════════════════
// // TEACHER
// // ═══════════════════════════════════════════════════════════════════════

// export const createTeacher = async (state: CreateState, data: TeacherSchema) => {
//   try {
//     await createEmployeeInClerkAndDB(data, UserRole.TEACHER);
//     return { success: true, error: false };
//   } catch (err) {
//     console.error("createTeacher error:", err);
//     return { success: false, error: true };
//   }
// };

// export const updateTeacher = async (state: CreateState, data: TeacherSchema) => {
//   if (!data.id) return { success: false, error: true };
//   try {
//     await updateEmployeeInClerkAndDB(data.id, data);
//     return { success: true, error: false };
//   } catch (err) {
//     console.error("updateTeacher error:", err);
//     return { success: false, error: true };
//   }
// };

// export const deleteTeacher = async (state: CreateState, formData: FormData) => {
//   const id = formData.get("id") as string;
//   try {
//     await deleteEmployeeFromClerkAndDB(id);
//     return { success: true, error: false };
//   } catch (err) {
//     console.error("deleteTeacher error:", err);
//     return { success: false, error: true };
//   }
// };

// // ═══════════════════════════════════════════════════════════════════════
// // CASHIER
// // ═══════════════════════════════════════════════════════════════════════

// export const createCashier = async (state: CreateState, data: CashierSchema) => {
//   try {
//     await createEmployeeInClerkAndDB(data, UserRole.CASHIER);
//     return { success: true, error: false };
//   } catch (err) {
//     console.error("createCashier error:", err);
//     return { success: false, error: true };
//   }
// };

// export const updateCashier = async (state: CreateState, data: CashierSchema) => {
//   if (!data.id) return { success: false, error: true };
//   try {
//     await updateEmployeeInClerkAndDB(data.id, data);
//     return { success: true, error: false };
//   } catch (err) {
//     console.error("updateCashier error:", err);
//     return { success: false, error: true };
//   }
// };

// export const deleteCashier = async (state: CreateState, formData: FormData) => {
//   const id = formData.get("id") as string;
//   try {
//     await deleteEmployeeFromClerkAndDB(id);
//     return { success: true, error: false };
//   } catch (err) {
//     console.error("deleteCashier error:", err);
//     return { success: false, error: true };
//   }
// };





