import {
  Building2,
  CheckCircle2,
  CircleSlash2,
  PlusCircle,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ConfirmModal } from "../components/ConfirmModal.jsx";
import { DashboardLayout } from "../components/DashboardLayout.jsx";
import { Toast } from "../components/Toast.jsx";
import { useAuth } from "../context/auth-context.js";
import { createConsent, getConsents, withdrawConsent } from "../lib/api.js";
import { getApiErrorMessage } from "../lib/auth.js";
import { userNavItems } from "../lib/navigation.js";

const statusStyles = {
  granted: "border-emerald-200 bg-emerald-50 text-emerald-700",
  withdrawn: "border-ink/10 bg-ink/5 text-ink/55",
};

const purposeTemplates = [
  {
    id: "marketing",
    purpose: "Marketing Communications",
    dataCategory: "Email + Phone",
    description: "Receive promotional communications and product updates",
  },
  {
    id: "recommendations",
    purpose: "Personalized Recommendations",
    dataCategory: "Browsing Activity",
    description: "Improve recommendations based on product and browsing activity",
  },
  {
    id: "analytics",
    purpose: "Analytics",
    dataCategory: "Usage Data",
    description: "Analytics and product improvement",
  },
  {
    id: "third-party",
    purpose: "Third-party Sharing",
    dataCategory: "Contact + Delivery Data",
    description: "Share required details with delivery and service partners",
  },
  {
    id: "custom",
    purpose: "",
    dataCategory: "",
    description: "",
  },
];

const defaultTemplate = purposeTemplates[0];

const buildDefaultForm = (companyId = "") => ({
  companyId,
  purpose: defaultTemplate.purpose,
  dataCategory: defaultTemplate.dataCategory,
  description: defaultTemplate.description,
});

