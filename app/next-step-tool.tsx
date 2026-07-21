"use client";

import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  CircleAlert,
  Clock3,
  ExternalLink,
  FileInput,
  HandHeart,
  MapPin,
  RefreshCcw,
  RotateCcw,
  Scale,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { GuideId } from "./lib/guide-packs";
import { OFFICIAL_SOURCES } from "./lib/source-manifest";

type Jurisdiction = "california" | "utah" | "cross-state";
type Need = "file" | "respond" | "protection" | "help" | "review";
type Timing = "today" | "seven-days" | "later-or-unknown";

type Result = {
  mode: "gpt-5.6" | "source-only";
  nextAction: string;
  checklist: string[];
  reviewQuestions: string[];
  sourceIds: string[];
  humanReviewRequired: true;
  legalInformationOnly: true;
};

const jurisdictions = [
  { value: "california" as const, label: "California", note: "State and Los Angeles court sources" },
  { value: "utah" as const, label: "Utah", note: "Utah State Courts sources" },
  { value: "cross-state" as const, label: "Cross-state / unsure", note: "Human review before forms" },
];

const needs = [
  { value: "file" as const, label: "File", note: "Prepare to ask for an order or start a process", icon: FileInput },
  { value: "respond" as const, label: "Respond", note: "You received court papers or a request", icon: RefreshCcw },
  { value: "protection" as const, label: "Protection", note: "Find official protection information", icon: ShieldAlert },
  { value: "help" as const, label: "Get help", note: "Find self-help, legal aid, or accessibility support", icon: HandHeart },
  { value: "review" as const, label: "Prepare for review", note: "Make focused questions for a human reviewer", icon: Scale },
];

const timings = [
  { value: "today" as const, label: "Today", note: "This may be urgent" },
  { value: "seven-days" as const, label: "Within seven days", note: "A deadline may be close" },
  { value: "later-or-unknown" as const, label: "Later / unsure", note: "Start by confirming the process" },
];

