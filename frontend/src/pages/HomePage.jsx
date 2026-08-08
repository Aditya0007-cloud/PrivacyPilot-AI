import {
  Activity,
  Bot,
  ClipboardCheck,
  FileSearch,
  Fingerprint,
  LockKeyhole,
  Scale,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useAuth } from "../context/auth-context.js";
import { getHealth } from "../lib/api.js";
import { getApiErrorMessage } from "../lib/auth.js";

const previewSignals = [
  { name: "Notice", score: 86 },
  { name: "Consent", score: 91 },
  { name: "Rights", score: 78 },
  { name: "Retention", score: 72 },
];

const sections = [
  {
    title: "Why Privacy Management Is Hard",
    icon: Scale,
    text: "Policies, consent, user-rights workflows, and audit evidence usually live in different places. Teams need one operational view before a review or demo.",
  },
  {
    title: "How PrivacyPilot Works",
    icon: Sparkles,
    text: "Upload a policy, review an AI-assisted DPDP readiness assessment, manage consent, process data-rights requests, and keep an audit trail.",
  },
  {
    title: "Key Features",
    icon: ClipboardCheck,
    text: "Role-based dashboards, policy analysis, consent status, deletion workflow tracking, analytics, and evidence-ready audit logs.",
  },
  {
    title: "AI Privacy Assistant",
    icon: Bot,
    text: "Data principals can ask plain-language questions grounded only in the company policy uploaded to PrivacyPilot AI.",
  },
  {
    title: "Consent & Data Rights",
    icon: UserCheck,
    text: "Users can review granted consent, withdraw consent, and submit deletion, access, correction, or processing-information requests.",
  },
  {
    title: "Audit Evidence",
    icon: Activity,
    text: "Consent and deletion workflow actions are recorded as searchable, role-scoped audit events for live compliance reviews.",
  },
];

const getStatusClasses = (apiStatus) => {
  if (apiStatus === "online") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (apiStatus === "checking") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-red-200 bg-red-50 text-red-700";
};