export function ConsentCenterPage() {
  const { demo } = useAuth();
  const demoCompanyId = demo?.company?.id || "";
  const demoCompanyName = demo?.company?.name || "";
  const [consents, setConsents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGranting, setIsGranting] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [selectedConsent, setSelectedConsent] = useState(null);
  const [selectedPurpose, setSelectedPurpose] = useState(defaultTemplate.id);
  const [formData, setFormData] = useState(() => buildDefaultForm(demoCompanyId));
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState(null);
  const [error, setError] = useState("");

  const activeConsents = useMemo(
    () => consents.filter((consent) => consent.status === "granted"),
    [consents],
  );
  const withdrawnConsents = useMemo(
    () => consents.filter((consent) => consent.status === "withdrawn"),
    [consents],
  );

  const loadConsents = useCallback(async () => {
    setError("");
    setIsLoading(true);

    try {
      const response = await getConsents();
      setConsents(response.consents || []);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Unable to load your consent records."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConsents();
  }, [loadConsents]);

  useEffect(() => {
    if (!demoCompanyId) return;

    setFormData((current) =>
      current.companyId ? current : { ...current, companyId: demoCompanyId },
    );
  }, [demoCompanyId]);

  const handlePurposeChange = (event) => {
    const nextTemplate =
      purposeTemplates.find((template) => template.id === event.target.value) || defaultTemplate;

    setSelectedPurpose(nextTemplate.id);
    setFormData((current) => ({
      ...current,
      purpose: nextTemplate.purpose,
      dataCategory: nextTemplate.dataCategory,
      description: nextTemplate.description,
    }));
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleGrantConsent = async (event) => {
    event.preventDefault();
    setFormError("");

    const payload = {
      companyId: formData.companyId.trim(),
      purpose: formData.purpose.trim(),
      dataCategory: formData.dataCategory.trim(),
      description: formData.description.trim(),
    };

    if (!payload.companyId || !payload.purpose || !payload.dataCategory || !payload.description) {
      setFormError("Company ID, purpose, data category, and description are required.");
      return;
    }

    setIsGranting(true);

    try {
      const response = await createConsent(payload);
      setConsents((current) => [
        response.consent,
        ...current.filter((consent) => consent.id !== response.consent.id),
      ]);
      setSelectedPurpose(defaultTemplate.id);
      setFormData(buildDefaultForm(payload.companyId));
      setToast({ type: "success", message: "Consent granted successfully." });
    } catch (grantError) {
      setToast({
        type: "error",
        message: getApiErrorMessage(grantError, "Unable to grant consent."),
      });
    } finally {
      setIsGranting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!selectedConsent) return;

    setIsWithdrawing(true);

    try {
      const response = await withdrawConsent(selectedConsent.id);
      setConsents((current) =>
        current.map((consent) =>
          consent.id === response.consent.id ? response.consent : consent,
        ),
      );
      setSelectedConsent(null);
      setToast({ type: "success", message: "Consent withdrawn successfully." });
    } catch (withdrawError) {
      setToast({
        type: "error",
        message: getApiErrorMessage(withdrawError, "Unable to withdraw consent."),
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <DashboardLayout
      title="Consent Center"
      subtitle="Grant, review, and withdraw consent records linked to your account."
      navItems={userNavItems}
    >
      <Toast toast={toast} onDismiss={() => setToast(null)} />
      <ConfirmModal
        isOpen={Boolean(selectedConsent)}
        isLoading={isWithdrawing}
        title="Withdraw consent?"
        message={
          selectedConsent
            ? `This will withdraw consent for ${selectedConsent.purpose}.`
            : ""
        }
        confirmLabel="Withdraw"
        onCancel={() => setSelectedConsent(null)}
        onConfirm={handleWithdraw}
      />

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <SummaryCard label="Total Consents" value={`${consents.length}`} icon={ShieldCheck} />
        <SummaryCard label="Active" value={`${activeConsents.length}`} icon={CheckCircle2} />
        <SummaryCard
          label="Withdrawn"
          value={`${withdrawnConsents.length}`}
          icon={CircleSlash2}
        />
      </section>

      <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-canopy/10 text-canopy">
            <PlusCircle size={20} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Grant Consent</h2>
            <p className="mt-1 text-sm leading-6 text-ink/60">
              Create a consent record for a company and processing purpose.
            </p>
          </div>
        </div>

        <form className="mt-5 grid gap-4 lg:grid-cols-2" onSubmit={handleGrantConsent}>
          <label className="grid gap-2 text-sm font-semibold text-ink">
            Company ID
            <input
              name="companyId"
              value={formData.companyId}
              onChange={handleFormChange}
              className="rounded-md border border-ink/10 bg-[#fbfdfb] px-3 py-3 text-sm font-medium outline-none transition focus:border-canopy focus:ring-4 focus:ring-mint"
              placeholder="Company account ID"
              autoComplete="off"
            />
            {demoCompanyName && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-ink/55">
                <Building2 size={13} aria-hidden="true" />
                Demo company: {demoCompanyName}
              </span>
            )}
          </label>

          <label className="grid gap-2 text-sm font-semibold text-ink">
            Purpose
            <select
              value={selectedPurpose}
              onChange={handlePurposeChange}
              className="rounded-md border border-ink/10 bg-[#fbfdfb] px-3 py-3 text-sm font-medium outline-none transition focus:border-canopy focus:ring-4 focus:ring-mint"
            >
              {purposeTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.id === "custom" ? "Custom Purpose" : template.purpose}
                </option>
              ))}
            </select>
          </label>

          {selectedPurpose === "custom" && (
            <label className="grid gap-2 text-sm font-semibold text-ink">
              Custom Purpose
              <input
                name="purpose"
                value={formData.purpose}
                onChange={handleFormChange}
                maxLength={140}
                className="rounded-md border border-ink/10 bg-[#fbfdfb] px-3 py-3 text-sm font-medium outline-none transition focus:border-canopy focus:ring-4 focus:ring-mint"
                placeholder="Purpose name"
              />
            </label>
          )}

          <label className="grid gap-2 text-sm font-semibold text-ink">
            Data Category
            <input
              name="dataCategory"
              value={formData.dataCategory}
              onChange={handleFormChange}
              maxLength={140}
              className="rounded-md border border-ink/10 bg-[#fbfdfb] px-3 py-3 text-sm font-medium outline-none transition focus:border-canopy focus:ring-4 focus:ring-mint"
              placeholder="Data category"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-ink lg:col-span-2">
            Description
            <textarea
              name="description"
              value={formData.description}
              onChange={handleFormChange}
              maxLength={1000}
              className="min-h-24 resize-y rounded-md border border-ink/10 bg-[#fbfdfb] px-3 py-3 text-sm font-medium outline-none transition focus:border-canopy focus:ring-4 focus:ring-mint"
              placeholder="Describe what you are consenting to"
            />
          </label>

          {formError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 lg:col-span-2">
              {formError}
            </div>
          )}

          <div className="lg:col-span-2">
            <button
              type="submit"
              disabled={isGranting}
              className="inline-flex items-center gap-2 rounded-md bg-canopy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink disabled:opacity-60"
            >
              <PlusCircle size={16} aria-hidden="true" />
              {isGranting ? "Granting..." : "Grant Consent"}
            </button>
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-lg border border-ink/10 bg-white shadow-sm">
        <div className="border-b border-ink/10 p-5">
          <h2 className="text-lg font-semibold">Active Consents</h2>
          <p className="mt-1 text-sm leading-6 text-ink/60">
            Currently granted consent records that can be withdrawn.
          </p>
        </div>

        {isLoading ? (
          <div className="p-5 text-sm font-medium text-ink/60">Loading consents...</div>
        ) : error ? (
          <div className="m-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : activeConsents.length === 0 ? (
          <EmptyState
            title="No active consents"
            message="Grant consent for a company and it will appear here."
          />
        ) : (
          <ConsentTable consents={activeConsents} onWithdraw={setSelectedConsent} />
        )}
      </section>

      <section className="mt-6 rounded-lg border border-ink/10 bg-white shadow-sm">
        <div className="border-b border-ink/10 p-5">
          <h2 className="text-lg font-semibold">Withdrawn History</h2>
          <p className="mt-1 text-sm leading-6 text-ink/60">
            Previously granted consent records that have been withdrawn.
          </p>
        </div>

        {isLoading ? (
          <div className="p-5 text-sm font-medium text-ink/60">Loading history...</div>
        ) : error ? null : withdrawnConsents.length === 0 ? (
          <div className="p-5 text-sm text-ink/60">No withdrawn consent records.</div>
        ) : (
          <ConsentTable consents={withdrawnConsents} />
        )}
      </section>
    </DashboardLayout>
  );
}

