import { BookOpenCheck, FileText, LockKeyhole, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { ContestWorkspace } from "./contest-workspace";

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="f1ghtback home">
          <span className="brand-mark" aria-hidden="true">f1</span>
          <span><strong>f1ghtback</strong><small>One Safe Next Step</small></span>
        </a>
        <div className="header-status"><LockKeyhole size={15} aria-hidden="true" /> Synthetic demo. Device-only guides. Public Hold.</div>
      </header>

      <section className="tool-shell" id="top">
        <div className="tool-intro">
          <p className="eyebrow">Big Stick public contest edition · California and Utah</p>
          <h1>From a messy record to one safe next step.</h1>
          <p className="lede">Turn a synthetic transcript into a review queue, choose an official-source route, and prepare a court response packet without surrendering your words.</p>
          <div className="intro-boundary">
            <ShieldCheck size={19} aria-hidden="true" />
            <span>The record demo accepts fictional public-safe text only. Guided filing answers stay in browser memory and are never sent to GPT.</span>
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
        <div>
          <p className="eyebrow">Why this exists</p>
          <h2>Overwhelm should not decide what happens next.</h2>
        </div>
        <div className="story-copy">
          <p>Built by Faith Atwater-Cheltenham, a Black mother and disabled technologist, from lived experience navigating family court.</p>
          <p>f1ghtback breaks preparation into small, reviewable steps. It preserves the user&apos;s exact language, shows where answers may transfer, and keeps form choice, timing, filing, service, and legal sufficiency with official sources and qualified human review.</p>
        </div>
      </section>

      <figure className="campaign-art">
        <Image src="/og-v2.png" width={1731} height={909} alt="f1ghtback One Safe Next Step visual showing a protected record becoming an organized action queue" priority={false} unoptimized />
        <figcaption>Public-safe original launch artwork. No person, case, court record, or private evidence is shown.</figcaption>
      </figure>

      <section className="architecture-band">
        <div><p className="eyebrow">Built with Codex and GPT-5.6</p><h2>Bounded AI organizes a synthetic record. Owned proof and human review control what happens next.</h2></div>
        <ol className="architecture-flow">
          <li><span>1</span><strong>Contain the input</strong><small>The public demo accepts only a confirmed fictional transcript and stores nothing.</small></li>
          <li><span>2</span><strong>Build a bounded draft</strong><small>GPT-5.6 separates facts, inferences, contradictions, missing information, and safe next actions.</small></li>
          <li><span>3</span><strong>Attach owned proof</strong><small>Source and excerpt hashes create visible AI and custody receipts.</small></li>
          <li><span>4</span><strong>Hold for a human</strong><small>Nothing publishes, files, sends, signs, or becomes evidence automatically.</small></li>
        </ol>
      </section>

      <footer>
        <p><strong>f1ghtback</strong> provides legal information and preparation support, not legal advice, representation, filing, or an attorney-client relationship.</p>
        <p>California and Utah information is kept separate. Cross-state or uncertain matters are routed to human review.</p>
      </footer>
    </main>
  );
}
