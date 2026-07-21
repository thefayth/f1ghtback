"use client";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileClock,
  Fingerprint,
  LockKeyhole,
  RefreshCcw,
  SearchCheck,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  SYNTHETIC_TRANSCRIPTS,
  type AiReceipt,
  type TranscriptReviewResult,
  type TranscriptScenario,
} from "./lib/transcript-review";

type PromotionTarget = "canonical-fact-review" | "private-task";

type PromotionReceipt = {
  receiptVersion: "bigstick.evidence-promotion.v1";
  target: PromotionTarget;
  sourceHash: string;
  excerptHash: string;
  timecode: string;
  sensitivity: "redacted_ok";
  reviewState: "pending-human-review";
  publicationStatus: "held";
};

const scenarios = [
  { value: "school-meeting" as const, label: "Fictional planning meeting", note: "Accommodation receipt and meeting follow-up" },
  { value: "service-call" as const, label: "Fictional service call", note: "Missing upload receipt and duplicate-work risk" },
];

const queueGroups: Array<{
  key: "today" | "next" | "waiting" | "doNotTouch";
  label: string;
  className: string;
}> = [
  { key: "today", label: "Today", className: "queue-today" },
  { key: "next", label: "Next", className: "queue-next" },
  { key: "waiting", label: "Waiting", className: "queue-waiting" },
  { key: "doNotTouch", label: "Do not touch", className: "queue-hold" },
];

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function shortHash(value: string) {
  return `${value.slice(0, 12)}...${value.slice(-8)}`;
}

