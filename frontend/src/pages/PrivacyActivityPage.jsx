import { Activity, Filter } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { DashboardLayout } from "../components/DashboardLayout.jsx";
import { getAuditLogs } from "../lib/api.js";
import { getApiErrorMessage } from "../lib/auth.js";
import { userNavItems } from "../lib/navigation.js";

const actionOptions = [
  { label: "All actions", value: "" },
  { label: "Consent granted", value: "CONSENT_GRANTED" },
  { label: "Consent withdrawn", value: "CONSENT_WITHDRAWN" },
  { label: "Deletion request created", value: "DELETION_REQUEST_CREATED" },
  { label: "Deletion request started", value: "DELETION_REQUEST_STARTED" },
  { label: "Deletion request completed", value: "DELETION_REQUEST_COMPLETED" },
  { label: "Deletion request rejected", value: "DELETION_REQUEST_REJECTED" },
  { label: "Privacy request submitted", value: "DATA_RIGHTS_REQUEST_SUBMITTED" },
  { label: "Privacy request accepted", value: "DATA_RIGHTS_REQUEST_ACCEPTED" },
  { label: "Privacy request processing", value: "DATA_RIGHTS_REQUEST_PROCESSING_STARTED" },
  { label: "Privacy request completed", value: "DATA_RIGHTS_REQUEST_COMPLETED" },
  { label: "Privacy request rejected", value: "DATA_RIGHTS_REQUEST_REJECTED" },
];

export function PrivacyActivityPage() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [action, setAction] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLogs = useCallback(async (selectedAction = "") => {
    setError("");
    setIsLoading(true);

    try {
      const response = await getAuditLogs({
        limit: 20,
        action: selectedAction || undefined,
      });
      setAuditLogs(response.auditLogs);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Unable to load privacy activity."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <DashboardLayout
      title="Privacy Activity"
      subtitle="A personal audit trail of your consent and data-rights actions."
      navItems={userNavItems}
    >
      <section className="rounded-lg border border-ink/10 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-ink/10 p-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-canopy/10 text-canopy">
              <Activity size={20} aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Recent Privacy Activity</h2>
              <p className="text-sm text-ink/60">Newest records first</p>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Filter size={16} aria-hidden="true" />
            <select
              value={action}
              onChange={(event) => {
                setAction(event.target.value);
                loadLogs(event.target.value);
              }}
              className="h-10 rounded-md border border-ink/10 bg-[#fbfdfb] px-3 text-sm font-medium outline-none focus:border-canopy focus:ring-4 focus:ring-mint"
            >
              {actionOptions.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {isLoading ? (
          <div className="grid gap-3 p-5">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-14 animate-pulse rounded-md bg-ink/5" />
            ))}
          </div>
        ) : error ? (
          <div className="m-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink/60">No privacy activity yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="bg-[#fbfdfb] text-xs uppercase tracking-[0.14em] text-ink/50">
                <tr>
                  <th className="px-5 py-3 font-semibold">Timestamp</th>
                  <th className="px-5 py-3 font-semibold">Action</th>
                  <th className="px-5 py-3 font-semibold">Resource</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} className="border-t border-ink/10">
                    <td className="px-5 py-4">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-5 py-4 font-semibold">{log.action}</td>
                    <td className="px-5 py-4 text-ink/65">{log.resourceType}</td>
                    <td className="px-5 py-4 text-ink/65">
                      {log.metadata.status || "recorded"}
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
