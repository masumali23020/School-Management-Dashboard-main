import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      userId?: string | number;
      role?: string;
      schoolId?: number;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    userId?: string | number; // এখানে userId ডিফাইন করা হলো
    role?: string;
    schoolId?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string | number;
    role?: string;
    schoolId?: number;
  }
}