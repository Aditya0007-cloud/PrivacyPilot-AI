import { ArrowRight, Building2, UserRound } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../context/auth-context.js";
import { getApiErrorMessage, getDashboardPath } from "../lib/auth.js";
import { AuthScreen, Field } from "./LoginPage.jsx";

const roles = [
  {
    label: "Company",
    value: "company",
    icon: Building2,
  },
  {
    label: "Data Principal / User",
    value: "user",
    icon: UserRound,
  },
];

export function RegisterPage() {
  const { isAuthenticated, register, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "company",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const registeredUser = await register(form);
      navigate(getDashboardPath(registeredUser.role), { replace: true });
    } catch (authError) {
      setError(getApiErrorMessage(authError, "Unable to create account"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthScreen title="Create account" subtitle="Choose the workspace that matches your DPDP role.">
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <Field
          label="Name"
          name="name"
          value={form.name}
          onChange={handleChange}
          autoComplete="name"
        />
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
          autoComplete="new-password"
        />

        <div className="grid gap-2">
          <p className="text-sm font-semibold text-ink">Role</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {roles.map((role) => {
              const Icon = role.icon;
              const selected = form.role === role.value;

              return (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, role: role.value }))}
                  className={`flex items-center gap-3 rounded-md border px-3 py-3 text-left text-sm font-semibold transition ${
                    selected
                      ? "border-canopy bg-mint text-canopy"
                      : "border-ink/10 bg-[#fbfdfb] text-ink/70 hover:border-canopy"
                  }`}
                >
                  <Icon size={18} aria-hidden="true" />
                  {role.label}
                </button>
              );
            })}
          </div>
        </div>

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
          {isSubmitting ? "Creating account..." : "Register"}
          <ArrowRight size={17} aria-hidden="true" />
        </button>

        <p className="text-center text-sm text-ink/65">
          Already have an account?{" "}
          <Link className="font-semibold text-canopy hover:text-ink" to="/login">
            Login
          </Link>
        </p>
      </form>
    </AuthScreen>
  );
}
