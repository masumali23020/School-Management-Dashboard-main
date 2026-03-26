import { PrismaClient, UserSex, UserRole, PaymentMethod } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding started...");

  // ১. গ্রেড ও ক্লাস (একাডেমিক ভিত্তি)
  const grade8 = await prisma.grade.upsert({
    where: { level: 8 },
    update: {},
    create: { level: 8 },
  });

  const class8A = await prisma.class.upsert({
    where: { name: "8-A" },
    update: {},
    create: { name: "8-A", capacity: 30, gradeId: grade8.id },
  });

  // ২. Employee (Admin, Teacher, Cashier, Staff)
  const admin = await prisma.employee.upsert({
    where: { username: "admin_masum" },
    update: {},
    create: {
      id: "admin1",
      username: "admin_masum",
      role: UserRole.ADMIN,
      name: "Masum",
      surname: "Ali",
      email: "admin@school.com",
      phone: "01711111111",
      address: "Kushtia",
      bloodType: "A+",
      sex: UserSex.MALE,
      birthday: new Date("1995-01-01"),
      designation: "Principal",
    },
  });

  const teacher = await prisma.employee.upsert({
    where: { username: "teacher_karim" },
    update: {},
    create: {
      id: "teacher1",
      username: "teacher_karim",
      role: UserRole.TEACHER,
      name: "Abdul",
      surname: "Karim",
      email: "karim@school.com",
      phone: "01722222222",
      address: "Dhaka",
      bloodType: "O+",
      sex: UserSex.MALE,
      birthday: new Date("1985-05-15"),
      designation: "Senior Math Teacher",
    },
  });

  const cashier = await prisma.employee.upsert({
    where: { username: "cashier_abdur" },
    update: {},
    create: {
      id: "cashier1",
      username: "cashier_abdur",
      role: UserRole.CASHIER,
      name: "Abdur",
      surname: "Rahman",
      email: "cashier@school.com",
      phone: "01733333333",
      address: "Kushtia",
      bloodType: "B+",
      sex: UserSex.MALE,
      birthday: new Date("1990-10-20"),
      designation: "Accountant",
    },
  });

  // ৩. Parent & Student
  const parent = await prisma.parent.upsert({
    where: { username: "parent_abdul" },
    update: {},
    create: {
      id: "parent1",
      username: "parent_abdul",
      name: "Abdul",
      surname: "Hakim",
      email: "abdul@school.com",
      phone: "01766666666",
      address: "Kushtia",
    },
  });

  await prisma.student.upsert({
    where: { username: "student_rafi" },
    update: {},
    create: {
      id: "student1",
      username: "student_rafi",
      name: "Rafi",
      surname: "Ahmed",
      email: "rafi@school.com",
      phone: "01755555555",
      address: "Kushtia",
      bloodType: "A-",
      sex: UserSex.MALE,
      birthday: new Date("2010-06-10"),
      classId: class8A.id,
      gradeId: grade8.id,
      parentId: parent.id,
    },
  });

  // ৪. Fee Type Setup
  await prisma.feeType.upsert({
    where: { name: "Monthly Tuition" },
    update: {},
    create: { name: "Monthly Tuition", description: "Regular monthly fee" },
  });

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });