import { Bot, Send, Sparkles, Trash2, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { DashboardLayout } from "../components/DashboardLayout.jsx";
import { Toast } from "../components/Toast.jsx";
import { useAuth } from "../context/auth-context.js";
import { chatWithPrivacyAssistant } from "../lib/api.js";
import { getApiErrorMessage } from "../lib/auth.js";
import { companyNavItems, userNavItems } from "../lib/navigation.js";

const suggestedQuestions = [
  "Does this company collect my phone number?",
  "Why is my email address collected?",
  "Who can my data be shared with?",
  "How long is my data retained?",
  "How can I withdraw my consent?",
];

export function PrivacyAssistantPage() {
  const { demo, user } = useAuth();
  const [companyInput, setCompanyInput] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [companyIds, setCompanyIds] = useState([]);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const canAsk = selectedCompanyId && question.trim() && !isLoading;

  useEffect(() => {
    const defaultCompanyId = user.role === "company" ? user.id : demo?.company?.id;

    if (!defaultCompanyId) return;

    setCompanyIds((current) =>
      current.includes(defaultCompanyId) ? current : [defaultCompanyId, ...current],
    );
    setSelectedCompanyId((current) => current || defaultCompanyId);
  }, [demo, user]);

  const selectedCompanyLabel = useMemo(() => {
    if (selectedCompanyId && selectedCompanyId === user.id) {
      return `${user.name} (${selectedCompanyId})`;
    }

    if (selectedCompanyId && selectedCompanyId === demo?.company?.id) {
      return `${demo.company.name} (${selectedCompanyId})`;
    }

    return selectedCompanyId || "No company selected";
  }, [demo, selectedCompanyId, user]);

  const addCompany = () => {
    const trimmedCompanyId = companyInput.trim();

    if (!trimmedCompanyId) {
      setToast({ type: "error", message: "Enter a company ID first." });
      return;
    }

    setCompanyIds((current) =>
      current.includes(trimmedCompanyId) ? current : [...current, trimmedCompanyId],
    );
    setSelectedCompanyId(trimmedCompanyId);
    setCompanyInput("");
  };

  const askQuestion = async (questionText = question) => {
    const trimmedQuestion = questionText.trim();

    if (!selectedCompanyId) {
      setToast({ type: "error", message: "Select a company before asking." });
      return;
    }

    if (!trimmedQuestion) {
      setToast({ type: "error", message: "Enter a question first." });
      return;
    }

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmedQuestion,
    };

    setMessages((current) => [...current, userMessage]);
    setQuestion("");
    setIsLoading(true);

    try {
      const { response } = await chatWithPrivacyAssistant({
        companyId: selectedCompanyId,
        question: trimmedQuestion,
      });

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.answer,
          confidence: response.confidence,
          source: response.source,
          notFound: response.notFound,
        },
      ]);
    } catch (assistantError) {
      setToast({
        type: "error",
        message: getApiErrorMessage(assistantError, "Unable to answer this question."),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout
      title="PrivacyPilot AI Assistant"
      subtitle="Ask questions about how your data is handled."
      navItems={user.role === "company" ? companyNavItems : userNavItems}
    >
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      <section className="grid min-h-[640px] gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Company Selector</h2>
          <p className="mt-2 text-sm leading-6 text-ink/60">
            Select a company with a previously uploaded privacy policy.
          </p>

          <div className="mt-5 grid gap-3">
            <label className="grid gap-2 text-sm font-semibold text-ink">
              Company ID
              <input
                value={companyInput}
                onChange={(event) => setCompanyInput(event.target.value)}
                className="h-11 rounded-md border border-ink/10 bg-[#fbfdfb] px-3 text-sm font-medium outline-none transition focus:border-canopy focus:ring-4 focus:ring-mint"
                placeholder="MongoDB company user ID"
              />
            </label>
            <button
              type="button"
              onClick={addCompany}
              className="rounded-md bg-canopy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink"
            >
              Add Company
            </button>
          </div>

          <div className="mt-5 grid gap-2">
            {companyIds.length === 0 ? (
              <p className="rounded-lg border border-ink/10 bg-[#fbfdfb] p-3 text-sm text-ink/60">
                No companies added for this session.
              </p>
            ) : (
              companyIds.map((companyId) => (
                <button
                  key={companyId}
                  type="button"
                  onClick={() => setSelectedCompanyId(companyId)}
                  className={`rounded-md border px-3 py-2 text-left text-sm font-semibold transition ${
                    selectedCompanyId === companyId
                      ? "border-canopy bg-mint text-canopy"
                      : "border-ink/10 bg-[#fbfdfb] text-ink/70 hover:border-canopy"
                  }`}
                >
                  {companyId === user.id
                    ? user.name
                    : companyId === demo?.company?.id
                      ? demo.company.name
                      : companyId}
                </button>
              ))
            )}
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-canopy">
              Suggested Questions
            </h3>
            <div className="mt-3 grid gap-2">
              {suggestedQuestions.map((suggestedQuestion) => (
                <button
                  key={suggestedQuestion}
                  type="button"
                  onClick={() => askQuestion(suggestedQuestion)}
                  disabled={!selectedCompanyId || isLoading}
                  className="rounded-md border border-ink/10 px-3 py-2 text-left text-sm text-ink/70 transition hover:border-canopy hover:text-canopy disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {suggestedQuestion}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="flex min-h-[640px] flex-col rounded-lg border border-ink/10 bg-white shadow-sm">
          <header className="flex flex-col justify-between gap-3 border-b border-ink/10 p-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold">Ask the Policy</h2>
              <p className="mt-1 text-sm text-ink/55">Source: {selectedCompanyLabel}</p>
            </div>
            <button
              type="button"
              onClick={() => setMessages([])}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-ink/10 px-3 py-2 text-sm font-semibold text-ink/70 transition hover:border-coral hover:text-coral"
            >
              <Trash2 size={16} aria-hidden="true" />
              Clear Chat
            </button>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto bg-[#fbfdfb] p-5">
            {messages.length === 0 ? (
              <div className="grid h-full min-h-72 place-items-center text-center">
                <div>
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-mint text-canopy">
                    <Sparkles size={24} aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">No messages yet</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink/60">
                    Ask a question and the assistant will answer only from the
                    latest uploaded policy for the selected company.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message) => <ChatMessage key={message.id} message={message} />)
            )}

            {isLoading && (
              <div className="flex items-center gap-2 text-sm font-medium text-ink/55">
                <span className="h-2 w-2 animate-pulse rounded-full bg-canopy" />
                <span className="h-2 w-2 animate-pulse rounded-full bg-canopy [animation-delay:120ms]" />
                <span className="h-2 w-2 animate-pulse rounded-full bg-canopy [animation-delay:240ms]" />
                Assistant is reading the uploaded policy...
              </div>
            )}
          </div>

          <form
            className="border-t border-ink/10 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              askQuestion();
            }}
          >
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={question}
                maxLength={500}
                onChange={(event) => setQuestion(event.target.value)}
                className="h-12 flex-1 rounded-md border border-ink/10 bg-white px-3 text-sm font-medium outline-none transition focus:border-canopy focus:ring-4 focus:ring-mint"
                placeholder="Ask about collection, sharing, retention, rights..."
              />
              <button
                type="submit"
                disabled={!canAsk}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-canopy px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send size={17} aria-hidden="true" />
                Ask
              </button>
            </div>
          </form>
        </section>
      </section>
    </DashboardLayout>
  );
}

function ChatMessage({ message }) {
  const isUser = message.role === "user";

  return (
    <article className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-canopy text-white">
          <Bot size={18} aria-hidden="true" />
        </div>
      )}
      <div
        className={`max-w-2xl rounded-lg border p-4 ${
          isUser
            ? "border-canopy bg-canopy text-white"
            : "border-ink/10 bg-white text-ink"
        }`}
      >
        <p className="text-sm leading-6">{message.content}</p>
        {!isUser && (
          <div className="mt-3 grid gap-2 border-t border-ink/10 pt-3 text-xs text-ink/60">
            <p>
              <span className="font-semibold text-ink">Source:</span> {message.source}
            </p>
            <p>
              <span className="font-semibold text-ink">Confidence:</span>{" "}
              {message.confidence}
            </p>
          </div>
        )}
      </div>
      {isUser && (
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-coral text-white">
          <UserRound size={18} aria-hidden="true" />
        </div>
      )}
    </article>
  );
}
