import { AlertTriangle, CheckCircle2, FileText, ShieldAlert } from "lucide-react";

const riskStyles = {
  Low: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Medium: "border-amber-200 bg-amber-50 text-amber-700",
  High: "border-red-200 bg-red-50 text-red-700",
};

export function PrivacyPolicyAnalysisResult({ privacyPolicy }) {
  if (!privacyPolicy) {
    return null;
  }

  const { analysis } = privacyPolicy;

  return (
    <section className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-5">
        <SummaryMetric
          label="Policy Status"
          value="Analyzed"
          icon={CheckCircle2}
        />
        <SummaryMetric
          label="Compliance Score"
          value={`${privacyPolicy.complianceScore} / 100`}
          icon={CheckCircle2}
        />
        <SummaryMetric
          label="Risk Level"
          value={privacyPolicy.riskLevel}
          icon={ShieldAlert}
          valueClassName={`inline-flex rounded-md border px-2.5 py-1 text-base ${riskStyles[privacyPolicy.riskLevel]}`}
        />
        <SummaryMetric
          label="Analyzed File"
          value={privacyPolicy.originalFileName}
          icon={FileText}
        />
        <SummaryMetric
          label="Upload Date"
          value={new Date(privacyPolicy.createdAt).toLocaleDateString()}
          icon={FileText}
        />
      </div>

      <AnalysisSection title="Summary">
        <p className="text-sm leading-7 text-ink/70">{analysis.summary}</p>
      </AnalysisSection>

      <ConsentCoverageTable items={analysis.dataConsentCoverage || []} />

      <div className="grid gap-5 lg:grid-cols-2">
        <AnalysisList title="Personal Data Collected" items={analysis.personalDataCollected} />
        <AnalysisList title="Processing Purposes" items={analysis.processingPurposes} />
        <AnalysisList title="Third Parties" items={analysis.thirdParties} />
        <AnalysisList title="Retention Information" items={analysis.retentionInformation} />
        <AnalysisSection title="Consent Mechanism">
          <p className="text-sm leading-7 text-ink/70">{analysis.consentMechanism}</p>
        </AnalysisSection>
        <AnalysisList title="User Rights" items={analysis.userRights} />
        <AnalysisSection title="Grievance Mechanism">
          <p className="text-sm leading-7 text-ink/70">{analysis.grievanceMechanism}</p>
        </AnalysisSection>
        <AnalysisList title="Compliance Gaps" items={analysis.complianceGaps} />
      </div>

      <AnalysisList title="Recommendations" items={analysis.recommendations} />

      <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
        <AlertTriangle className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
        <p>
          AI-assisted assessment for informational purposes only. This does not
          constitute legal advice or a legal certification of DPDP compliance.
        </p>
      </div>
    </section>
  );
}

function ConsentCoverageTable({ items }) {
  if (!items.length) {
    return null;
  }

  return (
    <AnalysisSection title="Data & Consent Coverage">
      <div className="overflow-hidden rounded-lg border border-ink/10">
        <div className="hidden grid-cols-[1fr_0.8fr_1.4fr] bg-[#f6faf7] px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink/50 md:grid">
          <span>Data</span>
          <span>Detected</span>
          <span>Consent Finding</span>
        </div>
        <div className="divide-y divide-ink/10">
          {items.map((item) => (
            <div
              key={item.dataCategory}
              className="grid gap-2 px-4 py-3 text-sm text-ink/70 md:grid-cols-[1fr_0.8fr_1.4fr]"
            >
              <div>
                <p className="font-semibold text-ink">{item.dataCategory}</p>
                <p className="mt-1 text-xs leading-5 text-ink/55">{item.evidence}</p>
              </div>
              <div>
                <span
                  className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${
                    item.detected
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-ink/10 bg-ink/5 text-ink/55"
                  }`}
                >
                  {item.detected ? "Collected" : "Not found"}
                </span>
              </div>
              <p className="leading-6">{item.consentStatus}</p>
            </div>
          ))}
        </div>
      </div>
    </AnalysisSection>
  );
}

function SummaryMetric({ label, value, icon: Icon, valueClassName }) {
  return (
    <article className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
      <div className="mb-4 grid h-10 w-10 place-items-center rounded-md bg-canopy/10 text-canopy">
        <Icon size={20} aria-hidden="true" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/50">{label}</p>
      <p className={`mt-2 text-xl font-semibold ${valueClassName || ""}`}>{value}</p>
    </article>
  );
}

function AnalysisSection({ title, children }) {
  return (
    <article className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-canopy">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </article>
  );
}

function AnalysisList({ title, items }) {
  return (
    <AnalysisSection title={title}>
      {items.length > 0 ? (
        <ul className="grid gap-2 text-sm leading-6 text-ink/70">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-canopy" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm leading-7 text-ink/60">Not found</p>
      )}
    </AnalysisSection>
  );
}
