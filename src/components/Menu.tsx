import Image from "next/image";
import Link from "next/link";
import prisma from "@/lib/db";
import ClassesSubMenu from "./Classessubmen";
import ResultsSubMenu from "./Resultssubmenu ";


const menuItems = [
  {
    title: "MENU",
    items: [
      { icon: "/home.png", label: "Home", href: "/", visible: ["admin", "teacher", "student", "parent"] },
      { icon: "/teacher.png", label: "Teachers", href: "/list/teachers", visible: ["admin", "teacher"] },
      { icon: "/student.png", label: "Students", href: "/list/students", visible: ["admin", "teacher"] },
      { icon: "/parent.png", label: "Parents", href: "/list/parents", visible: ["admin", "teacher"] },
      { icon: "/cashier.png", label: "Cashier", href: "/list/fees/cashier", visible: ["admin", "cashier"] },
      { icon: "/fee.png", label: "Fees", href: "/list/fees", visible: ["admin", "cashier"] },
      { icon: "/subject.png", label: "Subjects", href: "/list/subjects", visible: ["admin"] },
      // "Classes" removed → ClassesSubMenu injected before "Lessons"
      { icon: "/lesson.png", label: "Lessons", href: "/list/lessons", visible: ["admin", "teacher"] },
      { icon: "/exam.png", label: "Exams", href: "/list/exams", visible: ["admin", "teacher", "student", "parent"] },
      { icon: "/assignment.png", label: "Assignments", href: "/list/assignments", visible: ["admin", "teacher", "student", "parent"] },
      // "Results" removed → ResultsSubMenu injected before "Attendance"
      { icon: "/attendance.png", label: "Attendance", href: "/list/attendance", visible: ["admin", "teacher", "student", "parent"] },
      { icon: "/calendar.png", label: "Events", href: "/list/events", visible: ["admin", "teacher", "student", "parent"] },
      { icon: "/message.png", label: "Messages", href: "/list/messages", visible: ["admin", "teacher", "student", "parent"] },
      { icon: "/announcement.png", label: "Announcements", href: "/list/announcements", visible: ["admin", "teacher", "student", "parent"] },
    ],
  },
  {
    title: "OTHER",
    items: [
      { icon: "/profile.png", label: "Profile", href: "/profile", visible: ["admin", "teacher", "student", "parent"] },
      { icon: "/setting.png", label: "Settings", href: "/settings", visible: ["admin", "teacher", "student", "parent"] },
      { icon: "/logout.png", label: "Logout", href: "/logout", visible: ["admin", "teacher", "student", "parent"] },
    ],
  },
];

const CLASSES_VISIBLE = ["admin", "teacher"];
const RESULTS_VISIBLE = ["admin", "teacher", "student", "parent"];

const Menu = async ({ user }: { user: any }) => {
  const role = (user?.publicMetadata?.role as string) || "student";

  // Only fetch classes — Results submenu is now fully static
  const classes = CLASSES_VISIBLE.includes(role)
    ? await prisma.class
        .findMany({
          select: { id: true, name: true, grade: { select: { level: true } } },
          orderBy: [{ grade: { level: "asc" } }, { name: "asc" }],
        })
        .then((rows) =>
          rows.map((c) => ({ id: c.id, name: c.name, gradeLevel: c.grade.level }))
        )
    : [];

  return (
    <div className="mt-4 text-sm">
      {menuItems.map((section) => (
        <div className="flex flex-col gap-2" key={section.title}>
          <span className="hidden lg:block text-gray-400 font-light my-4">
            {section.title}
          </span>

          {section.items.map((item) => {
            if (!item.visible.includes(role)) return null;

            return (
              <>
                {/* Inject Classes submenu just before Lessons */}
                {item.label === "Lessons" && CLASSES_VISIBLE.includes(role) && (
                  <ClassesSubMenu key="classes-submenu" classes={classes} />
                )}

                {/* Inject Results submenu just before Attendance */}
                {item.label === "Attendance" && RESULTS_VISIBLE.includes(role) && (
                  <ResultsSubMenu key="results-submenu" />
                )}

                <MenuLink key={item.label} item={item} />
              </>
            );
          })}
        </div>
      ))}
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