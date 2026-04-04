import { auth } from "@/auth";
import { SessionUser } from "@/types/auth";

export async function getUserRoleAuth() {
  const session = await auth();

  const user = session?.user as SessionUser | undefined;

  return {
    role: user?.role?.toLowerCase() || null, 
    userId: user?.id || null,
    schoolId: user?.schoolId || null,
    name: user?.name || null,
  };
}