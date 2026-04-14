// prisma/seed.ts
import { PrismaClient, UserSex, Day, PaymentMethod } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...\n");

  // ── 1. Subscription Plans ────────────────────────────────────────────────
  console.log("📦 Creating subscription plans...");

  const plans = await Promise.all([
    prisma.subscriptionPlan.upsert({
      where: { name: "FREE" },
      update: {},
      create: {
        name: "FREE",
        price: 0,
        maxStudents: 50,
        maxEmployees: 5,
        hasSMS: false,
        hasAnalytics: false,
      },
    }),
    prisma.subscriptionPlan.upsert({
      where: { name: "STANDARD" },
      update: {},
      create: {
        name: "STANDARD",
        price: 2500,
        maxStudents: 200,
        maxEmployees: 20,
        hasSMS: false,
        hasAnalytics: false,
      },
    }),
    prisma.subscriptionPlan.upsert({
      where: { name: "POPULAR" },
      update: {},
      create: {
        name: "POPULAR",
        price: 5000,
        maxStudents: 999999,
        maxEmployees: 999999,
        hasSMS: true,
        hasAnalytics: true,
      },
    }),
  ]);

  console.log(`   ✓ ${plans.length} plans created`);

  // ── 2. Super Admin ───────────────────────────────────────────────────────
  console.log("\n👑 Creating Super Admin...");

  const superAdminPassword = await bcrypt.hash("SuperAdmin@123", 12);

  await prisma.superAdmin.upsert({
    where: { email: "superadmin@schoolsaas.com" },
    update: {},
    create: {
      email: "superadmin@schoolsaas.com",
      password: superAdminPassword,
      name: "Super Admin",
    },
  });

  console.log(`   ✓ Super Admin created`);

  // ── 3. Demo School ───────────────────────────────────────────────────────
  console.log("\n🏫 Creating demo school...");

  const popularPlan = plans.find((p) => p.name === "POPULAR")!;

  const expiredAt = new Date();
  expiredAt.setFullYear(expiredAt.getFullYear() + 1);

  const school = await prisma.school.upsert({
    where: { slug: "dhaka-model-high-school" },
    update: {},
    create: {
      schoolName: "Dhaka Model High School",
      shortName: "DMHS",
      slug: "dhaka-model-high-school",
      email: "info@dmhs.edu.bd",
      phone: "01711000001",
      address: "Mirpur-10, Dhaka-1216",
      eiinNumber: "123456",
      planId: popularPlan.id,
      isActive: true,
      smsBalance: 100,
      expiredAt,
      academicSession: new Date().getFullYear().toString(),
    },
  });

  console.log(`   ✓ School: ${school.schoolName}`);

  // ── 4. Create Grades ──────────────────────────────────────────────────────
  console.log("\n📚 Creating grades...");

  const grades = await Promise.all(
    [6, 7, 8, 9, 10].map((level) =>
      prisma.grade.upsert({
        where: { schoolId_level: { schoolId: school.id, level } },
        update: {},
        create: {
          schoolId: school.id,
          level,
        },
      })
    )
  );

  console.log(`   ✓ ${grades.length} grades created`);

  // ── 5. Create Classes ─────────────────────────────────────────────────────
  console.log("\n🏛 Creating classes...");

  const classNames = ["Six", "Seven", "Eight", "Nine", "Ten"];
  const classes = await Promise.all(
    grades.map((grade, index) =>
      prisma.class.upsert({
        where: { schoolId_name: { schoolId: school.id, name: classNames[index] } },
        update: {},
        create: {
          schoolId: school.id,
          name: classNames[index],
          capacity: 40,
          gradeId: grade.id,
        },
      })
    )
  );

  console.log(`   ✓ ${classes.length} classes created`);

  // ── 6. Create Subjects ────────────────────────────────────────────────────
  console.log("\n📖 Creating subjects...");

  const subjectNames = [
    "Bangla", "English", "Mathematics", "Science", 
    "Social Studies", "Religion", "ICT"
  ];

  const subjects = await Promise.all(
    subjectNames.map((name) =>
      prisma.subject.upsert({
        where: { schoolId_name: { schoolId: school.id, name } },
        update: {},
        create: {
          schoolId: school.id,
          name,
        },
      })
    )
  );

  console.log(`   ✓ ${subjects.length} subjects created`);

  // ── 7. Create Employees ─────────────────────────────────────────────────
  console.log("\n👥 Creating employees...");

  const adminPassword = await bcrypt.hash("Admin@123", 12);
  const teacherPassword = await bcrypt.hash("Teacher@123", 12);
  const cashierPassword = await bcrypt.hash("Cashier@123", 12);
  const staffPassword = await bcrypt.hash("Staff@123", 12);

  const admin = await prisma.employee.upsert({
    where: { username: "dmhs_admin" },
    update: {},
    create: {
      id: `emp_admin_${Date.now()}`,
      schoolId: school.id,
      username: "dmhs_admin",
      password: adminPassword,
      role: "ADMIN",
      name: "Rahim",
      surname: "Uddin",
      email: "admin@dmhs.edu.bd",
      phone: "01711000002",
      address: "Mirpur-10, Dhaka",
      bloodType: "B+",
      sex: "MALE",
      birthday: new Date("1985-06-15"),
      designation: "School Administrator",
    },
  });

  const teacher = await prisma.employee.upsert({
    where: { username: "dmhs_teacher1" },
    update: {},
    create: {
      id: `emp_teacher_${Date.now()}`,
      schoolId: school.id,
      username: "dmhs_teacher1",
      password: teacherPassword,
      role: "TEACHER",
      name: "Karim",
      surname: "Hossain",
      email: "teacher@dmhs.edu.bd",
      phone: "01711000003",
      address: "Mirpur-12, Dhaka",
      bloodType: "A+",
      sex: "MALE",
      birthday: new Date("1990-03-20"),
      designation: "Senior Teacher",
    },
  });

  const cashier = await prisma.employee.upsert({
    where: { username: "dmhs_cashier1" },
    update: {},
    create: {
      id: `emp_cashier_${Date.now()}`,
      schoolId: school.id,
      username: "dmhs_cashier1",
      password: cashierPassword,
      role: "CASHIER",
      name: "Sadia",
      surname: "Islam",
      email: "cashier@dmhs.edu.bd",
      phone: "01711000004",
      address: "Mohammadpur, Dhaka",
      bloodType: "O+",
      sex: "FEMALE",
      birthday: new Date("1993-09-10"),
      designation: "Accounts Officer",
    },
  });

  const staff = await prisma.employee.upsert({
    where: { username: "dmhs_staff1" },
    update: {},
    create: {
      id: `emp_staff_${Date.now()}`,
      schoolId: school.id,
      username: "dmhs_staff1",
      password: staffPassword,
      role: "STAFF",
      name: "Rafiq",
      surname: "Mia",
      email: "staff@dmhs.edu.bd",
      phone: "01711000005",
      address: "Pallabi, Dhaka",
      bloodType: "AB+",
      sex: "MALE",
      birthday: new Date("1988-12-05"),
      designation: "Office Staff",
    },
  });

  console.log(`   ✓ 4 employees created`);

  // ── 8. Create Students with unique usernames ──────────────────────────────
  console.log("\n🎓 Creating students...");

  const students = [];
  const timestamp = Date.now();
  
  for (let i = 1; i <= 20; i++) {
    const grade = grades[i % grades.length];
    const class_ = classes[i % classes.length];
    const sex = i % 2 === 0 ? UserSex.MALE : UserSex.FEMALE;
    
    // Create unique username using timestamp and index
    const uniqueUsername = `student_${timestamp}_${i}`;
    const uniqueEmail = `student_${timestamp}_${i}@dmhs.edu.bd`;
    const uniquePhone = `01711${String(timestamp).slice(-5)}${String(i).padStart(2, '0')}`;
    
    const student = await prisma.student.create({
      data: {
        id: `std_${timestamp}_${i}`,
        schoolId: school.id,
        username: uniqueUsername,
        password: await bcrypt.hash("Student@123", 12),
        name: `Student`,
        surname: `${i}`,
        email: uniqueEmail,
        phone: uniquePhone,
        address: `Mirpur-${i}, Dhaka`,
        bloodType: "O+",
        sex,
        birthday: new Date(2008 + (i % 5), i % 12, (i % 28) + 1),
        classId: class_.id,
        gradeId: grade.id,
      },
    });
    students.push(student);
    console.log(`   ✓ Created student: ${uniqueUsername}`);
  }

  console.log(`   ✓ ${students.length} students created`);

  // ── 9. Create Parents with unique usernames ───────────────────────────────
  console.log("\n👪 Creating parents...");

  const parents = [];
  for (let i = 0; i < students.length; i++) {
    const uniqueUsername = `parent_${timestamp}_${i + 1}`;
    const uniqueEmail = `parent_${timestamp}_${i + 1}@example.com`;
    const uniquePhone = `01811${String(timestamp).slice(-5)}${String(i + 1).padStart(2, '0')}`;
    
    const parent = await prisma.parent.create({
      data: {
        id: `prt_${timestamp}_${i}`,
        schoolId: school.id,
        username: uniqueUsername,
        surname: "Parent",
        password: await bcrypt.hash("Parent@123", 12),
        name: `Parent ${i + 1}`,
        email: uniqueEmail,
        phone: uniquePhone,
        address: `Mirpur-${i + 1}, Dhaka`,
      },
    });
    parents.push(parent);
    console.log(`   ✓ Created parent: ${uniqueUsername}`);
  }

  console.log(`   ✓ ${parents.length} parents created`);

  // ── 10. Update Students with parentId ─────────────────────────────────────
  console.log("\n🔗 Linking students with parents...");

  for (let i = 0; i < students.length; i++) {
    await prisma.student.update({
      where: { id: students[i].id },
      data: { parentId: parents[i].id },
    });
  }

  console.log(`   ✓ ${students.length} students linked to parents`);

  // ── 11. Create Student Class History ──────────────────────────────────────
  console.log("\n📜 Creating student class history...");

  const academicYear = new Date().getFullYear().toString();

  // Per-class roll 1..n (rolls are class-scoped for result portal / fees).
  const studentsByClass = new Map<number, typeof students>();
  for (const s of students) {
    const list = studentsByClass.get(s.classId) ?? [];
    list.push(s);
    studentsByClass.set(s.classId, list);
  }
  await prisma.$transaction(
    [...studentsByClass.entries()].flatMap(([, classStudents]) => {
      const ordered = [...classStudents].sort((a, b) => a.id.localeCompare(b.id));
      return ordered.map((student, idx) =>
        prisma.studentClassHistory.create({
          data: {
            studentId: student.id,
            classId: student.classId,
            gradeId: student.gradeId,
            academicYear,
            rollNumber: idx + 1,
            schoolId: school.id,
          },
        })
      );
    })
  );

  console.log(`   ✓ Student class history created`);

  // ── 12. Assign Class Supervisor ───────────────────────────────────────────
  console.log("\n👨‍🏫 Assigning class supervisors...");

  await Promise.all(
    classes.map((cls, index) =>
      prisma.class.update({
        where: { id: cls.id },
        data: { supervisorId: index === 0 ? teacher.id : admin.id },
      })
    )
  );

  console.log(`   ✓ Class supervisors assigned`);

  // ── 13. Create Class Subject Teachers ──────────────────────────────────────
  console.log("\n📋 Creating class subject teachers...");

  for (const cls of classes.slice(0, 3)) {
    for (const subject of subjects.slice(0, 5)) {
      await prisma.classSubjectTeacher.upsert({
        where: {
          classId_subjectId_academicYear: {
            classId: cls.id,
            subjectId: subject.id,
            academicYear,
          },
        },
        update: {},
        create: {
          schoolId: school.id,
          classId: cls.id,
          subjectId: subject.id,
          teacherId: teacher.id,
          academicYear,
        },
      });
    }
  }

  console.log(`   ✓ Class subject teachers created`);

  // ── 14. Create Lessons ───────────────────────────────────────────────────
  console.log("\n⏰ Creating lessons...");

  const days = [Day.MONDAY, Day.TUESDAY, Day.WEDNESDAY, Day.THURSDAY];

  for (const cls of classes.slice(0, 2)) {
    for (let period = 0; period < 3; period++) {
      const subject = subjects[period % subjects.length];
      const classSubjectTeacher = await prisma.classSubjectTeacher.findFirst({
        where: {
          classId: cls.id,
          subjectId: subject.id,
          academicYear,
        },
      });

      if (classSubjectTeacher) {
        await prisma.lesson.create({
          data: {
            name: `${subject.name} Class`,
            day: days[period % days.length],
            startTime: new Date(2024, 0, 1, 9 + period, 0),
            endTime: new Date(2024, 0, 1, 10 + period, 0),
            subjectId: subject.id,
            classId: cls.id,
            teacherId: teacher.id,
            classSubjectTeacherId: classSubjectTeacher.id,
            schoolId: school.id,
          },
        });
      }
    }
  }

  console.log(`   ✓ Lessons created`);

  // ── 15. Create Fee Types and Structures ──────────────────────────────────
  console.log("\n💰 Creating fee types and structures...");

  const feeTypes = await Promise.all([
    prisma.feeType.upsert({
      where: { schoolId_name: { schoolId: school.id, name: "Tuition Fee" } },
      update: {},
      create: { schoolId: school.id, name: "Tuition Fee", description: "Monthly tuition fee" },
    }),
    prisma.feeType.upsert({
      where: { schoolId_name: { schoolId: school.id, name: "Exam Fee" } },
      update: {},
      create: { schoolId: school.id, name: "Exam Fee", description: "Semester examination fee" },
    }),
    prisma.feeType.upsert({
      where: { schoolId_name: { schoolId: school.id, name: "Annual Fee" } },
      update: {},
      create: { schoolId: school.id, name: "Annual Fee", description: "Yearly annual fee" },
    }),
  ]);

