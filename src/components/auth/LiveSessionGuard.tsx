"use client";

import { useEffect } from "react";
import { signOut, useSession } from "next-auth/react";

const CHECK_INTERVAL_MS = 10000;

export default function LiveSessionGuard() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;

    let stopped = false;

    const checkSchoolStatus = async () => {
      try {
        const response = await fetch("/api/auth/school-status", { cache: "no-store" });
        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as { reason?: string } | null;
          const reason = data?.reason ?? "SCHOOL_DISABLED";
          if (!stopped) {
            await signOut({ callbackUrl: `/?account=${encodeURIComponent(reason)}` });
          }
        }
      } catch {
        // Ignore network errors; next cycle will retry.
      }
    };

    void checkSchoolStatus();
    const interval = setInterval(() => {
      void checkSchoolStatus();
    }, CHECK_INTERVAL_MS);

    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [status]);

  return null;
}
