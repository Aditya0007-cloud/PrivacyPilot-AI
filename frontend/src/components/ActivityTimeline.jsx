const actionLabels = {
  CONSENT_GRANTED: "Consent granted",
  CONSENT_WITHDRAWN: "Consent withdrawn",
  DELETION_REQUEST_CREATED: "Deletion request created",
  DELETION_REQUEST_STARTED: "Deletion request started",
  DELETION_REQUEST_COMPLETED: "Deletion request completed",
  DELETION_REQUEST_REJECTED: "Deletion request rejected",
  DATA_RIGHTS_REQUEST_SUBMITTED: "Privacy request submitted",
  DATA_RIGHTS_REQUEST_ACCEPTED: "Privacy request accepted",
  DATA_RIGHTS_REQUEST_PROCESSING_STARTED: "Privacy request processing started",
  DATA_RIGHTS_REQUEST_COMPLETED: "Privacy request completed",
  DATA_RIGHTS_REQUEST_REJECTED: "Privacy request rejected",
  POLICY_ANALYZED: "Privacy policy analyzed",
};

export function ActivityTimeline({ activities }) {
  if (!activities?.length) {
    return <p className="text-sm text-ink/60">No recent activity.</p>;
  }

  return (
    <div className="divide-y divide-ink/10">
      {activities.map((activity) => (
        <div key={activity.id} className="flex gap-3 py-3">
          <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-canopy" />
          <div>
            <p className="text-sm font-semibold">
              {actionLabels[activity.action] || activity.action}
            </p>
            <p className="mt-1 text-xs text-ink/55">
              {activity.resourceType} · {activity.status || "recorded"} ·{" "}
              {new Date(activity.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
