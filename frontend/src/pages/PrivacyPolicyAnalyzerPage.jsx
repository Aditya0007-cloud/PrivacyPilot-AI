import { FileText, Loader2, UploadCloud, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { DashboardLayout } from "../components/DashboardLayout.jsx";
import { PrivacyPolicyAnalysisResult } from "../components/PrivacyPolicyAnalysisResult.jsx";
import { analyzePrivacyPolicy, getLatestPrivacyPolicy } from "../lib/api.js";
import { getApiErrorMessage } from "../lib/auth.js";
import { companyNavItems } from "../lib/navigation.js";

export function PrivacyPolicyAnalyzerPage() {
  const inputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingLatest, setIsLoadingLatest] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    let mounted = true;

    getLatestPrivacyPolicy()
      .then(({ privacyPolicy }) => {
        if (mounted) {
          setAnalysis(privacyPolicy);
        }
      })
      .catch(() => {
        if (mounted) {
          setError("Unable to load the latest policy analysis.");
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoadingLatest(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const chooseFile = (file) => {
    setError("");

    if (!file) {
      return;
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setSelectedFile(null);
      setError("Please select a PDF file.");
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    chooseFile(event.dataTransfer.files?.[0]);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError("Select a privacy policy PDF before analyzing.");
      return;
    }

    setError("");
    setIsAnalyzing(true);
    setUploadProgress(0);

    try {
      const response = await analyzePrivacyPolicy(selectedFile, (progressEvent) => {
        if (!progressEvent.total) return;
        setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
      });

      setAnalysis(response.privacyPolicy);
      setSelectedFile(null);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (analyzeError) {
      setError(getApiErrorMessage(analyzeError, "Unable to analyze this privacy policy."));
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <DashboardLayout
      title="Privacy Policy Analyzer"
      subtitle="Upload a privacy policy PDF and run an AI-assisted DPDP readiness assessment."
      navItems={companyNavItems}
    >
      <div className="grid gap-6">
        <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
          <div
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`grid place-items-center rounded-lg border-2 border-dashed px-5 py-10 text-center transition ${
              isDragging
                ? "border-canopy bg-mint"
                : "border-ink/15 bg-[#fbfdfb] hover:border-canopy"
            }`}
          >
            <div className="grid h-12 w-12 place-items-center rounded-md bg-canopy/10 text-canopy">
              <UploadCloud size={24} aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">Upload privacy policy PDF</h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-ink/60">
              Drop a PDF here or browse from your device. Files are analyzed on
              the backend so your AI provider key stays private.
            </p>
            <input
              ref={inputRef}
              className="hidden"
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => chooseFile(event.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-5 rounded-md border border-canopy px-4 py-2 text-sm font-semibold text-canopy transition hover:bg-mint"
            >
              Browse file
            </button>
          </div>

          {selectedFile && (
            <div className="mt-4 flex flex-col justify-between gap-3 rounded-lg border border-ink/10 bg-[#fbfdfb] p-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-md bg-coral/10 text-coral">
                  <FileText size={20} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{selectedFile.name}</p>
                  <p className="text-xs text-ink/55">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB selected
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-ink/10 px-3 py-2 text-sm font-semibold text-ink/70 transition hover:border-coral hover:text-coral"
              >
                <X size={16} aria-hidden="true" />
                Remove
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={!selectedFile || isAnalyzing}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-canopy px-4 py-3 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isAnalyzing && <Loader2 className="animate-spin" size={17} aria-hidden="true" />}
              {isAnalyzing ? "Analyzing Policy..." : "Analyze Policy"}
            </button>
            {isAnalyzing && (
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink/10">
                <div
                  className="h-full rounded-full bg-canopy transition-all"
                  style={{ width: `${Math.max(uploadProgress, 8)}%` }}
                />
              </div>
            )}
          </div>
        </section>

        {isLoadingLatest ? (
          <div className="rounded-lg border border-ink/10 bg-white p-5 text-sm font-medium text-ink/60 shadow-sm">
            Loading latest analysis...
          </div>
        ) : (
          <PrivacyPolicyAnalysisResult privacyPolicy={analysis} />
        )}
      </div>
    </DashboardLayout>
  );
}
