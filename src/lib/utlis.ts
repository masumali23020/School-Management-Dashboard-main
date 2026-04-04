// import { auth, currentUser } from "@clerk/nextjs/server";
// // types/index.ts বা যেখানে টাইপ ডিফাইন করা আছে
// export type UserRoleResult = {
//   role: string;
//   userId: string | null;
//   username: string;
// };



// export const getUserRole = async (): Promise<UserRoleResult> => {
//   const { sessionClaims, userId } = await auth();
//   const user = await currentUser(); // Clerk থেকে ফুল ডাটা আনার জন্য

//   const role = (sessionClaims?.metadata as { role?: string })?.role || "student";
  
//   // ইউজারনেম বা ফুল নেম নেয়া
//   const username = user?.firstName ? `${user.firstName} ${user.lastName || ""}` : (user?.username || "Guest");

//   return {
//     role,
//     userId,
//     username,
//   };
// };

// // IT APPEARS THAT BIG CALENDAR SHOWS THE LAST WEEK WHEN THE CURRENT DAY IS A WEEKEND.
// // FOR THIS REASON WE'LL GET THE LAST WEEK AS THE REFERENCE WEEK.
// // IN THE TUTORIAL WE'RE TAKING THE NEXT WEEK AS THE REFERENCE WEEK.

const getLatestMonday = (): Date => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const latestMonday = today;
  latestMonday.setDate(today.getDate() - daysSinceMonday);
  return latestMonday;
};

export const adjustScheduleToCurrentWeek = (
  lessons: { title: string; start: Date; end: Date }[]
): { title: string; start: Date; end: Date }[] => {
  const latestMonday = getLatestMonday();

  return lessons.map((lesson) => {
    const lessonDayOfWeek = lesson.start.getDay();

    const daysFromMonday = lessonDayOfWeek === 0 ? 7 : lessonDayOfWeek - 1;

    const adjustedStartDate = new Date(latestMonday);

    adjustedStartDate.setDate(latestMonday.getDate() + daysFromMonday);
    adjustedStartDate.setHours(
      lesson.start.getHours(),
      lesson.start.getMinutes(),
      lesson.start.getSeconds()
    );
    const adjustedEndDate = new Date(adjustedStartDate);
    adjustedEndDate.setHours(
      lesson.end.getHours(),
      lesson.end.getMinutes(),
      lesson.end.getSeconds()
    );

    return {
      title: lesson.title,
      start: adjustedStartDate,
      end: adjustedEndDate,
    };
  });
};
