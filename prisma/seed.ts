// prisma/seed.ts

import { PrismaClient, UserSex, Day } from '@prisma/client';

const prisma = new PrismaClient();

// হেল্পার ফাংশন - র্যান্ডম আইটেম সিলেক্ট করার জন্য
function getRandomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

// র্যান্ডম নাম্বার জেনারেট করার জন্য
function getRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// র্যান্ডম ফোন নাম্বার জেনারেট করার জন্য
function generateRandomPhone(): string {
  return `01${getRandomNumber(7, 9)}${getRandomNumber(10000000, 99999999)}`;
}

// র্যান্ডম ইমেইল জেনারেট করার জন্য
function generateRandomEmail(name: string, surname: string): string {
  const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'school.edu'];
  return `${name.toLowerCase()}.${surname.toLowerCase()}${getRandomNumber(1, 999)}@${getRandomItem(domains)}`;
}

// র্যান্ডম ঠিকানা জেনারেট করার জন্য
function generateRandomAddress(): string {
  const streets = ['Main St', 'Park Ave', 'Church Rd', 'School Ln', 'College Rd', 'Lake View', 'Hill Top'];
  const cities = ['Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna', 'Barisal', 'Rangpur'];
  return `${getRandomNumber(1, 200)} ${getRandomItem(streets)}, ${getRandomItem(cities)}`;
}

// রক্তের গ্রুপ
const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

// প্রথম নাম (পুরুষ)
const maleFirstNames = [
  'Rahim', 'Karim', 'Jahid', 'Hasan', 'Shahid', 'Mizanur', 'Shafiq', 'Shahin', 'Rafiq', 'Shamim',
  'Tanvir', 'Shahriar', 'Farhan', 'Nazmul', 'Mamun', 'Hossain', 'Firoz', 'Kamal', 'Jamal', 'Shahadat',
  'Morshed', 'Sohel', 'Shakil', 'Rashed', 'Khaled', 'Shahidul', 'Mostafa', 'Shafiqul', 'Moinul', 'Shahjahan'
];

// প্রথম নাম (মহিলা)
const femaleFirstNames = [
  'Fatema', 'Rahima', 'Khadiza', 'Ayesha', 'Jannat', 'Sumaiya', 'Nusrat', 'Shirin', 'Parvin', 'Nasrin',
  'Sharmin', 'Tahmina', 'Rokeya', 'Shahana', 'Selina', 'Nazma', 'Rabeya', 'Halima', 'Marium', 'Saleha',
  'Shamsunnahar', 'Nargis', 'Shahinur', 'Mahmuda', 'Shahnaz', 'Shahida', 'Shahina', 'Shahnewaz', 'Shahla', 'Shahana'
];

// শেষ নাম (সাধারণ)
const surnames = [
  'Khan', 'Chowdhury', 'Rahman', 'Ahmed', 'Hossain', 'Islam', 'Miah', 'Sarker', 'Das', 'Roy',
  'Singh', 'Biswas', 'Ghosh', 'Ali', 'Mollah', 'Poddar', 'Dey', 'Sen', 'Pal', 'Kar',
  'Saha', 'Guha', 'Bhattacharjee', 'Chakraborty', 'Mukherjee', 'Banerjee', 'Ganguly', 'Basu', 'Mitra', 'Bose'
];

// বিষয়সমূহ
const subjectNames = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Bangla',
  'History', 'Geography', 'Economics', 'Computer Science', 'Accounting',
  'Business Studies', 'Higher Math', 'Religion', 'Physical Education'
];

// ক্লাসের নাম
const classNames = ['Six', 'Seven', 'Eight', 'Nine', 'Ten'];

// ডে
const days: Day[] = [Day.MONDAY, Day.TUESDAY, Day.WEDNESDAY, Day.THURSDAY, Day.FRIDAY];

