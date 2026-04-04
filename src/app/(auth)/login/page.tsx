// app/(auth)/login/page.tsx

"use client";

import { useEffect, useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { AUTH_ERROR_MESSAGES, parseSignInError } from "@/types/auth";
import { authDebugClient } from "@/lib/auth-debug";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const callbackUrl  = searchParams.get("callbackUrl") ?? "";

  const [isPending, startTransition] = useTransition();
  const [error, setError]   = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ schoolId: "", username: "", password: "" });

  // Prefill School ID from ?schoolId= (e.g. link from Super Admin after registration)
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
        authDebugClient("signIn: submitting", {
          schoolId: schoolNum,
          username: form.username,
        });

        const result = await signIn("credentials", {
          username: form.username.trim(),
          password: form.password,
          schoolId: String(schoolNum),
          redirect: false,
        });

        authDebugClient("signIn: response", {
          ok: result?.ok,
          error: result?.error ?? null,
          status: result?.status,
          url: result?.url ?? null,
        });

        if (!result) {
          console.error("[auth:client] signIn: no result (network or config error)");
          setError(AUTH_ERROR_MESSAGES.UNKNOWN_ERROR);
          return;
        }

        if (result?.error) {
          const code = parseSignInError(result.error);
          const message =
            AUTH_ERROR_MESSAGES[code] ?? AUTH_ERROR_MESSAGES.UNKNOWN_ERROR;
          setError(message);
          return;
        }

        if (result?.ok === false && !result?.error) {
          authDebugClient("signIn: ok=false without error (unexpected)", {});
          setError(AUTH_ERROR_MESSAGES.UNKNOWN_ERROR);
          return;
        }

        // Full page navigation applies the session cookie reliably; middleware
        // redirects "/" → role dashboard (middleware.tsx ROLE_DASHBOARDS).
        const safeCallback =
          callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
            ? callbackUrl
            : "";
        const dest = safeCallback || "/";
        authDebugClient("signIn: redirect", { dest });
        window.location.assign(dest);
      } catch (err) {
        console.error("[auth:client] signIn: exception", err);
        setError(AUTH_ERROR_MESSAGES.UNKNOWN_ERROR);
      }
    });
  }

  return (
    <main className="root">
      <div className="card">

        {/* Brand */}
        <div className="brand">
          <span className="brand-icon">🏫</span>
          <h1>SchoolSaaS</h1>
          <p>Multi-tenant School Management</p>
        </div>

        {/* Error */}
        {error && (
          <div className="err-banner" role="alert">
            <span className="err-dot">!</span>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>

          <div className="field">
            <label htmlFor="schoolId">School ID</label>
            <input
              id="schoolId" name="schoolId" type="number"
              placeholder="e.g. 1"
              value={form.schoolId} onChange={handleChange}
              disabled={isPending} autoComplete="off"
            />
          </div>

          <div className="field">
            <label htmlFor="username">Username or Admin ID</label>
            <input
              id="username" name="username" type="text"
              placeholder="Your admin username or emp_…"
              value={form.username} onChange={handleChange}
              disabled={isPending} autoComplete="username"
            />
            <p className="field-hint">
              Use the username you chose, or the Admin ID shown after registration (e.g.{" "}
              <code>emp_…</code>). Password is the one you set — not the Admin ID.
            </p>
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <div className="pass-wrap">
              <input
                id="password" name="password"
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                value={form.password} onChange={handleChange}
                disabled={isPending} autoComplete="current-password"
              />
              <button type="button" className="show-btn"
                onClick={() => setShowPass(v => !v)}>
                {showPass ? "hide" : "show"}
              </button>
            </div>
          </div>

          <button type="submit" disabled={isPending} className="submit-btn">
            {isPending && <span className="spinner" />}
            {isPending ? "Signing in…" : "Sign In →"}
          </button>

        </form>

        <p className="hint">
          Super Admin?{" "}
          <a href="/superadmin/login">Go to Super Admin portal</a>
        </p>
      </div>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .root {
          min-height: 100vh;
          display: grid; place-items: center;
          background: #0f1117;
          background-image:
            radial-gradient(ellipse 80% 60% at 50% -10%, #1e3a5f44 0%, transparent 70%),
            radial-gradient(ellipse 50% 40% at 90% 100%, #1a3a2a33 0%, transparent 60%);
          font-family: 'Georgia', serif;
          padding: 1.5rem;
        }

        .card {
          width: 100%; max-width: 420px;
          background: #16181f;
          border: 1px solid #2a2d3a;
          border-radius: 20px;
          padding: 2.5rem 2rem;
          box-shadow: 0 32px 80px #00000077;
        }

        .brand { text-align: center; margin-bottom: 2rem; }
        .brand-icon { font-size: 2.25rem; }
        .brand h1 {
          font-size: 1.55rem; color: #e8eaf0;
          font-weight: 700; letter-spacing: -.02em; margin-top: .35rem;
        }
        .brand p {
          font-size: .72rem; color: #4b5563;
          font-family: 'Courier New', monospace;
          letter-spacing: .08em; text-transform: uppercase; margin-top: .3rem;
        }

        .err-banner {
          display: flex; align-items: center; gap: .6rem;
          background: #2d1515; border: 1px solid #5a2020;
          border-radius: 10px; color: #f87171;
          font-size: .82rem; font-family: 'Courier New', monospace;
          padding: .75rem 1rem; margin-bottom: 1.5rem;
        }
        .err-dot {
          width: 18px; height: 18px; border-radius: 50%;
          background: #7f1d1d; color: #fca5a5;
          display: flex; align-items: center; justify-content: center;
          font-weight: 900; font-size: .7rem; flex-shrink: 0;
        }

        .field { display: flex; flex-direction: column; gap: .4rem; margin-bottom: 1.2rem; }
        .field label {
          font-size: .72rem; color: #6b7280;
          font-family: 'Courier New', monospace;
          text-transform: uppercase; letter-spacing: .1em;
        }
        .field input, .pass-wrap input {
          background: #0f1117; border: 1px solid #2a2d3a;
          border-radius: 10px; color: #e8eaf0;
          font-size: .92rem; padding: .78rem 1rem;
          outline: none; width: 100%;
          transition: border-color .15s, box-shadow .15s;
          font-family: 'Courier New', monospace;
        }
        .field input::placeholder,
        .pass-wrap input::placeholder { color: #3a3f52; }
        .field input:focus,
        .pass-wrap input:focus {
          border-color: #3b6fd4;
          box-shadow: 0 0 0 3px #3b6fd418;
        }
        .field input:disabled,
        .pass-wrap input:disabled { opacity: .5; cursor: not-allowed; }

        .field-hint {
          font-size: .68rem;
          color: #5c6578;
          font-family: 'Courier New', monospace;
          line-height: 1.45;
          margin-top: .15rem;
        }
        .field-hint code {
          font-size: .65rem;
          color: #7c8aa0;
          background: #0f1117;
          padding: .1rem .25rem;
          border-radius: 4px;
        }

        .pass-wrap { position: relative; }
        .show-btn {
          position: absolute; right: .875rem; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: #4b5563; font-size: .68rem;
          font-family: 'Courier New', monospace; text-transform: uppercase;
          letter-spacing: .06em; transition: color .15s;
        }
        .show-btn:hover { color: #9ca3af; }

        .submit-btn {
          width: 100%; margin-top: .4rem;
          padding: .875rem; background: #2563eb;
          border: none; border-radius: 10px;
          color: #fff; font-size: .9rem; font-weight: 700;
          cursor: pointer; letter-spacing: .05em;
          font-family: 'Courier New', monospace;
          transition: background .15s, transform .1s, box-shadow .15s;
          display: flex; align-items: center; justify-content: center; gap: .6rem;
        }
        .submit-btn:hover:not(:disabled) {
          background: #1d4ed8;
          box-shadow: 0 0 20px #2563eb44;
        }
        .submit-btn:active:not(:disabled) { transform: scale(.985); }
        .submit-btn:disabled { opacity: .55; cursor: not-allowed; }

        .spinner {
          width: 15px; height: 15px;
          border: 2px solid #ffffff44; border-top-color: #fff;
          border-radius: 50%; animation: spin .6s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .hint {
          margin-top: 1.5rem; text-align: center;
          font-size: .72rem; color: #374151;
          font-family: 'Courier New', monospace;
        }
        .hint a { color: #4b5563; text-decoration: underline; }
        .hint a:hover { color: #9ca3af; }
      `}</style>
    </main>
  );
}