function ConsentTable({ consents, onWithdraw }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[940px] border-collapse text-left text-sm">
        <thead className="bg-[#fbfdfb] text-xs uppercase tracking-[0.14em] text-ink/50">
          <tr>
            <th className="px-5 py-3 font-semibold">Purpose</th>
            <th className="px-5 py-3 font-semibold">Data Category</th>
            <th className="px-5 py-3 font-semibold">Description</th>
            <th className="px-5 py-3 font-semibold">Company</th>
            <th className="px-5 py-3 font-semibold">Status</th>
            <th className="px-5 py-3 font-semibold">Updated</th>
            <th className="px-5 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {consents.map((consent) => (
            <tr key={consent.id} className="border-t border-ink/10">
              <td className="px-5 py-4 font-semibold">{consent.purpose}</td>
              <td className="px-5 py-4 text-ink/70">{consent.dataCategory}</td>
              <td className="px-5 py-4 text-ink/65">{consent.description}</td>
              <td className="px-5 py-4 text-ink/55">{consent.companyId}</td>
              <td className="px-5 py-4">
                <span
                  className={`rounded-md border px-2.5 py-1 text-xs font-semibold uppercase ${statusStyles[consent.status]}`}
                >
                  {consent.status}
                </span>
              </td>
              <td className="px-5 py-4 text-ink/65">
                {new Date(consent.updatedAt || consent.grantedAt).toLocaleDateString()}
              </td>
              <td className="px-5 py-4">
                {consent.status === "granted" && onWithdraw ? (
                  <button
                    type="button"
                    onClick={() => onWithdraw(consent)}
                    className="rounded-md border border-coral px-3 py-2 text-xs font-semibold text-coral transition hover:bg-coral hover:text-white"
                  >
                    Withdraw
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-ink/45">No actions</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ title, message }) {
  return (
    <div className="p-8 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-mint text-canopy">
        <ShieldCheck size={24} aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink/60">{message}</p>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon }) {
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