async function main() {
  console.log('🌱 Seeding started...');

  // 1. Admin তৈরি করুন
  console.log('Creating admin...');
  const admin = await prisma.admin.upsert({
    where: { id: 'admin1' },
    update: {},
    create: {
      id: 'admin1',
      username: 'admin',
    },
  });
  console.log('✅ Admin created');

  // 2. Grades তৈরি করুন (৬ষ্ঠ থেকে ১০ম)
  console.log('Creating grades...');
  const grades = [];
  for (let i = 6; i <= 10; i++) {
    const grade = await prisma.grade.upsert({
      where: { level: i },
      update: {},
      create: {
        level: i,
      },
    });
    grades.push(grade);
    console.log(`  ✅ Grade ${i} created`);
  }

  // 3. Subjects তৈরি করুন
  console.log('Creating subjects...');
  const subjects = [];
  for (const name of subjectNames) {
    const subject = await prisma.subject.upsert({
      where: { name },
      update: {},
      create: {
        name,
      },
    });
    subjects.push(subject);
  }
  console.log(`✅ ${subjects.length} subjects created`);

  // 4. Classes তৈরি করুন (৫ টি ক্লাস - Six, Seven, Eight, Nine, Ten)
  console.log('Creating classes...');
  const classes = [];
  for (let i = 0; i < 5; i++) {
    const className = classNames[i];
    const grade = grades[i]; // Six -> Grade 6, Seven -> Grade 7, etc.
    
    const classData = await prisma.class.create({
      data: {
        name: className,
        capacity: getRandomNumber(40, 60),
        gradeId: grade.id,
      },
    });
    classes.push(classData);
    console.log(`  ✅ Class ${className} created (Grade ${grade.level})`);
  }

  // 5. Teachers তৈরি করুন (২০ জন)
  console.log('Creating teachers...');
  const teachers = [];
  
  for (let i = 1; i <= 20; i++) {
    const isMale = i % 2 === 0; // Half male, half female
    const firstName = isMale ? getRandomItem(maleFirstNames) : getRandomItem(femaleFirstNames);
    const surname = getRandomItem(surnames);
    const sex = isMale ? UserSex.MALE : UserSex.FEMALE;
    const teacherId = `teacher${i}`;
    
    const teacher = await prisma.teacher.create({
      data: {
        id: teacherId,
        username: `teacher${i}`,
        name: firstName,
        surname: surname,
        email: generateRandomEmail(firstName, surname),
        phone: generateRandomPhone(),
        address: generateRandomAddress(),
        bloodType: getRandomItem(bloodTypes),
        sex: sex,
        birthday: new Date(getRandomNumber(1970, 1990), getRandomNumber(0, 11), getRandomNumber(1, 28)),
        // subjects later via ClassSubjectTeacher
      },
    });
    
    teachers.push(teacher);
    console.log(`  ✅ Teacher ${i}: ${firstName} ${surname}`);
  }

  // 6. Assign supervisors for classes
  console.log('Assigning class supervisors...');
  for (let i = 0; i < classes.length; i++) {
    const classData = classes[i];
    const supervisor = teachers[i % teachers.length]; // Different teacher for each class
    
    await prisma.class.update({
      where: { id: classData.id },
      data: {
        supervisorId: supervisor.id,
      },
    });
    console.log(`  ✅ ${classData.name} supervisor: ${supervisor.name} ${supervisor.surname}`);
  }

  // 7. Assign ClassSubjectTeacher (প্রতি ক্লাসে ৫-৭ টি করে Subject)
  console.log('Creating class-subject-teacher assignments...');
  const assignments = [];
  
  for (const classData of classes) {
    // Randomly select 5-7 subjects for this class
    const numSubjects = getRandomNumber(5, 7);
    const shuffledSubjects = [...subjects].sort(() => 0.5 - Math.random());
    const selectedSubjects = shuffledSubjects.slice(0, numSubjects);
    
    for (const subject of selectedSubjects) {
      // Random teacher for this subject
      const teacher = getRandomItem(teachers);
      
      const assignment = await prisma.classSubjectTeacher.create({
        data: {
          classId: classData.id,
          subjectId: subject.id,
          teacherId: teacher.id,
          academicYear: '2024',
        },
      });
      
      assignments.push(assignment);
    }
    console.log(`  ✅ ${classData.name}: ${numSubjects} subjects assigned`);
  }
  console.log(`✅ Total ${assignments.length} class-subject-teacher assignments created`);

  // 8. Parents তৈরি করুন (১০ জন)
  console.log('Creating parents...');
  const parents = [];
  
  for (let i = 1; i <= 10; i++) {
    const isMale = i % 2 === 0;
    const firstName = isMale ? getRandomItem(maleFirstNames) : getRandomItem(femaleFirstNames);
    const surname = getRandomItem(surnames);
    const parentId = `parent${i}`;
    
    const parent = await prisma.parent.create({
      data: {
        id: parentId,
        username: `parent${i}`,
        name: firstName,
        surname: surname,
        email: generateRandomEmail(firstName, surname),
        phone: generateRandomPhone(),
        address: generateRandomAddress(),
      },
    });
    
    parents.push(parent);
    console.log(`  ✅ Parent ${i}: ${firstName} ${surname}`);
  }

  // 9. Students তৈরি করুন (১০ জন)
  console.log('Creating students...');
  const students = [];
  
  for (let i = 1; i <= 10; i++) {
    const isMale = i % 2 === 0;
    const firstName = isMale ? getRandomItem(maleFirstNames) : getRandomItem(femaleFirstNames);
    const surname = getRandomItem(surnames);
    const sex = isMale ? UserSex.MALE : UserSex.FEMALE;
    const studentId = `student${i}`;
    
    // Random class
    const classData = getRandomItem(classes);
    const grade = grades.find(g => g.id === classData.gradeId)!;
    
    // Random parent
    const parent = getRandomItem(parents);
    
    const student = await prisma.student.create({
      data: {
        id: studentId,
        username: `student${i}`,
        name: firstName,
        surname: surname,
        email: generateRandomEmail(firstName, surname),
        phone: generateRandomPhone(),
        address: generateRandomAddress(),
        bloodType: getRandomItem(bloodTypes),
        sex: sex,
        parentId: parent.id,
        classId: classData.id,
        gradeId: grade.id,
        birthday: new Date(getRandomNumber(2008, 2015), getRandomNumber(0, 11), getRandomNumber(1, 28)),
      },
    });
    
    students.push(student);
    console.log(`  ✅ Student ${i}: ${firstName} ${surname} -> Class ${classData.name}`);
  }

  // 10. Lessons তৈরি করুন (প্রতি assignment এর জন্য ২-৩ টি lesson)
  console.log('Creating lessons...');
  const lessons = [];
  
  for (const assignment of assignments) {
    const numLessons = getRandomNumber(2, 3);
    
    for (let j = 1; j <= numLessons; j++) {
      const day = getRandomItem(days);
      const startHour = getRandomNumber(8, 14);
      const endHour = startHour + 1;
      
      const lesson = await prisma.lesson.create({
        data: {
          name: `${assignment.subject.name} - Lesson ${j}`,
          day: day,
          startTime: new Date(2024, 0, 1, startHour, 0, 0),
          endTime: new Date(2024, 0, 1, endHour, 0, 0),
          subjectId: assignment.subjectId,
          classId: assignment.classId,
          teacherId: assignment.teacherId,
          classSubjectTeacherId: assignment.id,
        },
      });
      
      lessons.push(lesson);
    }
  }
  console.log(`✅ ${lessons.length} lessons created`);

  // 11. Exams তৈরি করুন (প্রতি lesson এর জন্য ১-২ টি exam)
  console.log('Creating exams...');
  const exams = [];
  
  for (const lesson of lessons.slice(0, 15)) { // Limit to 15 lessons for exams
    const numExams = getRandomNumber(1, 2);
    
    for (let j = 1; j <= numExams; j++) {
      const exam = await prisma.exam.create({
        data: {
          title: `${lesson.name} - Exam ${j}`,
          startTime: new Date(2024, 3, getRandomNumber(1, 30), 10, 0, 0),
          endTime: new Date(2024, 3, getRandomNumber(1, 30), 12, 0, 0),
          lessonId: lesson.id,
        },
      });
      
      exams.push(exam);
    }
  }
  console.log(`✅ ${exams.length} exams created`);

  // 12. Results তৈরি করুন (প্রতি student এর জন্য কিছু result)
  console.log('Creating results...');
  const results = [];
  
  for (const student of students) {
    // Random exams for this student
    const numResults = getRandomNumber(3, 5);
    const shuffledExams = [...exams].sort(() => 0.5 - Math.random());
    const selectedExams = shuffledExams.slice(0, numResults);
    
    for (const exam of selectedExams) {
      const result = await prisma.result.create({
        data: {
          score: getRandomNumber(40, 100),
          examId: exam.id,
          studentId: student.id,
        },
      });
      
      results.push(result);
    }
  }
  console.log(`✅ ${results.length} results created`);

  // 13. Attendance তৈরি করুন (গত ১ মাসের জন্য)
  console.log('Creating attendances...');
  const attendances = [];
  const today = new Date();
  
  for (const student of students) {
    // 20 days attendance
    for (let day = 1; day <= 20; day++) {
      const date = new Date(today.getFullYear(), today.getMonth() - 1, day);
      
      // Skip weekends (Saturday and Sunday) - if needed
      // if (date.getDay() === 0 || date.getDay() === 6) continue;
      
      const attendance = await prisma.attendance.create({
        data: {
          date: date,
          present: Math.random() > 0.2, // 80% present
          studentId: student.id,
          // Optionally link to a lesson
          lessonId: getRandomItem(lessons).id,
        },
      });
      
      attendances.push(attendance);
    }
  }
  console.log(`✅ ${attendances.length} attendances created`);

  // 14. Events তৈরি করুন
  console.log('Creating events...');
  const events = [];
  const eventTitles = [
    'Annual Sports Day', 'Science Fair', 'Parent-Teacher Meeting',
    'Cultural Program', 'Educational Tour', 'Quiz Competition',
    'Debate Competition', 'Art Exhibition', 'Book Fair',
    'Annual Result Ceremony'
  ];
  
  for (let i = 0; i < 5; i++) {
    const event = await prisma.event.create({
      data: {
        title: eventTitles[i % eventTitles.length],
        description: `Annual ${eventTitles[i % eventTitles.length]} for students`,
        startTime: new Date(2024, 5, getRandomNumber(1, 30), 9, 0, 0),
        endTime: new Date(2024, 5, getRandomNumber(1, 30), 17, 0, 0),
        classId: i % 2 === 0 ? getRandomItem(classes).id : null, // Some school-wide, some class-specific
      },
    });
    
    events.push(event);
  }
  console.log(`✅ ${events.length} events created`);

  // 15. Announcements তৈরি করুন
  console.log('Creating announcements...');
  const announcements = [];
  const announcementTitles = [
    'School Closed', 'Exam Schedule', 'Holiday Notice',
    'Uniform Change', 'Fee Payment Deadline', 'PTA Meeting',
    'Book List', 'Summer Vacation', 'Winter Break'
  ];
  
  for (let i = 0; i < 5; i++) {
    const announcement = await prisma.announcement.create({
      data: {
        title: announcementTitles[i % announcementTitles.length],
        description: `Important announcement: ${announcementTitles[i % announcementTitles.length]}`,
        date: new Date(2024, 4, getRandomNumber(1, 30)),
        classId: i % 2 === 0 ? getRandomItem(classes).id : null,
      },
    });
    
    announcements.push(announcement);
  }
  console.log(`✅ ${announcements.length} announcements created`);

  // Summary
  console.log('\n📊 Seeding Summary:');
  console.log(`✅ Admin: 1`);
  console.log(`✅ Grades: ${grades.length}`);
  console.log(`✅ Subjects: ${subjects.length}`);
  console.log(`✅ Classes: ${classes.length}`);
  console.log(`✅ Teachers: ${teachers.length}`);
  console.log(`✅ Parents: ${parents.length}`);
  console.log(`✅ Students: ${students.length}`);
  console.log(`✅ Class-Subject-Teacher Assignments: ${assignments.length}`);
  console.log(`✅ Lessons: ${lessons.length}`);
  console.log(`✅ Exams: ${exams.length}`);
  console.log(`✅ Results: ${results.length}`);
  console.log(`✅ Attendances: ${attendances.length}`);
  console.log(`✅ Events: ${events.length}`);
  console.log(`✅ Announcements: ${announcements.length}`);
  
  console.log('\n🌱 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });