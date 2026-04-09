// components/Menu.tsx
import Image from "next/image";
import Link from "next/link";
import prisma from "@/lib/db";
import ClassesSubMenu from "./Classessubmen";
import ResultsSubMenu from "./Resultssubmenu ";

// Define menu items with role visibility
const menuItems = [
  {
    title: "MENU",
    items: [
      { icon: "/home.png", label: "Home", href: "/", visible: ["ADMIN", "TEACHER", "STAFF", "CASHIER"] },
      { icon: "/teacher.png", label: "Teachers", href: "/list/teachers", visible: ["ADMIN", "TEACHER"] },
      { icon: "/student.png", label: "Students", href: "/list/students", visible: ["ADMIN", "TEACHER", "STAFF"] },
      { icon: "/parent.png", label: "Parents", href: "/list/parents", visible: ["ADMIN", "TEACHER"] },
      { icon: "/cashier.png", label: "Accounting", href: "/list/fees/cashier", visible: ["ADMIN", "CASHIER"] },
      { icon: "/salary.png", label: "Salary", href: "/list/salary", visible: ["ADMIN", "CASHIER"] },
      { icon: "/salary.png", label: "Employee Payments", href: "/list/salary/payments", visible: ["ADMIN", "CASHIER"] },
      { icon: "/fees.png", label: "Fees", href: "/list/fees", visible: ["ADMIN", "CASHIER"] },
      { icon: "/fees.png", label: "Student Payments", href: "/list/fees/payments", visible: ["ADMIN", "CASHIER"] },
      { icon: "/finance.png", label: "Finance", href: "/list/finance", visible: ["ADMIN", "CASHIER"] },
      { icon: "/subject.png", label: "Subjects", href: "/list/subjects", visible: ["ADMIN", "TEACHER"] },
      { icon: "/lesson.png", label: "Grade", href: "/list/grade", visible: ["ADMIN", "TEACHER"] },
      { icon: "/lesson.png", label: "Lessons", href: "/list/lessons", visible: ["ADMIN", "TEACHER"] },
      { icon: "/exam.png", label: "Exams", href: "/list/exams", visible: ["ADMIN", "TEACHER", "STUDENT", "PARENT"] },
      { icon: "/assignment.png", label: "Assignments", href: "/list/assignments", visible: ["ADMIN", "TEACHER", "STUDENT", "PARENT"] },
      { icon: "/attendance.png", label: "Attendance", href: "/list/attendance", visible: ["ADMIN", "TEACHER", "STAFF", "STUDENT", "PARENT"] },
      { icon: "/calendar.png", label: "Events", href: "/list/events", visible: ["ADMIN", "TEACHER", "STAFF", "STUDENT", "PARENT"] },
      { icon: "/message.png", label: "Messages", href: "/list/messages", visible: ["ADMIN", "TEACHER", "STAFF", "STUDENT", "PARENT"] },
      { icon: "/announcement.png", label: "Announcements", href: "/list/announcements", visible: ["ADMIN", "TEACHER", "STAFF", "STUDENT", "PARENT"] },
      { icon: "/results.png", label: "Results", href: "/result", visible: ["ADMIN", "TEACHER", "STUDENT", "PARENT"] },
    ],
  },
  {
    title: "OTHER",
    items: [
      { icon: "/profile.png", label: "Profile", href: "/profile", visible: ["ADMIN", "TEACHER", "STAFF", "STUDENT", "PARENT", "CASHIER"] },
      { icon: "/setting.png", label: "Settings", href: "/settings", visible: ["ADMIN", "TEACHER", "STAFF", "STUDENT", "PARENT", "CASHIER"] },
      { icon: "/logout.png", label: "Logout", href: "/logout", visible: ["ADMIN", "TEACHER", "STAFF", "STUDENT", "PARENT", "CASHIER"] },
    ],
  },
];

const CLASSES_VISIBLE = ["ADMIN", "TEACHER"];
const RESULTS_VISIBLE = ["ADMIN", "TEACHER", "STUDENT", "PARENT"];

const Menu = async ({ user }: { user: any }) => {
  // Extract role and schoolId from user object
  const role = user?.role || "null";
  const schoolId = user?.schoolId;

  // Only fetch classes if user has permission AND has a schoolId
  let classes: { id: number; name: string; gradeLevel: number }[] = [];
  
  if (CLASSES_VISIBLE.includes(role) && schoolId) {
    classes = await prisma.class
      .findMany({
        where: {
          schoolId: schoolId, // 🔥 Only fetch classes from the user's school
        },
        select: { 
          id: true, 
          name: true, 
          grade: { select: { level: true } } 
        },
        orderBy: [{ grade: { level: "asc" } }, { name: "asc" }],
      })
      .then((rows) =>
        rows.map((c) => ({ id: c.id, name: c.name, gradeLevel: c.grade.level }))
      );
  }

  // If no schoolId but role requires it, show limited menu
  if (!schoolId && role !== "null") {
    console.warn("Menu: No schoolId found for user with role:", role);
  }

  return (
    <div className="mt-4 text-sm">
      {menuItems.map((section) => {
        // Filter items that are visible for this role
        const visibleItems = section.items.filter((item) =>
          item.visible.includes(role)
        );
        
        // Skip section if no visible items
        if (visibleItems.length === 0) return null;
        
        return (
          <div className="flex flex-col gap-2" key={section.title}>
            <span className="hidden lg:block text-gray-400 font-light my-4">
              {section.title}
            </span>

            {visibleItems.map((item) => (
              <div key={item.label}>
                {/* Inject Classes submenu just before Lessons */}
                {item.label === "Lessons" && CLASSES_VISIBLE.includes(role) && (
                  <ClassesSubMenu key="classes-submenu" classes={classes} schoolId={schoolId} />
                )}

                {/* Inject Results submenu just before Attendance */}
                {item.label === "Attendance" && RESULTS_VISIBLE.includes(role) && (
                  <ResultsSubMenu key="results-submenu" schoolId={schoolId} role={role} />
                )}

                <MenuLink item={item} />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

function MenuLink({ item }: { item: { icon: string; label: string; href: string } }) {
  return (
    <Link
      href={item.href}
      className="flex items-center justify-center lg:justify-start gap-4 text-gray-500 py-2 md:px-2 rounded-md hover:bg-lamaSkyLight"
    >
      <Image src={item.icon} alt="" width={20} height={20} />
      <span className="hidden lg:block">{item.label}</span>
    </Link>
  );
}

export default Menu;