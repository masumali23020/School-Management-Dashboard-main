"use client";

import { useEffect, useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { AUTH_ERROR_MESSAGES, parseSignInError } from "@/types/auth";

export default function LoginClient() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "";

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({
    schoolId: "",
    username: "",
    password: "",
  });

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
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-300 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6">

        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="text-4xl">🏫</div>
          <h1 className="text-2xl font-bold text-gray-800">SchoolSaaS</h1>
          <p className="text-sm text-gray-500">
            Multi-tenant School Management System
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-100 text-red-700 text-sm px-4 py-2 rounded-lg border border-red-300">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="text-sm text-gray-600">School ID</label>
            <input
              name="schoolId"
              value={form.schoolId}
              onChange={handleChange}
              placeholder="Enter School ID"
              className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Username</label>
            <input
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="Enter username"
              className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="relative">
            <label className="text-sm text-gray-600">Password</label>
            <input
              name="password"
              type={showPass ? "text" : "password"}
              value={form.password}
              onChange={handleChange}
              placeholder="Enter password"
              className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pr-16"
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute right-2 top-8 text-sm text-blue-600 hover:underline"
            >
              {showPass ? "Hide" : "Show"}
            </button>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            {isPending ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400">
          © {new Date().getFullYear()} SchoolSaaS
        </p>
      </div>
    </main>
  );
}