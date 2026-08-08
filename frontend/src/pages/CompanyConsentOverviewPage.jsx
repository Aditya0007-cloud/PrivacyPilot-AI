import { CircleSlash2, RefreshCw, ShieldCheck, UsersRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { DashboardLayout } from "../components/DashboardLayout.jsx";
import { getConsentOverview } from "../lib/api.js";
import { getApiErrorMessage } from "../lib/auth.js";
import { companyNavItems } from "../lib/navigation.js";

const statusStyles = {
  granted: "border-emerald-200 bg-emerald-50 text-emerald-700",
  withdrawn: "border-ink/10 bg-ink/5 text-ink/55",
};

export function CompanyConsentOverviewPage() {
  const [overview, setOverview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOverview = useCallback(async () => {
    setIsLoading(true);
    setError("");

    return getConsentOverview()
      .then((response) => {
        setOverview(response.overview);
      })
      .catch((loadError) => {
        setOverview(null);
        setError(getApiErrorMessage(loadError, "Unable to load consent overview."));
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const recentActivity = overview?.recentActivity || [];

  return (
    <DashboardLayout
      title="Consent Overview"
      subtitle="Monitor consent status and recent consent activity for your company."
      navItems={companyNavItems}
    >
      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Total Consents" value={overview?.total ?? 0} icon={UsersRound} />
        <SummaryCard label="Granted" value={overview?.granted ?? 0} icon={ShieldCheck} />
        <SummaryCard label="Withdrawn" value={overview?.withdrawn ?? 0} icon={CircleSlash2} />
      </section>

      <section className="mt-6 rounded-lg border border-ink/10 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-ink/10 p-5 sm:flex-row sm:items-start">
          <div>
            <h2 className="text-lg font-semibold">Recent Consent Activity</h2>
            <p className="mt-1 text-sm leading-6 text-ink/60">
              Latest granted and withdrawn records scoped to your company.
            </p>
          </div>
          <button
            type="button"
            onClick={loadOverview}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-canopy px-4 py-2 text-sm font-semibold text-canopy transition hover:bg-mint disabled:opacity-60"
          >
            <RefreshCw size={16} aria-hidden="true" />
            Refresh
          </button>
        </div>

        {isLoading ? (
          <ConsentSkeleton />
        ) : error ? (
          <div className="m-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : recentActivity.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink/60">No consent records yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left text-sm">
              <thead className="bg-[#fbfdfb] text-xs uppercase tracking-[0.14em] text-ink/50">
                <tr>
                  <th className="px-5 py-3 font-semibold">Purpose</th>
                  <th className="px-5 py-3 font-semibold">Data Category</th>
                  <th className="px-5 py-3 font-semibold">User</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Updated</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((consent) => (
                  <tr key={consent.id} className="border-t border-ink/10">
                    <td className="px-5 py-4 font-semibold">{consent.purpose}</td>
                    <td className="px-5 py-4 text-ink/65">{consent.dataCategory}</td>
                    <td className="px-5 py-4 text-ink/65">{consent.userId}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold uppercase ${statusStyles[consent.status]}`}>
                        {consent.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-ink/65">
                      {new Date(consent.updatedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}

function SummaryCard({ label, value, icon: Icon }) {
  return (
    <article className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
      <div className="mb-4 grid h-10 w-10 place-items-center rounded-md bg-canopy/10 text-canopy">
        <Icon size={20} aria-hidden="true" />
      </div>
      <p className="text-sm text-ink/55">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </article>
  );
}

function ConsentSkeleton() {
  return (
    <div className="grid gap-3 p-5">
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-14 animate-pulse rounded-md bg-ink/5" />
      ))}
    </div>
  );
}