export function NextStepTool({ onStartGuide }: { onStartGuide?: (guideId: GuideId) => void }) {
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction | null>(null);
  const [need, setNeed] = useState<Need | null>(null);
  const [timing, setTiming] = useState<Timing | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = Boolean(jurisdiction && need && timing && !loading);
  const selectedSources = useMemo(
    () => (result?.sourceIds ?? []).map((id) => OFFICIAL_SOURCES[id as keyof typeof OFFICIAL_SOURCES]).filter(Boolean),
    [result],
  );
  const deepGuide: GuideId | null = need === "respond" && jurisdiction === "california"
    ? "ca-fl-320-response"
    : need === "respond" && jurisdiction === "utah"
      ? "ut-family-answer"
      : null;

  useEffect(() => {
    if (result) document.getElementById("next-step-result")?.focus();
  }, [result]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!jurisdiction || !need || !timing) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/next-step", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jurisdiction, need, timing }),
      });
      const payload = await response.json() as Result | { error?: string };
      if (!response.ok || !("nextAction" in payload)) {
        throw new Error("error" in payload && payload.error ? payload.error : "The source guide could not respond.");
      }
      setResult(payload);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The source guide could not respond.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setJurisdiction(null);
    setNeed(null);
    setTiming(null);
    setResult(null);
    setError("");
    document.getElementById("top")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="tool-workspace">
      <form className="decision-form" onSubmit={submit}>
        <fieldset>
          <legend><span>1</span><div><strong>Where?</strong><small>Choose the court system, not your address.</small></div></legend>
          <div className="choice-grid choice-grid-three">
            {jurisdictions.map((item) => (
              <button type="button" className="choice-button" aria-pressed={jurisdiction === item.value} onClick={() => setJurisdiction(item.value)} key={item.value}>
                <MapPin size={18} aria-hidden="true" /><span><strong>{item.label}</strong><small>{item.note}</small></span><CheckCircle2 className="choice-check" size={18} aria-hidden="true" />
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend><span>2</span><div><strong>What do you need?</strong><small>Choose the closest practical task.</small></div></legend>
          <div className="choice-grid choice-grid-needs">
            {needs.map(({ value, label, note, icon: Icon }) => (
              <button type="button" className="choice-button choice-compact" aria-pressed={need === value} onClick={() => setNeed(value)} key={value}>
                <Icon size={18} aria-hidden="true" /><span><strong>{label}</strong><small>{note}</small></span><CheckCircle2 className="choice-check" size={18} aria-hidden="true" />
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend><span>3</span><div><strong>When?</strong><small>No date or case number needed.</small></div></legend>
          <div className="choice-grid choice-grid-three">
            {timings.map((item) => (
              <button type="button" className="choice-button" aria-pressed={timing === item.value} onClick={() => setTiming(item.value)} key={item.value}>
                <Clock3 size={18} aria-hidden="true" /><span><strong>{item.label}</strong><small>{item.note}</small></span><CheckCircle2 className="choice-check" size={18} aria-hidden="true" />
              </button>
            ))}
          </div>
        </fieldset>

        <div className="form-actions">
          <button className="primary-button" type="submit" disabled={!canSubmit}>{loading ? <><span className="loading-dot" /> Checking sources…</> : <>Show my next step <ArrowRight size={18} /></>}</button>
          <a className="text-button" href="#human-help">Need human help</a>
          <button className="text-button" type="button" onClick={reset}>Not today</button>
        </div>
        {error ? <div className="error-message" role="alert"><CircleAlert size={18} />{error} <button type="button" onClick={reset}>Start again</button></div> : null}
      </form>

      {result ? (
        <section className="result-panel" id="next-step-result" tabIndex={-1} aria-live="polite">
          <div className="result-heading">
            <div><p className="eyebrow">Your contained next action</p><h2>{result.nextAction}</h2></div>
            <span className={`mode-badge mode-${result.mode === "gpt-5.6" ? "ai" : "source"}`}>{result.mode === "gpt-5.6" ? <Sparkles size={15} /> : <BookOpenCheck size={15} />}{result.mode === "gpt-5.6" ? "GPT-5.6 organized" : "Source-only fallback"}</span>
          </div>
          <div className="result-columns">
            <div><h3>Do this next</h3><ol className="checklist">{result.checklist.map((item) => <li key={item}>{item}</li>)}</ol></div>
            <div><h3>Questions for human help</h3><ul className="question-list">{result.reviewQuestions.map((item) => <li key={item}>{item}</li>)}</ul></div>
          </div>
          <div className="source-results">
            <h3>Official starting points</h3>
            <p className="source-check">Each source shows its last checked date.</p>
            {selectedSources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.url}><span><strong>{source.title}</strong><small>{source.publisher}</small></span><ExternalLink size={17} aria-hidden="true" /></a>)}
          </div>
          <div className="review-warning"><ShieldAlert size={20} /><span><strong>Human review required.</strong> Confirm forms, timing, filing, service, safety, and jurisdiction with the court self-help center, legal aid, or a qualified lawyer.</span></div>
          {deepGuide && onStartGuide ? (
            <button className="primary-button guide-continue" type="button" onClick={() => onStartGuide(deepGuide)}>
              Continue to guided preparation <ArrowRight size={18} />
            </button>
          ) : null}
          <button className="reset-button" type="button" onClick={reset}><RotateCcw size={17} /> Start over</button>
        </section>
      ) : null}

      <aside className="human-help" id="human-help">
        <div><HandHeart size={22} aria-hidden="true" /><span><strong>You do not have to explain everything here.</strong><small>Use an official legal-help directory or court self-help center for a human conversation.</small></span></div>
        <div className="help-links"><a href="https://selfhelp.courts.ca.gov/get-free-or-low-cost-legal-help" target="_blank" rel="noreferrer">California legal help <ExternalLink size={15} /></a><a href="https://www.utcourts.gov/en/self-help/legal-help/finding-legal-help/legal-assist.html" target="_blank" rel="noreferrer">Utah legal help <ExternalLink size={15} /></a></div>
      </aside>
    </div>
  );
}
