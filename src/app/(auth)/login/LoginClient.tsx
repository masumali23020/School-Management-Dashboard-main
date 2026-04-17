"use client";

import { useEffect, useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { AUTH_ERROR_MESSAGES, parseSignInError } from "@/types/auth";
import { authDebugClient } from "@/lib/auth-debug";

export default function LoginClient() {
  const searchParams = useSearchParams();
  const callbackUrl  = searchParams.get("callbackUrl") ?? "";

  const [isPending, startTransition] = useTransition();
  const [error, setError]   = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ schoolId: "", username: "", password: "" });

  useEffect(() => {
    const sid = searchParams.get("schoolId");
    if (sid && /^\d+$/.test(sid)) {
      setForm((prev) => ({ ...prev, schoolId: sid }));
    }
  }, [searchParams]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.schoolId || !form.username || !form.password) {
      setError("All fields are required.");
      return;
    }

    const schoolNum = Number(form.schoolId);
    if (!Number.isFinite(schoolNum) || schoolNum < 1) {
      setError("Please enter a valid School ID.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await signIn("credentials", {
          username: form.username.trim(),
          password: form.password,
          schoolId: String(schoolNum),
          redirect: false,
        });

        if (!result) {
          setError(AUTH_ERROR_MESSAGES.UNKNOWN_ERROR);
          return;
        }

        if (result.error) {
          const code = parseSignInError(result.error);
          setError(
            AUTH_ERROR_MESSAGES[code] ?? AUTH_ERROR_MESSAGES.UNKNOWN_ERROR
          );
          return;
        }

        const safeCallback =
          callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
            ? callbackUrl
            : "";

        window.location.assign(safeCallback || "/");
      } catch {
        setError(AUTH_ERROR_MESSAGES.UNKNOWN_ERROR);
      }
    });
  }

  return (
    <main className="root">
      <div className="card">

        <div className="brand">
          <span className="brand-icon">🏫</span>
          <h1>SchoolSaaS</h1>
          <p>Multi-tenant School Management</p>
        </div>

        {error && (
          <div className="err-banner">
            <span className="err-dot">!</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          <input
            name="schoolId"
            placeholder="School ID"
            value={form.schoolId}
            onChange={handleChange}
          />

          <input
            name="username"
            placeholder="Username"
            value={form.username}
            onChange={handleChange}
          />

          <input
            name="password"
            type={showPass ? "text" : "password"}
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
          />

          <button type="button" onClick={() => setShowPass(v => !v)}>
            {showPass ? "hide" : "show"}
          </button>

          <button type="submit" disabled={isPending}>
            {isPending ? "Signing in..." : "Sign In"}
          </button>

        </form>
      </div>
    </main>
  );
}