export function TranscriptReviewTool() {
  const [scenarioId, setScenarioId] = useState<TranscriptScenario>("school-meeting");
  const [transcript, setTranscript] = useState(SYNTHETIC_TRANSCRIPTS["school-meeting"]);
  const [fictionalConfirmed, setFictionalConfirmed] = useState(true);
  const [result, setResult] = useState<TranscriptReviewResult | null>(null);
  const [selectedExcerptId, setSelectedExcerptId] = useState<string | null>(null);
  const [promotionTarget, setPromotionTarget] = useState<PromotionTarget>("canonical-fact-review");
  const [promotionReceipt, setPromotionReceipt] = useState<PromotionReceipt | null>(null);
  const [loading, setLoading] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [error, setError] = useState("");

  const selectedExcerpt = useMemo(
    () => result?.excerpts.find((excerpt) => excerpt.id === selectedExcerptId) ?? null,
    [result, selectedExcerptId],
  );

  useEffect(() => {
    if (result) document.getElementById("transcript-review-result")?.focus();
  }, [result]);

  function loadScenario(value: TranscriptScenario) {
    setScenarioId(value);
    setTranscript(SYNTHETIC_TRANSCRIPTS[value]);
    setFictionalConfirmed(true);
    setResult(null);
    setSelectedExcerptId(null);
    setPromotionReceipt(null);
    setError("");
  }

  async function analyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!fictionalConfirmed || transcript.trim().length < 80) return;
    setLoading(true);
    setError("");
    setResult(null);
    setPromotionReceipt(null);

    try {
      const response = await fetch("/api/transcript-review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scenarioId, transcript, fictionalConfirmed: true }),
      });
      const payload = await response.json() as TranscriptReviewResult | { error?: string };
      if (!response.ok || !("safeAction" in payload)) {
        throw new Error("error" in payload && payload.error ? payload.error : "The review could not be completed.");
      }
      setResult(payload);
      setSelectedExcerptId(payload.excerpts[0]?.id ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The review could not be completed.");
    } finally {
      setLoading(false);
    }
  }

  async function promoteExcerpt() {
    if (!result || !selectedExcerpt) return;
    setPromoting(true);
    try {
      const excerptHash = await sha256(`${selectedExcerpt.timecode}:${selectedExcerpt.text}`);
      setPromotionReceipt({
        receiptVersion: "bigstick.evidence-promotion.v1",
        target: promotionTarget,
        sourceHash: result.aiReceipt.sourceHash,
        excerptHash,
        timecode: selectedExcerpt.timecode,
        sensitivity: "redacted_ok",
        reviewState: "pending-human-review",
        publicationStatus: "held",
      });
      document.getElementById("promotion-receipt")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } finally {
      setPromoting(false);
    }
  }

  return (
    <div className="record-workspace">
      <form className="transcript-form" onSubmit={analyze}>
        <div className="record-form-heading">
          <div>
            <p className="eyebrow">Listen Up + Unburied + Command</p>
            <h2>Turn a fictional record into a review queue.</h2>
          </div>
          <span className="privacy-chip"><LockKeyhole size={15} /> Synthetic input only</span>
        </div>

        <fieldset>
          <legend><span>1</span><div><strong>Choose a fictional record</strong><small>Each sample contains no real person or case information.</small></div></legend>
          <div className="choice-grid choice-grid-two">
            {scenarios.map((scenario) => (
              <button type="button" className="choice-button" aria-pressed={scenarioId === scenario.value} onClick={() => loadScenario(scenario.value)} key={scenario.value}>
                <FileClock size={18} aria-hidden="true" /><span><strong>{scenario.label}</strong><small>{scenario.note}</small></span><CheckCircle2 className="choice-check" size={18} aria-hidden="true" />
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend><span>2</span><div><strong>Review or paste the transcript</strong><small>For this public demo, use fictional or public-safe text only.</small></div></legend>
          <textarea
            className="transcript-input"
            value={transcript}
            maxLength={6000}
            aria-label="Fictional transcript"
            onChange={(event) => {
              setTranscript(event.target.value);
              setFictionalConfirmed(false);
              setResult(null);
              setPromotionReceipt(null);
            }}
          />
          <div className="transcript-meta"><span>{transcript.length.toLocaleString()} / 6,000 characters</span><span>Not stored by this contest edition</span></div>
        </fieldset>

        <label className="confirmation-row">
          <input type="checkbox" checked={fictionalConfirmed} onChange={(event) => setFictionalConfirmed(event.target.checked)} />
          <span><strong>I confirm this is fictional and public-safe.</strong><small>Do not paste names, case numbers, child information, medical details, or private records.</small></span>
        </label>

        <div className="form-actions">
          <button className="primary-button" type="submit" disabled={!fictionalConfirmed || transcript.trim().length < 80 || loading}>
            {loading ? <><span className="loading-dot" /> Building review queue...</> : <><Sparkles size={18} /> Analyze with GPT-5.6 <ArrowRight size={18} /></>}
          </button>
          <button className="text-button" type="button" onClick={() => loadScenario(scenarioId)}><RefreshCcw size={15} /> Reset sample</button>
        </div>
        {error ? <div className="error-message" role="alert"><AlertTriangle size={18} />{error}</div> : null}
      </form>

      {result ? (
        <section className="record-result" id="transcript-review-result" tabIndex={-1} aria-live="polite">
          <div className="safe-action-banner">
            <div><p className="eyebrow">One safe next action</p><h2>{result.safeAction}</h2></div>
            <span className={`mode-badge mode-${result.mode === "gpt-5.6" ? "ai" : "source"}`}>
              {result.mode === "gpt-5.6" ? <Sparkles size={15} /> : <SearchCheck size={15} />}
              {result.mode === "gpt-5.6" ? "GPT-5.6 draft" : "Source-only fallback"}
            </span>
          </div>

          <div className="command-queue" aria-label="Command queue">
            {queueGroups.map((group) => (
              <section className={`queue-column ${group.className}`} key={group.key}>
                <h3>{group.label}<span>{result[group.key].length}</span></h3>
                {result[group.key].map((item) => <p key={item}>{item}</p>)}
              </section>
            ))}
          </div>

          <div className="analysis-grid">
            <section><h3>Facts</h3>{result.facts.map((item) => <p key={item}>{item}</p>)}</section>
            <section><h3>Inferences</h3>{result.inferences.map((item) => <p key={item}>{item}</p>)}</section>
            <section><h3>Contradictions</h3>{result.contradictions.map((item) => <p key={item}>{item}</p>)}</section>
            <section><h3>Missing information</h3>{result.missingInfo.map((item) => <p key={item}>{item}</p>)}</section>
          </div>

          <section className="evidence-review">
            <div className="section-heading">
              <div><p className="eyebrow">Transcript to evidence</p><h2>Select one excerpt for private review.</h2></div>
              <span className="public-hold"><ShieldCheck size={16} /> Public Hold active</span>
            </div>
            <div className="excerpt-list" role="radiogroup" aria-label="Transcript excerpts">
              {result.excerpts.map((excerpt) => (
                <button type="button" role="radio" aria-checked={selectedExcerptId === excerpt.id} className="excerpt-row" onClick={() => { setSelectedExcerptId(excerpt.id); setPromotionReceipt(null); }} key={excerpt.id}>
                  <span className="radio-dot" aria-hidden="true" /><strong>{excerpt.timecode}</strong><span>{excerpt.text}</span>
                </button>
              ))}
            </div>
            <div className="promotion-controls">
              <div className="segmented-control" aria-label="Promotion target">
                <button type="button" aria-pressed={promotionTarget === "canonical-fact-review"} onClick={() => setPromotionTarget("canonical-fact-review")}>Fact review</button>
                <button type="button" aria-pressed={promotionTarget === "private-task"} onClick={() => setPromotionTarget("private-task")}>Private task</button>
              </div>
              <button className="secondary-button" type="button" disabled={!selectedExcerpt || promoting} onClick={promoteExcerpt}>
                <ClipboardCheck size={17} /> {promoting ? "Hashing excerpt..." : "Promote with receipt"}
              </button>
            </div>

            {promotionReceipt ? <PromotionReceiptPanel receipt={promotionReceipt} /> : null}
          </section>

          <AiReceiptPanel receipt={result.aiReceipt} />
        </section>
      ) : null}
    </div>
  );
}

function AiReceiptPanel({ receipt }: { receipt: AiReceipt }) {
  return (
    <section className="receipt-panel" aria-label="AI receipt">
      <div className="receipt-title"><Fingerprint size={21} /><div><p className="eyebrow">AI receipt</p><h3>{receipt.receiptVersion}</h3></div></div>
      <dl>
        <div><dt>Provider / model</dt><dd>{receipt.provider} / {receipt.model}</dd></div>
        <div><dt>Sensitivity route</dt><dd>{receipt.sensitivityRoute}</dd></div>
        <div><dt>Source SHA-256</dt><dd title={receipt.sourceHash}>{shortHash(receipt.sourceHash)}</dd></div>
        <div><dt>Review</dt><dd>{receipt.reviewState}</dd></div>
        <div><dt>Approval</dt><dd>{receipt.approvalState}</dd></div>
        <div><dt>Publication</dt><dd className="held-value">{receipt.publicationStatus}</dd></div>
      </dl>
    </section>
  );
}

function PromotionReceiptPanel({ receipt }: { receipt: PromotionReceipt }) {
  return (
    <section className="promotion-receipt" id="promotion-receipt" aria-live="polite">
      <CheckCircle2 size={21} />
      <div><p className="eyebrow">Custody receipt created</p><h3>{receipt.target === "canonical-fact-review" ? "Queued for fact review" : "Queued as a private task"}</h3></div>
      <dl>
        <div><dt>Excerpt</dt><dd>{receipt.timecode}</dd></div>
        <div><dt>SHA-256</dt><dd title={receipt.excerptHash}>{shortHash(receipt.excerptHash)}</dd></div>
        <div><dt>Review</dt><dd>{receipt.reviewState}</dd></div>
        <div><dt>Publication</dt><dd className="held-value">{receipt.publicationStatus}</dd></div>
      </dl>
    </section>
  );
}
