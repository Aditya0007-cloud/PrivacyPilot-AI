export const deletionStatusLabels = {
  pending: "Pending",
  accepted: "Accepted",
  in_progress: "In Progress",
  completed: "Completed",
  rejected: "Rejected",
};

export const deletionStatusStyles = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  accepted: "border-sky-200 bg-sky-50 text-sky-700",
  in_progress: "border-blue-200 bg-blue-50 text-blue-700",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-red-200 bg-red-50 text-red-700",
};

export const activeDeletionStatuses = new Set(["pending", "accepted", "in_progress"]);

export const requestTypeLabels = {
  data_deletion: "Data Deletion",
  data_access: "Data Access",
  data_correction: "Data Correction",
  processing_information: "Processing Information",
};

export const requestTimelineSteps = [
  { status: "pending", label: "Request submitted" },
  { status: "accepted", label: "Company reviewing" },
  { status: "in_progress", label: "Processing" },
  { status: "completed", label: "Completed" },
];
