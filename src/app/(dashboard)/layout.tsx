// app/(admin)/admin/layout.tsx
import Image from "next/image";
import Link from "next/link";
import Menu from "../../components/Menu";
import { requireSession } from "@/lib/get-session";
import prisma from "@/lib/db";
import { AuthProvider } from "@/components/providers/auth-provider";
import LiveSessionGuard from "@/components/auth/LiveSessionGuard";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
    const user = await requireSession();
  
  let schoolName = "AmarS";
  let schoolurl = "/";

  if (user?.schoolId) {
    console.log("Fetching school for ID:", user.schoolId);
    
    const school = await prisma.school.findUnique({
      where: { id: user.schoolId },
      select: { schoolName: true, shortName: true, id:true, slug:true }
    });
    
   
    
    schoolName = school?.schoolName || school?.shortName || "AmarSchooldd";
    schoolurl = school?.slug || "/";
  } else {
    console.log("No schoolId found in user object");
  }
  
  return (
    <AuthProvider>
      <LiveSessionGuard />
      <div className="flex dash">
        {/* LEFT */}
        
        <div className="w-[14%] md:w-[8%] lg:w-[16%] xl:w-[14%] p-4">
          <Link
            href={`/${schoolurl}/`}
            className="flex items-center justify-center lg:justify-start gap-2"
          >
            <Image src="/logo.png" alt="logo" width={32} height={32} />
            <span className="hidden lg:block font-bold">{schoolName}</span>
          </Link>
          <Menu user={user} />
        </div>
        {/* RIGHT */}
        <div className="w-[86%] md:w-[92%] lg:w-[84%] xl:w-[86%] bg-[#F7F8FA] overflow-scroll flex flex-col">
          {children}
        </div>
      </div>
    </AuthProvider>
  );
}