import { ClipboardCheck, FileText, Info, PencilLine, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ConfirmModal } from "../components/ConfirmModal.jsx";
import { DashboardLayout } from "../components/DashboardLayout.jsx";
import { StatusBadge } from "../components/StatusBadge.jsx";
import { Toast } from "../components/Toast.jsx";
import { useAuth } from "../context/auth-context.js";
import { createDeletionRequest, getDeletionRequests } from "../lib/api.js";
import { getApiErrorMessage } from "../lib/auth.js";
import {
  activeDeletionStatuses,
  deletionStatusLabels,
  requestTimelineSteps,
  requestTypeLabels,
} from "../lib/status.js";
import { userNavItems } from "../lib/navigation.js";

const requestTypeOptions = [
  {
    value: "data_deletion",
    label: "Request deletion of my data",
    icon: Trash2,
  },
  {
    value: "data_access",
    label: "Request access to my personal data",
    icon: FileText,
  },
  {
    value: "data_correction",
    label: "Request correction of my personal data",
    icon: PencilLine,
  },
  {
    value: "processing_information",
    label: "Ask how my data is being processed",
    icon: Info,
  },
];

export function DataDeletionPage() {
  const { demo } = useAuth();
  const [requests, setRequests] = useState([]);
  const [companyId, setCompanyId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [requestType, setRequestType] = useState("data_deletion");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState("");

  const activeRequest = useMemo(
    () => requests.find((request) => activeDeletionStatuses.has(request.status)),
    [requests],
  );

  const loadRequests = async () => {
    setError("");
    setIsLoading(true);

    try {
      const response = await getDeletionRequests();
      setRequests(response.requests || response.deletionRequests || []);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Unable to load privacy requests."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    if (demo?.company?.id) {
      setCompanyId((current) => current || demo.company.id);
    }
  }, [demo]);

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const response = await createDeletionRequest({
        companyId,
        customerId,
        requestType,
        description,
      });
      const createdRequest = response.request || response.deletionRequest;

      setRequests((current) => [createdRequest, ...current]);
      setCustomerId("");
      setDescription("");
      setShowConfirm(false);
      setToast({ type: "success", message: "Privacy request submitted." });
    } catch (submitError) {
      setToast({
        type: "error",
        message: getApiErrorMessage(submitError, "Unable to submit privacy request."),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout
      title="My Privacy Requests"
      subtitle="Submit and track data-rights requests against a company policy workflow."
      navItems={userNavItems}
    >
      <Toast toast={toast} onDismiss={() => setToast(null)} />
      <ConfirmModal
        isOpen={showConfirm}
        isLoading={isSubmitting}
        title="Submit privacy request?"
        message="This creates a real database workflow request for the company to review."
        confirmLabel="Submit Request"
        onCancel={() => setShowConfirm(false)}
        onConfirm={handleSubmit}
      />

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <article className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
          <div className="grid h-11 w-11 place-items-center rounded-md bg-coral/10 text-coral">
            <ClipboardCheck size={22} aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Create a data-rights request</h2>
          <p className="mt-2 text-sm leading-6 text-ink/65">
            Enter your customer or data principal ID and choose the privacy request
            you want the company to process.
          </p>

          <form
            className="mt-5 grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              setShowConfirm(true);
            }}
          >
            <label className="grid gap-2 text-sm font-semibold text-ink">
              Company ID
              <input
                required
                value={companyId}
                onChange={(event) => setCompanyId(event.target.value)}
                className="h-11 rounded-md border border-ink/10 bg-[#fbfdfb] px-3 text-sm font-medium outline-none transition focus:border-canopy focus:ring-4 focus:ring-mint"
                placeholder="MongoDB company user ID"
              />
              {demo?.company?.id === companyId && (
                <span className="text-xs font-medium text-canopy">
                  Demo company: {demo.company.name}
                </span>
              )}
            </label>

            <label className="grid gap-2 text-sm font-semibold text-ink">
              Customer / Data Principal ID
              <input
                required
                minLength={3}
                maxLength={50}
                value={customerId}
                onChange={(event) => setCustomerId(event.target.value)}
                className="h-11 rounded-md border border-ink/10 bg-[#fbfdfb] px-3 text-sm font-medium uppercase outline-none transition focus:border-canopy focus:ring-4 focus:ring-mint"
                placeholder="CUST-12345"
              />
            </label>

            <fieldset className="grid gap-2">
              <legend className="text-sm font-semibold text-ink">Request type</legend>
              <div className="grid gap-2">
                {requestTypeOptions.map((option) => (
                  <RequestTypeOption
                    key={option.value}
                    option={option}
                    selected={requestType === option.value}
                    onSelect={() => setRequestType(option.value)}
                  />
                ))}
              </div>
            </fieldset>

            <label className="grid gap-2 text-sm font-semibold text-ink">
              Description
              <textarea
                value={description}
                maxLength={1000}
                onChange={(event) => setDescription(event.target.value)}
                className="min-h-32 resize-y rounded-md border border-ink/10 bg-[#fbfdfb] px-3 py-3 text-sm font-medium outline-none transition focus:border-canopy focus:ring-4 focus:ring-mint"
                placeholder="Optional context for the company privacy team."
              />
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-canopy px-4 py-3 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              Submit privacy request
            </button>
          </form>
        </article>

        <article className="rounded-lg border border-ink/10 bg-white shadow-sm">
          <div className="border-b border-ink/10 p-5">
            <h2 className="text-lg font-semibold">Request Status</h2>
            <p className="mt-1 text-sm leading-6 text-ink/60">
              These statuses are loaded from the backend and update when the company acts.
            </p>
          </div>

          {activeRequest && (
            <div className="m-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              Active privacy request:{" "}
              <strong>{deletionStatusLabels[activeRequest.status]}</strong> for{" "}
              <strong>{activeRequest.customerId}</strong>
            </div>
          )}

          {isLoading ? (
            <div className="p-5 text-sm font-medium text-ink/60">Loading requests...</div>
          ) : error ? (
            <div className="m-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </div>
          ) : requests.length === 0 ? (
            <div className="p-8 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-mint text-canopy">
                <ClipboardCheck size={24} aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No privacy requests yet</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink/60">
                Submitted requests will appear here with their review timeline.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-ink/10">
              {requests.map((request) => (
                <RequestStatusCard key={request.id} request={request} />
              ))}
            </div>
          )}
        </article>
      </section>
    </DashboardLayout>
  );
}

