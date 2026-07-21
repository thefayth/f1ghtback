import { BookOpenCheck, FileText, LockKeyhole, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { ContestWorkspace } from "./contest-workspace";

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="f1ghtback home">
          <span className="brand-mark" aria-hidden="true">f1</span>
          <span><strong>f1ghtback</strong><small>Guided Filing and Packet Studio</small></span>
        </a>
        <div className="header-status"><LockKeyhole size={15} aria-hidden="true" /> No account. No upload. Answers stay in this tab.</div>
      </header>

      <section className="tool-shell" id="top">
        <div className="tool-intro">
          <p className="eyebrow">Free contest edition · California and Utah</p>
          <h1>Understand the papers. Prepare your response. Keep your words.</h1>
          <p className="lede">Choose a safe next step, then use a blank guided walkthrough to prepare a California FL-320 response or Utah family answer packet for human review.</p>
          <div className="intro-boundary">
            <ShieldCheck size={19} aria-hidden="true" />
            <span>No names, case numbers, documents, or narratives are sent to GPT. Personal answers stay only in browser memory and disappear when the tab closes.</span>
          </div>
        </div>
        <ContestWorkspace />
      </section>

      <section className="trust-band" aria-label="Product commitments">
        <div><BookOpenCheck size={20} aria-hidden="true" /><span><strong>Official-source guidance</strong><small>California and Utah routes stay separate, with checked dates and human-review holds.</small></span></div>
        <div><LockKeyhole size={20} aria-hidden="true" /><span><strong>Private by architecture</strong><small>Typing answers causes no network request and no browser storage write.</small></span></div>
        <div><FileText size={20} aria-hidden="true" /><span><strong>Useful output</strong><small>Download a draft PDF and companion text packet without an account or paid document service.</small></span></div>
      </section>

      <section className="story-section">
        <div><p className="eyebrow">Why this exists</p><h2>Overwhelm should not decide what happens next.</h2></div>
        <div className="story-copy">
          <p>Built by Faith Atwater-Cheltenham, a Black mother and disabled technologist, from lived experience navigating family court.</p>
          <p>f1ghtback breaks preparation into small, reviewable steps. It preserves the user&apos;s exact language, shows where answers may transfer, and keeps form choice, timing, filing, service, and legal sufficiency with official sources and qualified human review.</p>
        </div>
      </section>

      <figure className="campaign-art">
        <Image src="/og.png" width={1731} height={909} alt="f1ghtback One Safe Next Step visual with an official source checklist and learn, choose, plan pathway" priority={false} unoptimized />
        <figcaption>Public-safe original launch artwork. No person, case, court record, or invented scenario is shown.</figcaption>
      </figure>

      <section className="architecture-band">
        <div><p className="eyebrow">Built with Codex and optional GPT-5.6</p><h2>AI explains the step. Your personal answers never enter the prompt.</h2></div>
        <ol className="architecture-flow">
          <li><span>1</span><strong>Choose a route</strong><small>Three structured choices produce a bounded, source-backed next action.</small></li>
          <li><span>2</span><strong>Walk through the response</strong><small>Answer one form-matched preparation question at a time in browser memory.</small></li>
          <li><span>3</span><strong>Build a local packet</strong><small>The browser creates a draft PDF and text export with exact answers and source receipts.</small></li>
          <li><span>4</span><strong>Review before action</strong><small>A court self-help center, legal aid provider, or lawyer confirms forms, timing, filing, and service.</small></li>
        </ol>
      </section>

      <footer>
        <p><strong>f1ghtback</strong> provides legal information and preparation support, not legal advice, representation, filing, or an attorney-client relationship.</p>
        <p>California and Utah information is kept separate. Cross-state or uncertain matters are routed to human review.</p>
      </footer>
    </main>
  );
}
