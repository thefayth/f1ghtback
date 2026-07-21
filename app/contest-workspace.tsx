"use client";

import { BookOpenCheck, Compass, FileText, ScanSearch } from "lucide-react";
import { useState } from "react";
import { GuidedPreparationTool } from "./guided-preparation-tool";
import type { GuideId } from "./lib/guide-packs";
import { NextStepTool } from "./next-step-tool";
import { TranscriptReviewTool } from "./transcript-review-tool";

type WorkspaceMode = "record" | "router" | "preparation";

export function ContestWorkspace() {
  const [mode, setMode] = useState<WorkspaceMode>("record");
  const [guideId, setGuideId] = useState<GuideId | null>(null);

  function startGuide(selectedGuide: GuideId) {
    setGuideId(selectedGuide);
    setMode("preparation");
    requestAnimationFrame(() => document.getElementById("workspace-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return (
    <div>
      <div className="workspace-tabs" role="tablist" aria-label="f1ghtback tools">
        <button type="button" role="tab" aria-selected={mode === "record"} onClick={() => setMode("record")}>
          <ScanSearch size={18} />
          <span><strong>Record to action</strong><small>Review a synthetic transcript with receipts</small></span>
        </button>
        <button type="button" role="tab" aria-selected={mode === "router"} onClick={() => setMode("router")}>
          <Compass size={18} />
          <span><strong>Find my next step</strong><small>Three private-free structured choices</small></span>
        </button>
        <button type="button" role="tab" aria-selected={mode === "preparation"} onClick={() => setMode("preparation")}>
          <FileText size={18} />
          <span><strong>Guided preparation</strong><small>California FL-320 or Utah family answer</small></span>
        </button>
      </div>
      <div role="tabpanel" id="workspace-panel">
        {mode === "record" ? <TranscriptReviewTool /> : null}
        {mode === "router" ? <NextStepTool onStartGuide={startGuide} /> : null}
        {mode === "preparation" && guideId ? <GuidedPreparationTool guideId={guideId} onBackToRouter={() => setMode("router")} /> : null}
        {mode === "preparation" && !guideId ? (
          <section className="guide-picker">
            <div>
              <p className="eyebrow">Choose a blank walkthrough</p>
              <h2>Prepare your own response one question at a time.</h2>
              <p>No sample person or invented case is loaded. Your answers stay in this browser tab.</p>
            </div>
            <div className="guide-picker-actions">
              <button type="button" onClick={() => startGuide("ca-fl-320-response")}><BookOpenCheck size={20} /><span><strong>California FL-320 response</strong><small>Responding to an FL-300 Request for Order</small></span></button>
              <button type="button" onClick={() => startGuide("ut-family-answer")}><BookOpenCheck size={20} /><span><strong>Utah family answer</strong><small>Sorting petition paragraphs and preparing for MyPaperwork</small></span></button>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
