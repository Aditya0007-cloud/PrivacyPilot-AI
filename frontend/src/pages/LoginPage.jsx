import { ArrowRight, Building2, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/auth-context.js";
import { getApiErrorMessage, getDashboardPath } from "../lib/auth.js";

export function LoginPage() {
  const { isAuthenticated, login, loginDemo, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [demoLoadingRole, setDemoLoadingRole] = useState("");

  if (isAuthenticated) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const loggedInUser = await login(form);
      const fallbackPath = getDashboardPath(loggedInUser.role);
      navigate(location.state?.from?.pathname || fallbackPath, { replace: true });
    } catch (authError) {
      setError(getApiErrorMessage(authError, "Unable to sign in"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async (role) => {
    setError("");
    setDemoLoadingRole(role);

    try {
      const authData = await loginDemo(role);
      navigate(getDashboardPath(authData.user.role), { replace: true });
    } catch (authError) {
      setError(
        getApiErrorMessage(
          authError,
          "Demo mode could not start. Check that the backend API and MongoDB are running.",
        ),
      );
    } finally {
      setDemoLoadingRole("");
    }
  };

  return (
    <AuthScreen title="Welcome back" subtitle="Sign in to continue your DPDP workspace.">
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <DemoButton
          label="Demo Company"
          icon={Building2}
          isLoading={demoLoadingRole === "company"}
          disabled={Boolean(demoLoadingRole)}
          onClick={() => handleDemoLogin("company")}
        />
        <DemoButton
          label="Demo User"
          icon={UserRound}
          isLoading={demoLoadingRole === "user"}
          disabled={Boolean(demoLoadingRole)}
          onClick={() => handleDemoLogin("user")}
        />
      </div>

      <form className="grid gap-4" onSubmit={handleSubmit}>
        <Field
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          autoComplete="email"
        />
        <Field
          label="Password"
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          autoComplete="current-password"
        />

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 flex items-center justify-center gap-2 rounded-md bg-canopy px-4 py-3 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Signing in..." : "Login"}
          <ArrowRight size={17} aria-hidden="true" />
        </button>

        <p className="text-center text-sm text-ink/65">
          New here?{" "}
          <Link className="font-semibold text-canopy hover:text-ink" to="/register">
            Create an account
          </Link>
        </p>
      </form>
    </AuthScreen>
  );
}

export function AuthScreen({ title, subtitle, children }) {
  return (
    <main className="grid min-h-screen bg-[#f7faf8] px-6 py-8 text-ink lg:grid-cols-[0.95fr_1.05fr] lg:px-10">
      <section className="hidden items-center border-r border-ink/10 pr-10 lg:flex">
        <div className="max-w-xl">
          <Link to="/" className="mb-10 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-canopy text-white">
              <ShieldCheck size={22} aria-hidden="true" />
            </div>
            <div>
              <p className="text-lg font-semibold">PrivacyPilot AI</p>
              <p className="text-xs uppercase tracking-[0.24em] text-ink/55">
                DPDP Compliance OS
              </p>
            </div>
          </Link>
          <h1 className="text-5xl font-bold leading-tight">PrivacyPilot AI</h1>
          <p className="mt-5 text-lg leading-8 text-ink/68">
            AI-assisted DPDP readiness assessment with consent, data-rights
            workflows, privacy assistant answers, and audit evidence.
          </p>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-md flex-col justify-center">
        <Link to="/" className="mb-8 flex items-center gap-3 lg:hidden">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-canopy text-white">
            <ShieldCheck size={22} aria-hidden="true" />
          </div>
          <p className="text-lg font-semibold">PrivacyPilot AI</p>
        </Link>
        <div className="rounded-lg border border-ink/10 bg-white p-6 shadow-panel">
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-ink/65">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </section>
    </main>
  );
}

function DemoButton({ label, icon: Icon, isLoading, disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-2 rounded-md border border-canopy bg-mint px-3 py-2.5 text-sm font-semibold text-canopy transition hover:bg-canopy hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Icon size={17} aria-hidden="true" />
      {isLoading ? "Starting..." : label}
    </button>
  );
}

export function Field({ label, name, type = "text", value, onChange, autoComplete }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <input
        required
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        className="h-11 rounded-md border border-ink/10 bg-[#fbfdfb] px-3 text-sm font-medium outline-none transition focus:border-canopy focus:ring-4 focus:ring-mint"
      />
    </label>
  );
}
