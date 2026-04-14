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

     
    </div>
  );
}