function RequestTypeOption({ option, selected, onSelect }) {
  const Icon = option.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-center gap-3 rounded-md border px-3 py-3 text-left text-sm font-semibold transition ${
        selected
          ? "border-canopy bg-mint text-canopy"
          : "border-ink/10 bg-[#fbfdfb] text-ink/70 hover:border-canopy"
      }`}
    >
      <Icon size={17} aria-hidden="true" />
      {option.label}
    </button>
  );
}

function RequestStatusCard({ request }) {
  return (
    <section className="p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-semibold text-canopy">{request.requestNumber}</p>
          <h3 className="mt-1 text-base font-semibold">
            {requestTypeLabels[request.requestType] || request.requestType}
          </h3>
          <p className="mt-1 text-sm text-ink/60">Customer ID: {request.customerId}</p>
        </div>
        <StatusBadge status={request.status} />
      </div>

      {request.description && (
        <p className="mt-4 rounded-md bg-[#fbfdfb] px-3 py-2 text-sm leading-6 text-ink/65">
          {request.description}
        </p>
      )}

      <RequestTimeline request={request} />

      {request.rejectionReason && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Rejected: {request.rejectionReason}
        </div>
      )}
      {request.completionNote && (
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Completed: {request.completionNote}
        </div>
      )}
      {!request.rejectionReason && !request.completionNote && request.companyResponse && (
        <div className="mt-4 rounded-md border border-canopy/20 bg-mint px-3 py-2 text-sm text-canopy">
          Company response: {request.companyResponse}
        </div>
      )}
    </section>
  );
}

function RequestTimeline({ request }) {
  const statusIndex = requestTimelineSteps.findIndex((step) => step.status === request.status);
  const finalIndex =
    request.status === "rejected"
      ? Math.max(
          requestTimelineSteps.findIndex((step) => step.status === "accepted"),
          statusIndex,
        )
      : statusIndex;

  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-4">
      {requestTimelineSteps.map((step, index) => {
        const isDone = request.status === "rejected" ? index <= finalIndex : index <= statusIndex;
        const isRejectedMarker = request.status === "rejected" && index === finalIndex;

        return (
          <div key={step.status} className="flex items-center gap-2 text-sm">
            <span
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-bold ${
                isRejectedMarker
                  ? "border-red-200 bg-red-50 text-red-700"
                  : isDone
                    ? "border-canopy bg-canopy text-white"
                    : "border-ink/15 bg-white text-ink/35"
              }`}
            >
              {isRejectedMarker ? "x" : isDone ? "✓" : "○"}
            </span>
            <span className={isDone ? "font-semibold text-ink" : "text-ink/50"}>
              {isRejectedMarker ? "Rejected" : step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