for (const class_ of classes) {
  for (const feeType of feeTypes) {
    const amount = feeType.name === "Tuition Fee" ? 2500 :
                   feeType.name === "Exam Fee" ? 500 : 3000;
    
    await prisma.classFeeStructure.upsert({
      // এখানে classId, feeTypeId এবং academicYear তিনটিই থাকতে হবে
      where: { 
        classId_feeTypeId_academicYear: { 
          classId: class_.id, 
          feeTypeId: feeType.id,
          academicYear: academicYear // আপনার ফাইলে উপরে ডিফাইন করা আছে
        } 
      },
      update: {},
      create: {
        classId: class_.id,
        feeTypeId: feeType.id,
        academicYear: academicYear,
        amount,
        schoolId: school.id,
      },
    });
  }
}

  console.log(`   ✓ ${feeTypes.length} fee types created`);

  // ── 16. Create Fee Payments ───────────────────────────────────────────────
  console.log("\n💵 Creating fee payments...");

  for (let i = 0; i < Math.min(students.length, 10); i++) {
    const student = students[i];
    const class_ = classes[i % classes.length];
    const feeStructure = await prisma.classFeeStructure.findFirst({
      where: { classId: class_.id },
    });
    
    if (feeStructure) {
      await prisma.feePayment.create({
        data: {
          invoiceNumber: `INV-${timestamp}-${i}`,
          studentId: student.id,
          classId: class_.id,
          classFeeStructureId: feeStructure.id,
          amountPaid: feeStructure.amount,
          paymentMethod: PaymentMethod.CASH,
          academicYear,
          monthLabel: new Date().toLocaleString("default", { month: "long" }),
          collectedById: cashier.id,
          schoolId: school.id,
        },
      });
    }
  }

  console.log(`   ✓ Fee payments created`);

  // ── 17. Create Events and Announcements ───────────────────────────────────
  console.log("\n📢 Creating events and announcements...");

  await prisma.event.create({
    data: {
      schoolId: school.id,
      title: "Annual Sports Day",
      description: "Annual sports competition for all students",
      startTime: new Date(2026, 1, 15, 9, 0),
      endTime: new Date(2026, 1, 15, 17, 0),
      isPublic: true,
    },
  });

  await prisma.announcement.create({
    data: {
      schoolId: school.id,
      title: "School Reopening",
      description: "School will reopen after summer vacation on March 1st",
      date: new Date(2026, 2, 1),
      isPublic: true,
    },
  });

  console.log(`   ✓ Events and announcements created`);

  // ── 18. Create SMS Logs ───────────────────────────────────────────────────
  console.log("\n📱 Creating SMS logs...");

  for (let i = 0; i < 3; i++) {
    await prisma.sMSLog.create({
      data: {
        schoolId: school.id,
        receiverNo: parents[i]?.phone || "01711000050",
        message: `Fee payment reminder for ${new Date().toLocaleString("default", { month: "long" })} month.`,
        status: "SENT",
      },
    });
  }

  console.log(`   ✓ SMS logs created`);

  // ── ✅ FINAL SUMMARY ──────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(60));
  console.log("✅ SEEDING COMPLETED SUCCESSFULLY!");
  console.log("═".repeat(60));
  console.log("\n📋 SUMMARY:");
  console.log(`   • School: ${school.schoolName}`);
  console.log(`   • Grades: ${grades.length} | Classes: ${classes.length}`);
  console.log(`   • Subjects: ${subjects.length}`);
  console.log(`   • Students: ${students.length}`);
  console.log(`   • Parents: ${parents.length}`);
  console.log(`   • Employees: 4`);
  console.log(`   • Fee Types: ${feeTypes.length}`);
  
  console.log("\n🔑 LOGIN CREDENTIALS:");
  console.log("─".repeat(40));
  console.log("👑 SUPER ADMIN:");
  console.log("   Email: superadmin@schoolsaas.com");
  console.log("   Password: SuperAdmin@123");
  console.log("\n🏫 SCHOOL ADMIN:");
  console.log("   Username: dmhs_admin");
  console.log("   Password: Admin@123");
  console.log("\n👨‍🏫 TEACHER:");
  console.log("   Username: dmhs_teacher1");
  console.log("   Password: Teacher@123");
  console.log("\n💳 CASHIER:");
  console.log("   Username: dmhs_cashier1");
  console.log("   Password: Cashier@123");
  console.log("\n📋 STAFF:");
  console.log("   Username: dmhs_staff1");
  console.log("   Password: Staff@123");
  console.log("\n🎓 STUDENT (example):");
  console.log(`   Username: student_${timestamp}_1`);
  console.log("   Password: Student@123");
  console.log("\n👪 PARENT (example):");
  console.log(`   Username: parent_${timestamp}_1`);
  console.log("   Password: Parent@123");
  console.log("═".repeat(60));
}

main()
  .catch((e) => {
    console.error("\n❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });