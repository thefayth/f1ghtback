"use client";

import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Check,
  CircleAlert,
  Download,
  ExternalLink,
  FileDown,
  HandHeart,
  ListChecks,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  getGuidePack,
  isGuidePackStale,
  type GuideDetailLevel,
  type GuideId,
  type GuideStep,
} from "./lib/guide-packs";
import {
  buildCompanionPacketText,
  buildReviewPacketPdf,
  type GuideAnswer,
  type GuideAnswers,
} from "./lib/packet-builder";
import { OFFICIAL_SOURCES } from "./lib/source-manifest";
import type { ExplainStepResult } from "./lib/explain-step";

function hasAnswer(answer: GuideAnswer | undefined) {
  if (typeof answer === "string") return Boolean(answer.trim());
  if (Array.isArray(answer)) return answer.length > 0;
  return Boolean(answer && Object.values(answer).some((value) => value.trim()));
}

function answerPreview(answer: GuideAnswer | undefined) {
  if (typeof answer === "string") return answer.trim() || "Not answered yet";
  if (Array.isArray(answer)) return answer.length ? answer.join(", ") : "Not answered yet";
  if (answer && typeof answer === "object") {
    const values = Object.entries(answer)
      .filter(([, value]) => value.trim())
      .map(([key, value]) => `${key}: ${value}`);
    return values.length ? values.join(" | ") : "Not answered yet";
  }
  return "Not answered yet";
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function StepInput({
  step,
  answer,
  onChange,
}: {
  step: GuideStep;
  answer: GuideAnswer | undefined;
  onChange: (answer: GuideAnswer) => void;
}) {
  if (step.kind === "single-choice") {
    return (
      <div className="guide-options">
        {step.options?.map((option) => (
          <button
            type="button"
            className="guide-option"
            aria-pressed={answer === option.label}
            onClick={() => onChange(option.label)}
            key={option.value}
          >
            <span>{option.label}</span>
            <Check size={17} aria-hidden="true" />
          </button>
        ))}
      </div>
    );
  }

  if (step.kind === "multi-choice") {
    const selected = Array.isArray(answer) ? answer : [];
    return (
      <div className="guide-options guide-options-two">
        {step.options?.map((option) => {
          const checked = selected.includes(option.label);
          return (
            <button
              type="button"
              className="guide-option"
              aria-pressed={checked}
              onClick={() => onChange(checked ? selected.filter((item) => item !== option.label) : [...selected, option.label])}
              key={option.value}
            >
              <span>{option.label}</span>
              <Check size={17} aria-hidden="true" />
            </button>
          );
        })}
      </div>
    );
  }

  if (step.kind === "paragraph-map") {
    const mapped = answer && !Array.isArray(answer) && typeof answer === "object" ? answer : {};
    return (
      <div className="paragraph-map">
        {[
          ["Agree", "Paragraph numbers you agree with"],
          ["Disagree", "Paragraph numbers you disagree with"],
          ["Not enough information", "Paragraph numbers you cannot answer yet"],
        ].map(([key, label]) => (
          <label key={key}>
            <span>{label}</span>
            <textarea
              value={mapped[key] ?? ""}
              onChange={(event) => onChange({ ...mapped, [key]: event.target.value })}
              placeholder="Example format: 2, 4, 7. Do not paste the petition text."
              maxLength={2000}
            />
          </label>
        ))}
      </div>
    );
  }

  if (step.kind === "checklist") {
    const selected = Array.isArray(answer) ? answer : [];
    return (
      <div className="preparation-checklist">
        {step.checklist?.map((item) => (
          <label key={item}>
            <input
              type="checkbox"
              checked={selected.includes(item)}
              onChange={(event) => onChange(event.target.checked ? [...selected, item] : selected.filter((entry) => entry !== item))}
            />
            <span>{item}</span>
          </label>
        ))}
      </div>
    );
  }

  if (step.kind === "date") {
    return (
      <label className="guide-field">
        <span>Date as shown or understood</span>
        <input type="date" value={typeof answer === "string" ? answer : ""} onChange={(event) => onChange(event.target.value)} />
        <small>Recorded for human review only. f1ghtback does not calculate a deadline.</small>
      </label>
    );
  }

  return (
    <label className="guide-field">
      <span>Your exact words</span>
      <textarea
        value={typeof answer === "string" ? answer : ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={step.placeholder}
        maxLength={step.maxLength}
      />
      <small>{typeof answer === "string" ? answer.length : 0} / {step.maxLength ?? 6000} characters. Nothing typed here is sent over the network.</small>
    </label>
  );
}

export function GuidedPreparationTool({
  guideId,
  onBackToRouter,
}: {
  guideId: GuideId;
  onBackToRouter: () => void;
}) {
  const guide = getGuidePack(guideId)!;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<GuideAnswers>({});
  const [companionNote, setCompanionNote] = useState("");
  const [detailLevel, setDetailLevel] = useState<GuideDetailLevel>("brief");
  const [explanation, setExplanation] = useState<{
    guideId: GuideId;
    stepId: string;
    detailLevel: GuideDetailLevel;
    result: ExplainStepResult;
  } | null>(null);
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const currentStep = guide.steps[currentIndex];
  const answeredCount = useMemo(() => guide.steps.filter((step) => hasAnswer(answers[step.id])).length, [answers, guide.steps]);
  const stale = isGuidePackStale(guide);
  const currentAnswer = answers[currentStep.id];
  const routingHold = currentStep.id === "identify-papers" && typeof currentAnswer === "string" && /different|unsure/i.test(currentAnswer)
    || currentStep.id === "confirm-jurisdiction" && typeof currentAnswer === "string" && /cross-state|unsure/i.test(currentAnswer);

  useEffect(() => {
    if (answeredCount === 0) return;
    const warnBeforeClose = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warnBeforeClose);
    return () => window.removeEventListener("beforeunload", warnBeforeClose);
  }, [answeredCount]);

  function setCurrentAnswer(answer: GuideAnswer) {
    setAnswers((current) => ({ ...current, [currentStep.id]: answer }));
  }

  async function explainStep() {
    setExplanationLoading(true);
    try {
      const response = await fetch("/api/explain-step", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ guideId, stepId: currentStep.id, detailLevel }),
      });
      const result = await response.json() as ExplainStepResult | { error?: string };
      if (response.ok && "explanation" in result) {
        setExplanation({ guideId, stepId: currentStep.id, detailLevel, result });
      }
    } finally {
      setExplanationLoading(false);
    }
  }

  function packetContext() {
    return { guide, answers, companionNote, generatedAt: new Date().toISOString() };
  }

  async function downloadPdf() {
    setDownloadBusy(true);
    try {
      const bytes = await buildReviewPacketPdf(packetContext());
      downloadBlob(new Blob([Uint8Array.from(bytes)], { type: "application/pdf" }), "f1ghtback-review-packet.pdf");
    } finally {
      setDownloadBusy(false);
    }
  }

  function downloadText() {
    downloadBlob(new Blob([buildCompanionPacketText(packetContext())], { type: "text/plain;charset=utf-8" }), "f1ghtback-companion-packet.txt");
  }

  function clearEverything() {
    if (answeredCount > 0 && !window.confirm("Clear every answer from this browser tab? This cannot be undone.")) return;
    setAnswers({});
    setCompanionNote("");
    setCurrentIndex(0);
  }

  function leaveForNow() {
    if (answeredCount > 0 && !window.confirm("Your answers exist only in this tab. Download a packet before leaving if you want to keep them. Leave now?")) return;
    onBackToRouter();
  }

  if (stale) {
    return (
      <section className="guide-stale" role="alert">
        <CircleAlert size={26} />
        <div>
          <p className="eyebrow">Source review hold</p>
          <h2>This walkthrough is paused until its official sources are checked.</h2>
          <p>Use the official links below and ask court self-help, legal aid, or a lawyer to confirm the current process.</p>
          <button type="button" className="secondary-button" onClick={onBackToRouter}><ArrowLeft size={17} /> Return to the source router</button>
        </div>
      </section>
    );
  }

  const shownExplanation = explanation?.guideId === guideId
    && explanation.stepId === currentStep.id
    && explanation.detailLevel === detailLevel
    ? explanation.result
    : {
    mode: "source-only" as const,
    explanation: currentStep.explanation,
    whyItMatters: currentStep.whyItMatters,
    watchFor: currentStep.watchFor,
    sourceIds: currentStep.sourceIds,
    sourcePackStatus: "current" as const,
    humanReviewRequired: true as const,
    legalInformationOnly: true as const,
    };

  return (
    <section className="guide-studio" aria-label={guide.title}>
      <header className="guide-header">
        <div>
          <p className="eyebrow">Guided preparation · {guide.jurisdiction}</p>
          <h2>{guide.title}</h2>
          <p>{guide.summary}</p>
        </div>
        <div className="guide-session-status"><ShieldCheck size={18} /><span><strong>Device-only session</strong><small>{answeredCount} of {guide.steps.length} sections answered</small></span></div>
      </header>

      <div className="guide-utility-bar">
        <span><strong>Download before closing.</strong> Answers are held in memory only and disappear when this tab closes.</span>
        <div>
          <button type="button" onClick={downloadText} disabled={answeredCount === 0}><Download size={16} /> Text packet</button>
          <button type="button" onClick={downloadPdf} disabled={answeredCount === 0 || downloadBusy}><FileDown size={16} /> {downloadBusy ? "Building…" : "PDF packet"}</button>
        </div>
      </div>

      <div className="guide-layout">
        <nav className="progress-rail" aria-label="Walkthrough progress">
          <p>Preparation map</p>
          <ol>
            {guide.steps.map((step, index) => (
              <li key={step.id}>
                <button type="button" aria-current={index === currentIndex ? "step" : undefined} onClick={() => setCurrentIndex(index)}>
                  <span>{hasAnswer(answers[step.id]) ? <Check size={14} /> : index + 1}</span>
                  <strong>{step.title}</strong>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div className="guide-question-panel">
          <div className="question-kicker"><span>Step {currentIndex + 1} of {guide.steps.length}</span><small>{currentStep.formTarget}</small></div>
          <h3>{currentStep.prompt}</h3>
          <StepInput step={currentStep} answer={currentAnswer} onChange={setCurrentAnswer} />

          {routingHold ? (
            <div className="routing-hold" role="alert"><CircleAlert size={20} /><span><strong>Pause this form-specific walkthrough.</strong> Return to the router and use human review before choosing a state form.</span></div>
          ) : null}

          <div className="guide-navigation">
            <button type="button" className="secondary-button secondary-quiet" disabled={currentIndex === 0} onClick={() => setCurrentIndex((index) => index - 1)}><ArrowLeft size={17} /> Back</button>
            {currentIndex < guide.steps.length - 1 && !routingHold ? <button type="button" className="primary-button" onClick={() => setCurrentIndex((index) => index + 1)}>Continue <ArrowRight size={17} /></button> : null}
            {routingHold ? <button type="button" className="primary-button" onClick={onBackToRouter}>Return to router <ArrowRight size={17} /></button> : null}
          </div>
        </div>

        <aside className="guide-side-panel">
          <section className="step-explainer">
            <div className="explainer-heading">
              <div><BookOpenCheck size={19} /><strong>What this step means</strong></div>
              <div className="detail-toggle" aria-label="Explanation detail">
                {(["brief", "full"] as const).map((level) => <button type="button" aria-pressed={detailLevel === level} onClick={() => setDetailLevel(level)} key={level}>{level}</button>)}
              </div>
            </div>
            <p>{shownExplanation.explanation}</p>
            <h4>Why it matters</h4>
            <p>{shownExplanation.whyItMatters}</p>
            <h4>Watch for</h4>
            <ul>{shownExplanation.watchFor.map((item) => <li key={item}>{item}</li>)}</ul>
            <button type="button" className="explain-button" onClick={explainStep} disabled={explanationLoading}><Sparkles size={15} /> {explanationLoading ? "Organizing…" : "Explain this step"}</button>
            <small className="ai-boundary">Only the guide and step IDs are sent. Your answers are never included.</small>
          </section>

          <section className="live-packet-preview">
            <div><ListChecks size={18} /><strong>Live packet preview</strong></div>
            <p>{answerPreview(currentAnswer)}</p>
            <small>Exact wording is preserved in downloads. Empty sections are marked for review.</small>
          </section>

          <section className="step-sources">
            <strong>Official sources</strong>
            {currentStep.sourceIds.map((sourceId) => {
              const source = OFFICIAL_SOURCES[sourceId];
              return <a href={source.url} target="_blank" rel="noreferrer" key={sourceId}><span>{source.title}<small>Checked {source.checkedAt}</small></span><ExternalLink size={15} /></a>;
            })}
          </section>
        </aside>
      </div>

      <section className="packet-export-panel">
        <div>
          <p className="eyebrow">Review-ready exports</p>
          <h3>Download a draft packet. Nothing files or sends automatically.</h3>
          <p>The PDF is built in this browser. The text version includes an explicit <code>thefaythai.companion.v1</code> envelope for user-controlled copying.</p>
        </div>
        <label>
          <span>Optional note for your companion export</span>
          <textarea value={companionNote} onChange={(event) => setCompanionNote(event.target.value)} maxLength={1000} placeholder="A note you choose to include. It remains local until you download the text packet." />
        </label>
        <div className="packet-actions">
          <button type="button" className="primary-button" onClick={downloadPdf} disabled={answeredCount === 0 || downloadBusy}><FileDown size={17} /> Download PDF</button>
          <button type="button" className="secondary-button" onClick={downloadText} disabled={answeredCount === 0}><Download size={17} /> Download companion text</button>
        </div>
      </section>

      <footer className="guide-safety-actions">
        <a href="#human-help"><HandHeart size={16} /> Need human help</a>
        <button type="button" onClick={leaveForNow}>Not today</button>
        <button type="button" onClick={clearEverything}><Trash2 size={16} /> Clear everything</button>
        <button type="button" onClick={onBackToRouter}><RotateCcw size={16} /> Back to router</button>
      </footer>
    </section>
  );
}
