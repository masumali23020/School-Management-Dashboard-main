"use client";

import { SessionProvider } from "next-auth/react";

/** Ensures signIn/getCsrfToken use `/api/auth` on any port (e.g. localhost:3001). */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider basePath="/api/auth" refetchOnWindowFocus={false}>
      {children}
    </SessionProvider>
  );
}