export function HomePage() {
  const navigate = useNavigate();
  const { loginDemo } = useAuth();
  const [apiHealth, setApiHealth] = useState({
    status: "checking",
    database: "unknown",
  });
  const [demoError, setDemoError] = useState("");
  const [isStartingDemo, setIsStartingDemo] = useState("");

  useEffect(() => {
    let mounted = true;

    getHealth()
      .then((data) => {
        if (mounted) {
          setApiHealth({
            status: "online",
            database: data.database,
            timestamp: data.timestamp,
          });
        }
      })
      .catch(() => {
        if (mounted) {
          setApiHealth({
            status: "offline",
            database: "unknown",
          });
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const statusLabel = useMemo(() => {
    if (apiHealth.status === "checking") return "Checking API";
    if (apiHealth.status === "online") return "API Connected";
    return "API Offline";
  }, [apiHealth.status]);

  const startDemo = async (role, destination) => {
    setDemoError("");
    setIsStartingDemo(role);

    try {
      await loginDemo(role);
      navigate(destination, { replace: true });
    } catch (error) {
      setDemoError(
        getApiErrorMessage(
          error,
          "Demo mode could not start. Check that the backend API and MongoDB are running.",
        ),
      );
    } finally {
      setIsStartingDemo("");
    }
  };

  return (
    <main className="min-h-screen bg-[#f7faf8] text-ink">
      <section className="border-b border-ink/10 bg-white">
        <div className="mx-auto flex min-h-[92vh] w-full max-w-7xl flex-col px-6 py-6 sm:px-8 lg:px-10">
          <nav className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-canopy text-white">
                <ShieldCheck size={22} aria-hidden="true" />
              </div>
              <div>
                <p className="text-lg font-semibold">PrivacyPilot AI</p>
                <p className="text-xs uppercase tracking-[0.24em] text-ink/55">
                  AI-assisted DPDP readiness assessment
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium ${getStatusClasses(
                  apiHealth.status,
                )}`}
              >
                <span className="h-2 w-2 rounded-full bg-current" />
                {statusLabel}
              </div>
              <Link
                to="/login"
                className="rounded-md border border-ink/10 px-4 py-2 text-sm font-semibold text-ink transition hover:border-canopy hover:text-canopy"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-md bg-canopy px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink"
              >
                Register
              </Link>
            </div>
          </nav>

          <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1fr_0.95fr]">
            <div className="max-w-3xl">
              <p className="mb-4 inline-flex rounded-md bg-mint px-3 py-1 text-sm font-semibold text-canopy">
                AI-powered DPDP readiness and privacy management
              </p>
              <h1 className="max-w-4xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
                PrivacyPilot AI
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-ink/70">
                Understand privacy policies, manage consent, handle data-rights requests,
                and maintain audit-ready evidence - all in one platform.
              </p>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/55">
                This prototype provides AI-assisted privacy analysis for informational
                purposes only and does not constitute legal advice or legal certification.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => startDemo("company", "/company/dashboard")}
                  disabled={Boolean(isStartingDemo)}
                  className="inline-flex items-center gap-2 rounded-md bg-canopy px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Sparkles size={18} aria-hidden="true" />
                  {isStartingDemo === "company" ? "Starting demo..." : "Try Interactive Demo"}
                </button>
                <button
                  type="button"
                  onClick={() => startDemo("company", "/company/privacy-policy-analyzer")}
                  disabled={Boolean(isStartingDemo)}
                  className="inline-flex items-center gap-2 rounded-md border border-canopy px-5 py-3 text-sm font-semibold text-canopy transition hover:bg-mint disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FileSearch size={18} aria-hidden="true" />
                  Analyze a Policy
                </button>
                <button
                  type="button"
                  onClick={() => startDemo("user", "/user/dashboard")}
                  disabled={Boolean(isStartingDemo)}
                  className="inline-flex items-center gap-2 rounded-md border border-ink/10 px-5 py-3 text-sm font-semibold text-ink/70 transition hover:border-coral hover:text-coral disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Fingerprint size={18} aria-hidden="true" />
                  Continue as Demo User
                </button>
              </div>

              {demoError && (
                <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {demoError}
                </div>
              )}
            </div>

            <DashboardPreview />
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-4 px-6 py-10 sm:grid-cols-2 sm:px-8 lg:grid-cols-3 lg:px-10">
        {sections.map((section) => (
          <InfoCard key={section.title} {...section} />
        ))}
      </section>

      <section className="border-t border-ink/10 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-6 px-6 py-10 sm:px-8 md:flex-row md:items-center lg:px-10">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-canopy">
              Final CTA
            </p>
            <h2 className="mt-2 text-2xl font-bold">Show DPDP readiness with evidence.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">
              Launch the seeded demo workspace for Acme Digital Services and explore the
              full company or data principal journey.
            </p>
          </div>
          <button
            type="button"
            onClick={() => startDemo("company", "/company/dashboard")}
            disabled={Boolean(isStartingDemo)}
            className="rounded-md bg-canopy px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60"
          >
            Continue as Demo Company
          </button>
        </div>
      </section>
    </main>
  );
}

function DashboardPreview() {
  return (
    <article className="rounded-lg border border-ink/10 bg-[#fbfdfb] p-5 shadow-panel">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Acme Compliance Dashboard</h2>
          <p className="text-sm text-ink/60">Live demo preview</p>
        </div>
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
          Medium Risk
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <PreviewMetric label="DPDP Score" value="84/100" />
        <PreviewMetric label="Active Consents" value="3" />
        <PreviewMetric label="Open Requests" value="2" />
      </div>
      <div className="mt-5 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={previewSignals} margin={{ left: -18 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: "rgba(15, 61, 46, 0.06)" }} />
            <Bar dataKey="score" fill="#0f3d2e" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-5 grid gap-2 text-sm">
        <PreviewEvent icon={LockKeyhole} text="Consent withdrawn: Analytics" />
        <PreviewEvent icon={Activity} text="Deletion request moved to in progress" />
        <PreviewEvent icon={Bot} text="Assistant grounded in uploaded policy" />
      </div>
    </article>
  );
}

function PreviewMetric({ label, value }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white p-4">
      <p className="text-sm text-ink/55">{label}</p>
      <p className="mt-1 text-xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function PreviewEvent({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-3 rounded-md bg-white px-3 py-2 text-ink/70">
      <Icon size={16} className="text-canopy" aria-hidden="true" />
      {text}
    </div>
  );
}

function InfoCard({ title, icon: Icon, text }) {
  return (
    <article className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-panel">
      <div className="mb-4 grid h-10 w-10 place-items-center rounded-md bg-canopy/10 text-canopy">
        <Icon size={20} aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-ink/65">{text}</p>
    </article>
  );
}
