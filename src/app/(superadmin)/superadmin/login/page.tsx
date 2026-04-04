// app/(superadmin)/superadmin/login/page.tsx
// Super Admin login page — আলাদা route, আলাদা session, school tenant থেকে সম্পূর্ণ isolated

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { superAdminLoginAction } from "@/Actions/school/superadmin-login.action";


export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError]   = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string[]; password?: string[];
  }>({});
  const [showPass, setShowPass] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await superAdminLoginAction(formData);

      if (result.success) {
        router.push("/superadmin/dashboard");
        router.refresh();
      } else {
        setError(result.error);
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
      }
    });
  }

  return (
    <div className="sa-root">
      {/* Left panel — branding */}
      <div className="sa-left">
        <div className="sa-left-content">
          <div className="sa-logo">
            <span>S</span>
          </div>
          <h1>SchoolSaaS</h1>
          <p>Super Admin Control Center</p>

          <ul className="sa-features">
            {[
              "Manage all school tenants",
              "Monitor subscriptions",
              "Control platform settings",
              "View analytics & reports",
            ].map((f) => (
              <li key={f}>
                <span className="sa-check">✓</span> {f}
              </li>
            ))}
          </ul>
        </div>

        {/* decorative grid */}
        <div className="sa-grid" aria-hidden />
      </div>

      {/* Right panel — form */}
      <div className="sa-right">
        <div className="sa-card">
          {/* Header */}
          <div className="sa-card-header">
            <div className="sa-badge">SUPER ADMIN</div>
            <h2>Sign in to your account</h2>
            <p>Access restricted to authorized administrators only.</p>
          </div>

          {/* Global error */}
          {error && (
            <div className="sa-error-banner" role="alert">
              <span className="sa-error-icon">!</span>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div className="sa-field">
              <label htmlFor="email">Email address</label>
              <div className="sa-input-wrap">
                <span className="sa-input-icon">@</span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="admin@schoolsaas.com"
                  defaultValue="superadmin@schoolsaas.com"
                  disabled={isPending}
                  className={fieldErrors.email ? "sa-input sa-input-error" : "sa-input"}
                  autoComplete="email"
                  autoFocus
                />
              </div>
              {fieldErrors.email && (
                <p className="sa-field-error">{fieldErrors.email[0]}</p>
              )}
            </div>

            {/* Password */}
            <div className="sa-field">
              <label htmlFor="password">Password</label>
              <div className="sa-input-wrap">
                <span className="sa-input-icon">🔑</span>
                <input
                  id="password"
                  name="password"
                  type={showPass ? "text" : "password"}
                  placeholder="Enter your password"
                  disabled={isPending}
                  className={fieldErrors.password ? "sa-input sa-input-error" : "sa-input"}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="sa-show-pass"
                  onClick={() => setShowPass((v) => !v)}
                  tabIndex={-1}
                >
                  {showPass ? "hide" : "show"}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="sa-field-error">{fieldErrors.password[0]}</p>
              )}
            </div>

            {/* Submit */}
            <button type="submit" disabled={isPending} className="sa-submit">
              {isPending ? (
                <>
                  <span className="sa-spinner" />
                  Authenticating…
                </>
              ) : (
                <>
                  <span>→</span>
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <p className="sa-footer-note">
            This portal is restricted. Unauthorized access attempts are logged.
          </p>
        </div>
      </div>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .sa-root {
          min-height: 100vh;
          display: flex;
          font-family: 'Georgia', 'Times New Roman', serif;
          background: #070809;
        }

        /* ── Left Panel ── */
        .sa-left {
          display: none;
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #0a0f1e 0%, #0d1a0f 60%, #0a0c10 100%);
          border-right: 1px solid #1a2a1a;
        }
        @media (min-width: 900px) {
          .sa-left { display: flex; align-items: center; justify-content: center; width: 45%; }
        }

        .sa-left-content {
          position: relative; z-index: 2;
          padding: 3rem;
          max-width: 380px;
        }

        .sa-logo {
          width: 56px; height: 56px;
          background: linear-gradient(135deg, #16a34a, #15803d);
          border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.5rem; font-weight: 900; color: white;
          margin-bottom: 1.5rem;
          box-shadow: 0 0 40px #16a34a44;
        }

        .sa-left-content h1 {
          font-size: 2rem; color: #f0fdf4;
          font-weight: 800; letter-spacing: -.03em;
          margin-bottom: .4rem;
        }
        .sa-left-content > p {
          font-size: .85rem; color: #4ade80;
          font-family: 'Courier New', monospace;
          text-transform: uppercase; letter-spacing: .1em;
          margin-bottom: 2.5rem;
        }

        .sa-features { list-style: none; space-y: .75rem; }
        .sa-features li {
          display: flex; align-items: center; gap: .75rem;
          color: #86efac; font-size: .875rem;
          padding: .5rem 0;
          border-bottom: 1px solid #1a3a1a;
        }
        .sa-features li:last-child { border-bottom: none; }
        .sa-check {
          width: 20px; height: 20px;
          background: #14532d; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: .65rem; color: #4ade80; flex-shrink: 0;
          font-weight: bold;
        }

        /* decorative grid */
        .sa-grid {
          position: absolute; inset: 0; z-index: 1;
          background-image:
            linear-gradient(#16a34a0a 1px, transparent 1px),
            linear-gradient(90deg, #16a34a0a 1px, transparent 1px);
          background-size: 40px 40px;
        }

        /* ── Right Panel ── */
        .sa-right {
          flex: 1;
          display: flex; align-items: center; justify-content: center;
          padding: 2rem;
          background: #070809;
        }

        .sa-card {
          width: 100%; max-width: 420px;
        }

        .sa-card-header { margin-bottom: 2rem; }

        .sa-badge {
          display: inline-block;
          background: #14532d;
          color: #4ade80;
          font-family: 'Courier New', monospace;
          font-size: .65rem;
          letter-spacing: .15em;
          padding: .3rem .75rem;
          border-radius: 999px;
          border: 1px solid #166534;
          margin-bottom: 1.2rem;
        }

        .sa-card-header h2 {
          font-size: 1.6rem; color: #f9fafb;
          font-weight: 700; letter-spacing: -.02em;
          margin-bottom: .4rem;
        }
        .sa-card-header p {
          font-size: .825rem; color: #4b5563;
          font-family: 'Courier New', monospace;
        }

        /* Error banner */
        .sa-error-banner {
          display: flex; align-items: flex-start; gap: .75rem;
          background: #1c0a0a; border: 1px solid #7f1d1d;
          border-radius: 10px; padding: .875rem 1rem;
          margin-bottom: 1.5rem;
          color: #fca5a5; font-size: .85rem;
          font-family: 'Courier New', monospace;
        }
        .sa-error-icon {
          width: 20px; height: 20px; border-radius: 50%;
          background: #7f1d1d; color: #fca5a5;
          display: flex; align-items: center; justify-content: center;
          font-weight: 900; font-size: .75rem; flex-shrink: 0;
        }

        /* Fields */
        .sa-field {
          display: flex; flex-direction: column; gap: .4rem;
          margin-bottom: 1.25rem;
        }
        .sa-field label {
          font-size: .72rem; color: #6b7280;
          font-family: 'Courier New', monospace;
          text-transform: uppercase; letter-spacing: .1em;
        }
        .sa-input-wrap {
          position: relative; display: flex; align-items: center;
        }
        .sa-input-icon {
          position: absolute; left: .875rem;
          color: #374151; font-size: .875rem; pointer-events: none;
          font-style: normal;
        }
        .sa-input {
          width: 100%;
          background: #0d0f14; border: 1px solid #1f2937;
          border-radius: 10px; color: #f9fafb;
          font-size: .9rem; padding: .8rem 1rem .8rem 2.5rem;
          outline: none; transition: border-color .15s, box-shadow .15s;
          font-family: 'Courier New', monospace;
        }
        .sa-input::placeholder { color: #374151; }
        .sa-input:focus {
          border-color: #16a34a;
          box-shadow: 0 0 0 3px #16a34a22;
        }
        .sa-input-error { border-color: #7f1d1d !important; }
        .sa-input:disabled { opacity: .5; cursor: not-allowed; }
        .sa-show-pass {
          position: absolute; right: .875rem;
          background: none; border: none; cursor: pointer;
          color: #4b5563; font-size: .72rem;
          font-family: 'Courier New', monospace;
          text-transform: uppercase; letter-spacing: .05em;
          transition: color .15s;
        }
        .sa-show-pass:hover { color: #9ca3af; }
        .sa-field-error {
          color: #f87171; font-size: .72rem;
          font-family: 'Courier New', monospace;
          display: flex; align-items: center; gap: .3rem;
        }

        /* Submit button */
        .sa-submit {
          width: 100%; margin-top: .5rem;
          background: #16a34a; border: none; border-radius: 10px;
          color: #fff; font-size: .9rem; font-weight: 700;
          padding: .9rem; cursor: pointer;
          transition: background .15s, box-shadow .15s, transform .1s;
          display: flex; align-items: center; justify-content: center; gap: .6rem;
          font-family: 'Courier New', monospace; letter-spacing: .05em;
          box-shadow: 0 0 0 0 #16a34a00;
        }
        .sa-submit:hover:not(:disabled) {
          background: #15803d;
          box-shadow: 0 0 20px #16a34a44;
        }
        .sa-submit:active:not(:disabled) { transform: scale(.98); }
        .sa-submit:disabled { opacity: .55; cursor: not-allowed; }

        /* Spinner */
        .sa-spinner {
          width: 16px; height: 16px;
          border: 2px solid #ffffff44; border-top-color: #fff;
          border-radius: 50%; animation: sa-spin .6s linear infinite;
          display: inline-block;
        }
        @keyframes sa-spin { to { transform: rotate(360deg); } }

        /* Footer note */
        .sa-footer-note {
          margin-top: 1.5rem;
          text-align: center;
          font-size: .72rem; color: #374151;
          font-family: 'Courier New', monospace;
          line-height: 1.6;
        }
      `}</style>
    </div>
  );
}