// app/(admin)/admin/layout.tsx
import Image from "next/image";
import Link from "next/link";
import Menu from "../../components/Menu";
import { requireSession } from "@/lib/get-session";
import prisma from "@/lib/db";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
    const user = await requireSession();
  
  // DEBUG: console log করে দেখুন user-এ কি আছে
  console.log("Full user object:", JSON.stringify(user, null, 2));
  console.log("User schoolId:", user?.schoolId);
  
  let schoolName = "AmarS";
  
  if (user?.schoolId) {
    console.log("Fetching school for ID:", user.schoolId);
    
    const school = await prisma.school.findUnique({
      where: { id: user.schoolId },
      select: { schoolName: true, shortName: true }
    });
    
    console.log("Found school:", school);
    
    schoolName = school?.schoolName || school?.shortName || "AmarSchooldd";
  } else {
    console.log("No schoolId found in user object");
  }
  
  return (
    <div className="">
      {/* LEFT */}
      
      
     
      {/* RIGHT */}
      {/* <div className="w-[86%] md:w-[92%] lg:w-[84%] xl:w-[86%] bg-[#F7F8FA] overflow-scroll flex flex-col">
        {children}
      </div> */}
      <div className="">
        {children}
      </div>
    </div>
  );
}