import {
  Bot,
  CheckCircle2,
  FileText,
  PlayCircle,
  ShieldCheck,
  UsersRound,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { ActivityTimeline } from "../components/ActivityTimeline.jsx";
import { ConfirmModal } from "../components/ConfirmModal.jsx";
import { DashboardLayout } from "../components/DashboardLayout.jsx";
import { StatusBadge } from "../components/StatusBadge.jsx";
import { Toast } from "../components/Toast.jsx";
import {
  getCompanyAnalytics,
  getDeletionRequests,
  updateDeletionRequestStatus,
} from "../lib/api.js";
import { getApiErrorMessage } from "../lib/auth.js";
import { companyNavItems } from "../lib/navigation.js";
import { requestTypeLabels } from "../lib/status.js";

const chartColors = ["#0f3d2e", "#4f8df5", "#f5bd4f", "#2f9e78", "#f46d5e"];

export function CompanyDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [deletionRequests, setDeletionRequests] = useState([]);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);
  const [isLoadingDeletionRequests, setIsLoadingDeletionRequests] = useState(true);
  const [isUpdatingDeletionRequest, setIsUpdatingDeletionRequest] = useState(false);
  const [pendingStatusAction, setPendingStatusAction] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [analyticsError, setAnalyticsError] = useState("");
  const [toast, setToast] = useState(null);

  const loadAnalytics = async () => {
    setIsLoadingAnalytics(true);
    setAnalyticsError("");

    try {
      const response = await getCompanyAnalytics();
      setAnalytics(response.analytics);
    } catch (loadError) {
      setAnalytics(null);
      setAnalyticsError(
        getApiErrorMessage(loadError, "Unable to load company analytics right now."),
      );
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  const loadDeletionRequests = async () => {
    setIsLoadingDeletionRequests(true);

    try {
      const response = await getDeletionRequests();
      setDeletionRequests(response.requests || response.deletionRequests || []);
    } catch {
      setDeletionRequests([]);
    } finally {
      setIsLoadingDeletionRequests(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
    loadDeletionRequests();
  }, []);

  const handleStatusUpdate = async () => {
    if (!pendingStatusAction) return;

    setIsUpdatingDeletionRequest(true);

    try {
      const payload = { status: pendingStatusAction.status };

      if (pendingStatusAction.status === "rejected") {
        payload.rejectionReason = rejectionReason;
      }

      const response = await updateDeletionRequestStatus(pendingStatusAction.request.id, payload);
      const updatedRequest = response.request || response.deletionRequest;

      setDeletionRequests((current) =>
        current.map((request) =>
          request.id === updatedRequest.id ? updatedRequest : request,
        ),
      );
      await loadAnalytics();
      setPendingStatusAction(null);
      setRejectionReason("");
      setToast({ type: "success", message: "Privacy request status updated." });
    } catch (updateError) {
      setToast({
        type: "error",
        message: getApiErrorMessage(updateError, "Unable to update privacy request."),
      });
    } finally {
      setIsUpdatingDeletionRequest(false);
    }
  };

  const topStats = [
    {
      label: "DPDP Readiness Score",
      value: analytics?.latestComplianceScore
        ? `${analytics.latestComplianceScore} / 100`
        : "Not analyzed",
      icon: ShieldCheck,
    },
    {
      label: "Active Users",
      value: isLoadingAnalytics ? "Loading" : `${analytics?.totalUsers || 0}`,
      icon: UsersRound,
    },
    {
      label: "Active Consents",
      value: isLoadingAnalytics ? "Loading" : `${analytics?.grantedConsents || 0}`,
      icon: CheckCircle2,
    },
    {
      label: "Withdrawn Consents",
      value: isLoadingAnalytics ? "Loading" : `${analytics?.withdrawnConsents || 0}`,
      icon: XCircle,
    },
    {
      label: "Pending Privacy Requests",
      value: isLoadingAnalytics ? "Loading" : `${analytics?.pendingDeletionRequests || 0}`,
      icon: FileText,
    },
  ];

  return (
    <DashboardLayout
      title="Company Dashboard"
      subtitle="Compliance overview, audit activity, and privacy workflow operations."
      navItems={companyNavItems}
    >
      <Toast toast={toast} onDismiss={() => setToast(null)} />
      <ConfirmModal
        isOpen={Boolean(pendingStatusAction)}
        isLoading={isUpdatingDeletionRequest}
        title={getStatusActionTitle(pendingStatusAction?.status)}
        message={getStatusActionMessage(pendingStatusAction)}
        confirmLabel="Confirm"
        loadingLabel="Updating..."
        onCancel={() => {
          setPendingStatusAction(null);
          setRejectionReason("");
        }}
        onConfirm={handleStatusUpdate}
      >
        {pendingStatusAction?.status === "rejected" && (
          <label className="mt-4 grid gap-2 text-sm font-semibold text-ink">
            Rejection reason
            <textarea
              required
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              className="min-h-24 resize-y rounded-md border border-ink/10 bg-[#fbfdfb] px-3 py-3 text-sm font-medium outline-none transition focus:border-canopy focus:ring-4 focus:ring-mint"
              placeholder="Explain why this request is rejected."
            />
          </label>
        )}
      </ConfirmModal>

      <section className="grid gap-4 lg:grid-cols-5">
        {topStats.map((stat) => (
          <DashboardStat key={stat.label} {...stat} />
        ))}
      </section>

      {analyticsError && (
        <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {analyticsError}
        </div>
      )}

      <section className="mt-6 rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-canopy/10 text-canopy">
              <Bot size={20} aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">AI Privacy Assistant</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-ink/60">
                Ask questions grounded only in your latest uploaded privacy policy.
              </p>
            </div>
          </div>
          <Link
            to="/company/privacy-assistant"
            className="inline-flex items-center justify-center rounded-md bg-canopy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink"
          >
            Open Assistant
          </Link>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-3">
        <ChartCard title="Consent Distribution" data={analytics?.consentDistribution || []} />
        <ChartCard
          title="Privacy Request Status"
          data={analytics?.deletionRequestDistribution || []}
        />
        <article className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Compliance Overview</h2>
          {isLoadingAnalytics ? (
            <p className="mt-4 text-sm text-ink/60">Loading compliance overview...</p>
          ) : (
            <div className="mt-4 grid gap-3 text-sm">
              <p className="rounded-md bg-[#fbfdfb] px-3 py-2 font-semibold text-ink">
                Your privacy policy has {analytics?.totalComplianceGaps || 0} compliance gaps.
              </p>
              <InfoRow label="Latest compliance score" value={analytics?.latestComplianceScore ?? "Not analyzed"} />
              <InfoRow label="Risk level" value={analytics?.latestRiskLevel || "Not available"} />
              <InfoRow label="Number of gaps" value={`${analytics?.totalComplianceGaps || 0}`} />
              <InfoRow
                label="Last policy analysis"
                value={
                  analytics?.lastPolicyAnalysisDate
                    ? new Date(analytics.lastPolicyAnalysisDate).toLocaleDateString()
                    : "Not available"
                }
              />
            </div>
          )}
        </article>
      </section>

      <section className="mt-6 rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h2 className="text-lg font-semibold">Recent Privacy Activity</h2>
            <p className="mt-1 text-sm leading-6 text-ink/60">
              Timeline of recent consent, policy, and data-rights events from audit logs.
            </p>
          </div>
          <Link
            to="/company/audit-logs"
            className="rounded-md border border-canopy px-4 py-2 text-sm font-semibold text-canopy transition hover:bg-mint"
          >
            View Audit Logs
          </Link>
        </div>
        <div className="mt-4">
          <ActivityTimeline activities={analytics?.recentPrivacyActivity || []} />
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Recent Audit Activity</h2>
        <AuditActivityTable activities={analytics?.recentPrivacyActivity || []} />
      </section>

      <DeletionRequestsSection
        requests={deletionRequests}
        isLoading={isLoadingDeletionRequests}
        onAction={(request, status) => {
          setPendingStatusAction({ request, status });
          setRejectionReason("");
        }}
      />
    </DashboardLayout>
  );
}

function DashboardStat({ label, value, icon: Icon }) {
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

function ChartCard({ title, data }) {
  const hasData = data.some((item) => item.value > 0);

  return (
    <article className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4 h-56">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={82}>
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="grid h-full place-items-center rounded-lg bg-[#fbfdfb] text-sm text-ink/60">
            No data available
          </div>
        )}
      </div>
    </article>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md bg-[#fbfdfb] px-3 py-2">
      <span className="text-ink/55">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function AuditActivityTable({ activities }) {
  if (!activities.length) {
    return <p className="mt-4 text-sm text-ink/60">No audit activity yet.</p>;
  }

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead className="bg-[#fbfdfb] text-xs uppercase tracking-[0.14em] text-ink/50">
          <tr>
            <th className="px-4 py-3 font-semibold">Timestamp</th>
            <th className="px-4 py-3 font-semibold">Actor</th>
            <th className="px-4 py-3 font-semibold">Action</th>
            <th className="px-4 py-3 font-semibold">Resource</th>
            <th className="px-4 py-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {activities.slice(0, 5).map((activity) => (
            <tr key={activity.id} className="border-t border-ink/10">
              <td className="px-4 py-3">{new Date(activity.timestamp).toLocaleString()}</td>
              <td className="px-4 py-3">{activity.actorId}</td>
              <td className="px-4 py-3 font-semibold">{activity.action}</td>
              <td className="px-4 py-3">{activity.resourceType}</td>
              <td className="px-4 py-3">{activity.status || "recorded"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DeletionRequestsSection({ requests, isLoading, onAction }) {
  return (
    <section className="mt-6 rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">Data Rights Requests</h2>
      <p className="mt-1 text-sm leading-6 text-ink/60">
        Incoming user privacy requests with controlled company workflow actions.
      </p>

      {isLoading ? (
        <p className="mt-5 text-sm font-medium text-ink/60">Loading privacy requests...</p>
      ) : requests.length === 0 ? (
        <div className="mt-5 rounded-lg border border-ink/10 bg-[#fbfdfb] p-4 text-sm leading-6 text-ink/65">
          No privacy requests have been submitted yet.
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-lg border border-ink/10">
          <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
            <thead className="bg-[#fbfdfb] text-xs uppercase tracking-[0.14em] text-ink/50">
              <tr>
                <th className="px-4 py-3 font-semibold">Request ID</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Requested Date</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id} className="border-t border-ink/10">
                  <td className="px-4 py-4 font-semibold">{request.requestNumber}</td>
                  <td className="px-4 py-4 text-ink/65">{request.customerId || "Not provided"}</td>
                  <td className="px-4 py-4 text-ink/65">
                    {requestTypeLabels[request.requestType] || request.requestType}
                  </td>
                  <td className="px-4 py-4 text-ink/65">
                    {new Date(request.requestedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={request.status} />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      {request.status === "pending" && (
                        <ActionButton
                          label="Accept"
                          icon={ShieldCheck}
                          onClick={() => onAction(request, "accepted")}
                        />
                      )}
                      {request.status === "accepted" && (
                        <ActionButton
                          label="Start"
                          icon={PlayCircle}
                          onClick={() => onAction(request, "in_progress")}
                        />
                      )}
                      {request.status === "in_progress" && (
                        <ActionButton
                          label="Complete"
                          icon={CheckCircle2}
                          onClick={() => onAction(request, "completed")}
                        />
                      )}
                      {["pending", "accepted", "in_progress"].includes(request.status) && (
                        <>
                          <ActionButton
                            label="Reject"
                            icon={XCircle}
                            onClick={() => onAction(request, "rejected")}
                            tone="danger"
                          />
                        </>
                      )}
                      {(request.status === "completed" || request.status === "rejected") && (
                        <span className="text-xs font-semibold text-ink/45">No actions</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ActionButton({ label, icon: Icon, onClick, tone = "default" }) {
  const classes =
    tone === "danger"
      ? "border-coral text-coral hover:bg-coral hover:text-white"
      : "border-canopy text-canopy hover:bg-mint";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition ${classes}`}
    >
      <Icon size={14} aria-hidden="true" />
      {label}
    </button>
  );
}

function getStatusActionTitle(status) {
  if (status === "accepted") return "Accept privacy request?";
  if (status === "in_progress") return "Start processing request?";
  if (status === "completed") return "Complete privacy request?";
  if (status === "rejected") return "Reject privacy request?";
  return "Update privacy request?";
}

function getStatusActionMessage(action) {
  if (!action) return "";

  if (action.status === "completed") {
    return "This marks the workflow as completed and records who processed it.";
  }

  if (action.status === "rejected") {
    return "Provide a rejection reason before confirming this workflow decision.";
  }

  if (action.status === "accepted") {
    return "This marks the request as accepted for company review.";
  }

  return "This marks the request as in progress for company processing.";
}
