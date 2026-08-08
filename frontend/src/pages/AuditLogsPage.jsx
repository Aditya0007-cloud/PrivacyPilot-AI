import { Filter, ListChecks } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { DashboardLayout } from "../components/DashboardLayout.jsx";
import { getAuditLogs } from "../lib/api.js";
import { companyNavItems } from "../lib/navigation.js";

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
  { label: "Policy analyzed", value: "POLICY_ANALYZED" },
];

const AUDIT_PAGE_LIMIT = 10;

export function AuditLogsPage() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: AUDIT_PAGE_LIMIT,
    total: 0,
    totalPages: 0,
  });
  const [action, setAction] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAuditLogs = useCallback(async (page = 1, selectedAction = "") => {
    setIsLoading(true);
    setError("");

    try {
      const response = await getAuditLogs({
        page,
        limit: AUDIT_PAGE_LIMIT,
        action: selectedAction || undefined,
      });

      setAuditLogs(response.auditLogs);
      setPagination(response.pagination);
    } catch {
      setAuditLogs([]);
      setError("Unable to load audit logs.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  const handleActionChange = (event) => {
    const selectedAction = event.target.value;
    setAction(selectedAction);
    loadAuditLogs(1, selectedAction);
  };

  return (
    <DashboardLayout
      title="Audit Logs"
      subtitle="Review privacy workflow events across consent, policy, and data-rights activity."
      navItems={companyNavItems}
    >
      <section className="rounded-lg border border-ink/10 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-ink/10 p-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-canopy/10 text-canopy">
              <ListChecks size={20} aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Recent Audit Activity</h2>
              <p className="text-sm text-ink/60">Newest records first</p>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Filter size={16} aria-hidden="true" />
            <select
              value={action}
              onChange={handleActionChange}
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
          <div className="p-5 text-sm font-medium text-ink/60">Loading audit logs...</div>
        ) : error ? (
          <div className="m-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-mint text-canopy">
              <ListChecks size={24} aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No audit logs found</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink/60">
              Audit events will appear as users grant consent or submit privacy requests.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] border-collapse text-left text-sm">
              <thead className="bg-[#fbfdfb] text-xs uppercase tracking-[0.14em] text-ink/50">
                <tr>
                  <th className="px-5 py-3 font-semibold">Timestamp</th>
                  <th className="px-5 py-3 font-semibold">Actor</th>
                  <th className="px-5 py-3 font-semibold">Action</th>
                  <th className="px-5 py-3 font-semibold">Resource</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} className="border-t border-ink/10">
                    <td className="px-5 py-4">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-5 py-4">{log.metadata.actorId || log.userId}</td>
                    <td className="px-5 py-4 font-semibold">{log.action}</td>
                    <td className="px-5 py-4">{log.resourceType}</td>
                    <td className="px-5 py-4">{log.metadata.status || "recorded"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col justify-between gap-3 border-t border-ink/10 p-5 sm:flex-row sm:items-center">
          <p className="text-sm text-ink/60">
            Page {pagination.page} of {Math.max(pagination.totalPages, 1)} · {pagination.total} records
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1 || isLoading}
              onClick={() => loadAuditLogs(pagination.page - 1)}
              className="rounded-md border border-ink/10 px-3 py-2 text-sm font-semibold text-ink/70 transition hover:border-canopy hover:text-canopy disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages || isLoading}
              onClick={() => loadAuditLogs(pagination.page + 1)}
              className="rounded-md border border-ink/10 px-3 py-2 text-sm font-semibold text-ink/70 transition hover:border-canopy hover:text-canopy disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}
