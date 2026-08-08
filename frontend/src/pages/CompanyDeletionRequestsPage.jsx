import { CheckCircle2, ClipboardCheck, PlayCircle, ShieldCheck, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { ConfirmModal } from "../components/ConfirmModal.jsx";
import { DashboardLayout } from "../components/DashboardLayout.jsx";
import { StatusBadge } from "../components/StatusBadge.jsx";
import { Toast } from "../components/Toast.jsx";
import { getDeletionRequests, updateDeletionRequestStatus } from "../lib/api.js";
import { getApiErrorMessage } from "../lib/auth.js";
import { companyNavItems } from "../lib/navigation.js";
import { requestTypeLabels } from "../lib/status.js";

const statusActions = {
  pending: [
    { status: "accepted", label: "Accept", icon: ShieldCheck },
    { status: "rejected", label: "Reject", icon: XCircle, tone: "danger" },
  ],
  accepted: [
    { status: "in_progress", label: "Start Processing", icon: PlayCircle },
    { status: "rejected", label: "Reject", icon: XCircle, tone: "danger" },
  ],
  in_progress: [
    { status: "completed", label: "Complete", icon: CheckCircle2 },
    { status: "rejected", label: "Reject", icon: XCircle, tone: "danger" },
  ],
};

export function CompanyDeletionRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [companyNote, setCompanyNote] = useState("");
  const [toast, setToast] = useState(null);
  const [error, setError] = useState("");

  const loadRequests = async () => {
    setError("");
    setIsLoading(true);

    try {
      const response = await getDeletionRequests();
      setRequests(response.requests || response.deletionRequests || []);
      setSummary(response.summary);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Unable to load privacy requests."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const updateStatus = async () => {
    if (!pendingAction) return;

    setIsUpdating(true);

    try {
      const payload = { status: pendingAction.status };

      if (pendingAction.status === "rejected") {
        payload.rejectionReason = companyNote;
      }

      if (pendingAction.status === "completed") {
        payload.completionNote = companyNote;
      }

      if (pendingAction.status === "accepted" && companyNote.trim()) {
        payload.companyResponse = companyNote;
      }

      const response = await updateDeletionRequestStatus(pendingAction.request.id, payload);
      const updatedRequest = response.request || response.deletionRequest;

      setRequests((current) =>
        current.map((request) =>
          request.id === updatedRequest.id ? updatedRequest : request,
        ),
      );
      setPendingAction(null);
      setCompanyNote("");
      setToast({ type: "success", message: "Privacy request updated." });
      await loadRequests();
    } catch (updateError) {
      setToast({
        type: "error",
        message: getApiErrorMessage(updateError, "Unable to update privacy request."),
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <DashboardLayout
      title="Data Rights Requests"
      subtitle="Review, accept, reject, process, and complete user privacy requests."
      navItems={companyNavItems}
    >
      <Toast toast={toast} onDismiss={() => setToast(null)} />
      <ConfirmModal
        isOpen={Boolean(pendingAction)}
        isLoading={isUpdating}
        title={getActionTitle(pendingAction)}
        message={getActionMessage(pendingAction)}
        confirmLabel="Confirm"
        onCancel={() => {
          setPendingAction(null);
          setCompanyNote("");
        }}
        onConfirm={updateStatus}
      >
        {pendingAction?.status === "rejected" && (
          <ActionNote
            required
            label="Rejection reason"
            value={companyNote}
            onChange={setCompanyNote}
            placeholder="Explain why this request cannot be fulfilled."
          />
        )}
        {pendingAction?.status === "completed" && (
          <ActionNote
            label="Completion note"
            value={companyNote}
            onChange={setCompanyNote}
            placeholder="Summarize what was completed for the customer."
          />
        )}
        {pendingAction?.status === "accepted" && (
          <ActionNote
            label="Company response"
            value={companyNote}
            onChange={setCompanyNote}
            placeholder="Optional note for the requester."
          />
        )}
      </ConfirmModal>

      <section className="grid gap-4 md:grid-cols-5">
        <SummaryCard label="Pending" value={summary?.pending ?? 0} />
        <SummaryCard label="Accepted" value={summary?.accepted ?? 0} />
        <SummaryCard label="In Progress" value={summary?.inProgress ?? 0} />
        <SummaryCard label="Completed" value={summary?.completed ?? 0} />
        <SummaryCard label="Rejected" value={summary?.rejected ?? 0} />
      </section>

      <section className="mt-6 rounded-lg border border-ink/10 bg-white shadow-sm">
        <div className="border-b border-ink/10 p-5">
          <h2 className="text-lg font-semibold">Incoming Request Queue</h2>
          <p className="mt-1 text-sm leading-6 text-ink/60">
            Requests are scoped to your company and move through a controlled workflow.
          </p>
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
        ) : requests.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-mint text-canopy">
              <ClipboardCheck size={24} aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No privacy requests</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink/60">
              User data-rights requests will appear here when submitted.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
              <thead className="bg-[#fbfdfb] text-xs uppercase tracking-[0.14em] text-ink/50">
                <tr>
                  <th className="px-5 py-3 font-semibold">Request ID</th>
                  <th className="px-5 py-3 font-semibold">Customer ID</th>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold">Submitted</th>
                  <th className="px-5 py-3 font-semibold">Description</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id} className="border-t border-ink/10 align-top">
                    <td className="px-5 py-4 font-semibold">{request.requestNumber}</td>
                    <td className="px-5 py-4 text-ink/70">{request.customerId || "Not provided"}</td>
                    <td className="px-5 py-4 text-ink/70">
                      {requestTypeLabels[request.requestType] || request.requestType}
                    </td>
                    <td className="px-5 py-4 text-ink/65">
                      {new Date(request.requestedAt || request.createdAt).toLocaleDateString()}
                    </td>
                    <td className="max-w-sm px-5 py-4 text-ink/65">
                      {request.description || "No description provided."}
                      {request.companyResponse && (
                        <p className="mt-2 text-xs font-semibold text-canopy">
                          Company response: {request.companyResponse}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={request.status} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        {(statusActions[request.status] || []).map((action) => (
                          <ActionButton
                            key={action.status}
                            label={action.label}
                            icon={action.icon}
                            tone={action.tone}
                            onClick={() => {
                              setPendingAction({ request, status: action.status });
                              setCompanyNote("");
                            }}
                          />
                        ))}
                        {!statusActions[request.status] && (
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
    </DashboardLayout>
  );
}

function SummaryCard({ label, value }) {
  return (
    <article className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
      <p className="text-sm text-ink/55">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </article>
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

function ActionNote({ label, value, onChange, placeholder, required = false }) {
  return (
    <label className="mt-4 grid gap-2 text-sm font-semibold text-ink">
      {label}
      <textarea
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-24 resize-y rounded-md border border-ink/10 bg-[#fbfdfb] px-3 py-3 text-sm font-medium outline-none transition focus:border-canopy focus:ring-4 focus:ring-mint"
        placeholder={placeholder}
      />
    </label>
  );
}

function getActionTitle(action) {
  if (!action) return "Update privacy request?";
  if (action.status === "accepted") return "Accept privacy request?";
  if (action.status === "in_progress") return "Start processing?";
  if (action.status === "completed") return "Complete privacy request?";
  if (action.status === "rejected") return "Reject privacy request?";
  return "Update privacy request?";
}

function getActionMessage(action) {
  if (!action) return "";
  if (action.status === "accepted") {
    return "This marks the request as accepted for company review and creates an audit event.";
  }
  if (action.status === "in_progress") {
    return "This moves the accepted request into active processing.";
  }
  if (action.status === "completed") {
    return "This closes the workflow and records your completion note if provided.";
  }
  if (action.status === "rejected") {
    return "A rejection reason is required and will be visible to the requester.";
  }
  return "This changes the request workflow status.";
}
