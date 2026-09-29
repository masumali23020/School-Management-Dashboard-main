import { requireSession } from "@/lib/get-session";
import { AuthProvider } from "@/components/providers/auth-provider";
// import LiveSessionGuard from "@/components/auth/LiveSessionGuard";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireSession();
  
  return (
    <AuthProvider>
      {/* <LiveSessionGuard /> */}
      <div>
        {children}
      </div>
    </AuthProvider>
  );
}