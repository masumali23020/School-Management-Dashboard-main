// prisma/seed.ts
// Run: npx prisma db seed

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...\n");

  // ── 1. Subscription Plans ────────────────────────────────────────────────────
  console.log("📦 Creating subscription plans...");

  const plans = await Promise.all([
    prisma.subscriptionPlan.upsert({
      where:  { name: "FREE" },
      update: {},
      create: {
        name:         "FREE",
        price:        0,
        maxStudents:  50,
        maxEmployees: 5,
        hasSMS:       false,
        hasAnalytics: false,
      },
    }),
    prisma.subscriptionPlan.upsert({
      where:  { name: "STANDARD" },
      update: {},
      create: {
        name:         "STANDARD",
        price:        2500,
        maxStudents:  200,
        maxEmployees: 20,
        hasSMS:       false,
        hasAnalytics: false,
      },
    }),
    prisma.subscriptionPlan.upsert({
      where:  { name: "POPULAR" },
      update: {},
      create: {
        name:         "POPULAR",
        price:        5000,
        maxStudents:  999999,
        maxEmployees: 999999,
        hasSMS:       true,
        hasAnalytics: true,
      },
    }),
  ]);

  console.log(`   ✓ ${plans.length} plans created (FREE, STANDARD, POPULAR)`);

  // ── 2. Super Admin ───────────────────────────────────────────────────────────
  console.log("\n👑 Creating Super Admin...");

  const superAdminPassword = await bcrypt.hash("SuperAdmin@123", 12);

  const superAdmin = await prisma.superAdmin.upsert({
    where:  { email: "superadmin@schoolsaas.com" },
    update: {},
    create: {
      email:    "superadmin@schoolsaas.com",
      password: superAdminPassword,
      name:     "Super Admin",
    },
  });

  console.log(`   ✓ Super Admin created`);
  console.log(`   📧 Email   : superadmin@schoolsaas.com`);
  console.log(`   🔑 Password: SuperAdmin@123`);

  // ── 3. Demo School ───────────────────────────────────────────────────────────
  console.log("\n🏫 Creating demo school...");

  const popularPlan = plans.find((p) => p.name === "POPULAR")!;

  const expiredAt = new Date();
  expiredAt.setFullYear(expiredAt.getFullYear() + 1); // 1 year from now

  const school = await prisma.school.upsert({
    where:  { eiinNumber: "123456" },
    update: {},
    create: {
      schoolName:      "Dhaka Model High School",
      shortName:       "DMHS",
      eiinNumber:      "123456",
      slug:            "dhaka-model-high-school",
      email:           "info@dmhs.edu.bd",
      phone:           "01711000001",
      address:         "Mirpur-10, Dhaka-1216",
      planId:          popularPlan.id,
      isActive:        true,
      smsBalance:      100,
      expiredAt,
      academicSession: new Date().getFullYear().toString(),
    },
  });

  console.log(`   ✓ School created → ID: ${school.id} | "${school.schoolName}"`);

  // ── 4. School Admin Employee ─────────────────────────────────────────────────
  console.log("\n👤 Creating school admin...");

  const adminPassword = await bcrypt.hash("Admin@123", 12);

  const admin = await prisma.employee.upsert({
    where:  { username: "dmhs_admin" },
    update: {},
    create: {
      id:          "emp_dmhs_admin_001",
      schoolId:    school.id,
      username:    "dmhs_admin",
      password:    adminPassword,
      role:        "ADMIN",
      name:        "Rahim",
      surname:     "Uddin",
      email:       "admin@dmhs.edu.bd",
      phone:       "01711000002",
      address:     "Mirpur-10, Dhaka",
      bloodType:   "B+",
      sex:         "MALE",
      birthday:    new Date("1985-06-15"),
      designation: "School Administrator",
    },
  });

  console.log(`   ✓ Admin created`);
  console.log(`   🏫 School ID: ${school.id}`);
  console.log(`   👤 Username : dmhs_admin`);
  console.log(`   🔑 Password : Admin@123`);

  // ── 5. Demo Teacher ──────────────────────────────────────────────────────────
  console.log("\n👨‍🏫 Creating demo teacher...");

  const teacherPassword = await bcrypt.hash("Teacher@123", 12);

  const teacher = await prisma.employee.upsert({
    where:  { username: "dmhs_teacher1" },
    update: {},
    create: {
      id:          "emp_dmhs_teacher_001",
      schoolId:    school.id,
      username:    "dmhs_teacher1",
      password:    teacherPassword,
      role:        "TEACHER",
      name:        "Karim",
      surname:     "Hossain",
      email:       "karim@dmhs.edu.bd",
      phone:       "01711000003",
      address:     "Mirpur-12, Dhaka",
      bloodType:   "A+",
      sex:         "MALE",
      birthday:    new Date("1990-03-20"),
      designation: "Senior Teacher",
    },
  });

  console.log(`   ✓ Teacher created → Username: dmhs_teacher1 | Password: Teacher@123`);

  // ── 6. Demo Cashier ──────────────────────────────────────────────────────────
  console.log("\n💳 Creating demo cashier...");

  const cashierPassword = await bcrypt.hash("Cashier@123", 12);

  await prisma.employee.upsert({
    where:  { username: "dmhs_cashier1" },
    update: {},
    create: {
      id:          "emp_dmhs_cashier_001",
      schoolId:    school.id,
      username:    "dmhs_cashier1",
      password:    cashierPassword,
      role:        "CASHIER",
      name:        "Sadia",
      surname:     "Islam",
      email:       "cashier@dmhs.edu.bd",
      phone:       "01711000004",
      address:     "Mohammadpur, Dhaka",
      bloodType:   "O+",
      sex:         "FEMALE",
      birthday:    new Date("1993-09-10"),
      designation: "Accounts Officer",
    },
  });

  console.log(`   ✓ Cashier created → Username: dmhs_cashier1 | Password: Cashier@123`);

  // ── 7. Grade & Class ─────────────────────────────────────────────────────────
  console.log("\n📚 Creating grades and classes...");

  const grade6 = await prisma.grade.upsert({
    where:  { schoolId_level: { schoolId: school.id, level: 6 } },
    update: {},
    create: { schoolId: school.id, level: 6 },
  });

  const grade7 = await prisma.grade.upsert({
    where:  { schoolId_level: { schoolId: school.id, level: 7 } },
    update: {},
    create: { schoolId: school.id, level: 7 },
  });

  const class6a = await prisma.class.upsert({
    where:  { schoolId_name: { schoolId: school.id, name: "Class 6-A" } },
    update: {},
    create: {
      schoolId:    school.id,
      name:        "Class 6-A",
      capacity:    40,
      gradeId:     grade6.id,
      supervisorId: teacher.id,
    },
  });

  await prisma.class.upsert({
    where:  { schoolId_name: { schoolId: school.id, name: "Class 7-A" } },
    update: {},
    create: {
      schoolId:    school.id,
      name:        "Class 7-A",
      capacity:    40,
      gradeId:     grade7.id,
      supervisorId: teacher.id,
    },
  });

  console.log(`   ✓ Grade 6 & 7 created`);
  console.log(`   ✓ Class 6-A & Class 7-A created`);

  // ── 8. Demo Parent & Student ─────────────────────────────────────────────────
  console.log("\n👨‍👩‍👧 Creating demo parent and student...");

  const parent = await prisma.parent.upsert({
    where:  { username: "parent_arif" },
    update: {},
    create: {
      id:       "par_dmhs_001",
      schoolId: school.id,
      username: "parent_arif",
      name:     "Arif",
      surname:  "Hossain",
      phone:    "01711000005",
      address:  "Uttara, Dhaka",
    },
  });

  const studentPassword = await bcrypt.hash("Student@123", 12);

  await prisma.student.upsert({
    where:  { username: "dmhs_student1" },
    update: {},
    create: {
      id:        "stu_dmhs_001",
      schoolId:  school.id,
      username:  "dmhs_student1",
      password:  studentPassword,
      name:      "Riya",
      surname:   "Hossain",
      phone:     "01711000006",
      address:   "Uttara, Dhaka",
      bloodType: "AB+",
      sex:       "FEMALE",
      birthday:  new Date("2012-04-22"),
      parentId:  parent.id,
      classId:   class6a.id,
      gradeId:   grade6.id,
    },
  });

  console.log(`   ✓ Parent created  → Username: parent_arif`);
  console.log(`   ✓ Student created → Username: dmhs_student1 | Password: Student@123`);

  // ── 9. Subject ───────────────────────────────────────────────────────────────
  console.log("\n📖 Creating subjects...");

  const subjects = ["Mathematics", "English", "Science", "Bangla", "ICT"];

  for (const name of subjects) {
    await prisma.subject.upsert({
      where:  { schoolId_name: { schoolId: school.id, name } },
      update: {},
      create: { schoolId: school.id, name, teachers: { connect: { id: teacher.id } } },
    });
  }

  console.log(`   ✓ ${subjects.length} subjects created`);

  // ── 10. Fee Types ────────────────────────────────────────────────────────────
  console.log("\n💰 Creating fee types...");

  const feeTypes = ["Tuition Fee", "Admission Fee", "Exam Fee", "Library Fee"];

  for (const name of feeTypes) {
    await prisma.feeType.upsert({
      where:  { schoolId_name: { schoolId: school.id, name } },
      update: {},
      create: { schoolId: school.id, name, isActive: true },
    });
  }

  console.log(`   ✓ ${feeTypes.length} fee types created`);

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(50));
  console.log("✅ Seed complete!\n");
  console.log("🔐 LOGIN CREDENTIALS");
  console.log("─".repeat(50));
  console.log(`👑 Super Admin`);
  console.log(`   Email    : superadmin@schoolsaas.com`);
  console.log(`   Password : SuperAdmin@123`);
  console.log(`   URL      : /superadmin/login\n`);
  console.log(`🏫 School ID: ${school.id} (use this when logging in)\n`);
  console.log(`⚙️  Admin     → username: dmhs_admin      | password: Admin@123`);
  console.log(`👨‍🏫 Teacher   → username: dmhs_teacher1   | password: Teacher@123`);
  console.log(`💳 Cashier   → username: dmhs_cashier1   | password: Cashier@123`);
  console.log(`🎓 Student   → username: dmhs_student1   | password: Student@123`);
  console.log("─".repeat(50));
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });