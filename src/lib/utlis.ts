import { auth } from "@clerk/nextjs/server";

type UserRoleResult = {
  role: string;
  userId: string | null;
};

export const getUserRole = async (): Promise<UserRoleResult> => {
  const { sessionClaims, userId } = await auth();

  const role =
    (sessionClaims?.metadata as { role?: string })?.role || "student";

  return {
    role,
    userId,
  };
};
