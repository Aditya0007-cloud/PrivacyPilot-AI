import {
  Activity,
  Bot,
  ClipboardList,
  FileSearch,
  LayoutDashboard,
  ListChecks,
  LogOut,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../context/auth-context.js";

const roleLabels = {
  company: "Company",
  user: "Data Principal / User",
};

const navIcons = {
  "AI Privacy Assistant": Bot,
  "Audit Logs": ListChecks,
  Dashboard: LayoutDashboard,
  "Deletion Requests": Trash2,
  "Data Rights Requests": Trash2,
  "My Privacy Requests": Trash2,
  "My Consents": ShieldCheck,
  "Policy Analyzer": FileSearch,
  "Privacy Activity": Activity,
  "Consent Overview": ClipboardList,
};

export function DashboardLayout({ title, subtitle, navItems, children }) {
  const { demo, logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <main className="min-h-screen bg-[#f7faf8] text-ink">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-b border-ink/10 bg-white px-5 py-5 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-canopy text-white">
              <ShieldCheck size={22} aria-hidden="true" />
            </div>
            <div>
              <p className="font-semibold">PrivacyPilot AI</p>
              <p className="text-xs uppercase tracking-[0.22em] text-ink/50">
                Secure Workspace
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-lg border border-ink/10 bg-[#fbfdfb] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">{user.name}</p>
              {demo && (
                <span className="rounded-md bg-amber/20 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/65">
                  Demo
                </span>
              )}
            </div>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-ink/50">
              {roleLabels[user.role]}
            </p>
            {demo?.company?.name && (
              <p className="mt-3 text-xs leading-5 text-ink/55">
                Demo workspace: {demo.company.name}
              </p>
            )}
          </div>

          <nav className="mt-6 grid gap-2">
            {navItems.map((item) => {
              const Icon = navIcons[item.label] || LayoutDashboard;

              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                      isActive
                        ? "bg-canopy text-white"
                        : "text-ink/70 hover:bg-mint hover:text-canopy"
                    }`
                  }
                >
                  <Icon size={16} aria-hidden="true" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-md border border-ink/10 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-coral hover:text-coral"
          >
            <LogOut size={17} aria-hidden="true" />
            Logout
          </button>
        </aside>

        <section className="px-6 py-6 sm:px-8 lg:px-10">
          <header className="mb-8 flex flex-col justify-between gap-4 border-b border-ink/10 pb-6 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-canopy">
                {roleLabels[user.role]}
              </p>
              <h1 className="mt-2 text-3xl font-bold">{title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">{subtitle}</p>
            </div>
            <div className="rounded-md bg-mint px-3 py-2 text-sm font-semibold text-canopy">
              Signed in as {user.name}
            </div>
          </header>

          {children || <Outlet />}

          <footer className="mt-10 rounded-lg border border-ink/10 bg-white px-4 py-3 text-xs leading-5 text-ink/55">
            AI-assisted DPDP readiness assessment. This prototype provides
            AI-assisted privacy analysis for informational purposes only and does not
            constitute legal advice or legal certification.
          </footer>
        </section>
      </div>
    </main>
  );
}
