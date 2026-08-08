import { Bot, Fingerprint, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { ActivityTimeline } from "../components/ActivityTimeline.jsx";
import { DashboardLayout } from "../components/DashboardLayout.jsx";
import { deletionStatusLabels } from "../lib/status.js";
import { getUserAnalytics } from "../lib/api.js";
import { userNavItems } from "../lib/navigation.js";

export function UserDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);
  const [analyticsError, setAnalyticsError] = useState("");

  useEffect(() => {
    let mounted = true;

    getUserAnalytics()
      .then(({ analytics: userAnalytics }) => {
        if (mounted) {
          setAnalytics(userAnalytics);
        }
      })
      .catch(() => {
        if (mounted) {
          setAnalytics(null);
          setAnalyticsError("Unable to load your privacy analytics right now.");
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoadingAnalytics(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const stats = [
    { label: "Rights Workspace", value: "Ready", icon: Fingerprint },
    {
      label: "Total Consents",
      value: isLoadingAnalytics ? "Loading" : `${analytics?.totalConsents || 0}`,
      icon: ShieldCheck,
    },
    {
      label: "Granted Consents",
      value: isLoadingAnalytics ? "Loading" : `${analytics?.grantedConsents || 0}`,
      icon: ShieldCheck,
    },
    {
      label: "Withdrawn Consents",
      value: isLoadingAnalytics ? "Loading" : `${analytics?.withdrawnConsents || 0}`,
      icon: UserRound,
    },
  ];

  const privacyRequestStatus = analytics?.activeDeletionRequest
    ? deletionStatusLabels[analytics.activeDeletionRequest.status]
    : analytics?.latestDeletionRequest
      ? deletionStatusLabels[analytics.latestDeletionRequest.status]
      : "No privacy requests submitted";

  return (
    <DashboardLayout
      title="User Dashboard"
      subtitle="Your privacy activity, consent posture, and data request status."
      navItems={userNavItems}
    >
      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <DashboardStat key={stat.label} {...stat} />
        ))}
      </div>

      {analyticsError && (
        <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {analyticsError}
        </div>
      )}

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <DashboardCard
          title="AI Privacy Assistant"
          description="Ask simple questions about company privacy policies. Answers are grounded only in uploaded policy text and are not legal advice."
          href="/user/privacy-assistant"
          cta="Open Assistant"
          icon={Bot}
        >
          <p className="text-sm font-semibold text-ink">
            Latest assistant activity is kept in your current chat session.
          </p>
        </DashboardCard>

        <DashboardCard
          title="Consent Statistics"
          description="You control how your personal data is used. You can withdraw consent at any time."
          href="/user/consents"
          cta="Review Consents"
          icon={ShieldCheck}
        >
          <p className="text-sm font-semibold text-ink">
            {analytics?.grantedConsents || 0} granted · {analytics?.withdrawnConsents || 0} withdrawn
          </p>
        </DashboardCard>

        <DashboardCard
          title="Privacy Request Status"
          description="Submit deletion, access, correction, and processing-information requests to a company privacy team."
          href="/user/deletion-requests"
          cta="Open Requests"
          icon={Trash2}
        >
          <p className="text-sm font-semibold text-ink">{privacyRequestStatus}</p>
        </DashboardCard>
      </section>

      <section className="mt-6 rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Recent Privacy Activity</h2>
        <p className="mt-1 text-sm leading-6 text-ink/60">
          Recent consent and privacy request workflow events related to your account.
        </p>
        <div className="mt-4">
          {isLoadingAnalytics ? (
            <p className="text-sm text-ink/60">Loading recent activity...</p>
          ) : (
            <ActivityTimeline activities={analytics?.recentPrivacyActivity || []} />
          )}
        </div>
      </section>
    </DashboardLayout>
  );
}

function DashboardStat({ label, value, icon: Icon }) {
  return (
    <article className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
      <div className="mb-4 grid h-10 w-10 place-items-center rounded-md bg-coral/10 text-coral">
        <Icon size={20} aria-hidden="true" />
      </div>
      <p className="text-sm text-ink/55">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </article>
  );
}

function DashboardCard({ title, description, href, cta, icon: Icon, children }) {
  return (
    <article className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
      <div className="mb-4 grid h-10 w-10 place-items-center rounded-md bg-canopy/10 text-canopy">
        <Icon size={20} aria-hidden="true" />
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-ink/60">{description}</p>
      <div className="mt-4">{children}</div>
      <Link
        to={href}
        className="mt-5 inline-flex rounded-md bg-canopy px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink"
      >
        {cta}
      </Link>
    </article>
  );
}
