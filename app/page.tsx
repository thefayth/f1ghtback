import { BookOpenCheck, LockKeyhole, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { NextStepTool } from "./next-step-tool";

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="f1ghtback home">
          <span className="brand-mark" aria-hidden="true">f1</span>
          <span><strong>f1ghtback</strong><small>One Safe Next Step</small></span>
        </a>
        <div className="header-status"><LockKeyhole size={15} aria-hidden="true" /> No names. No uploads. No case storage.</div>
      </header>

      <section className="tool-shell" id="top">
        <div className="tool-intro">
          <p className="eyebrow">Legal information, made manageable</p>
          <h1>What is the one thing you need to do next?</h1>
          <p className="lede">Choose three non-personal details. f1ghtback will connect them to official California or Utah court resources and prepare questions for human legal help.</p>
          <div className="intro-boundary">
            <ShieldCheck size={19} aria-hidden="true" />
            <span>This tool does not provide legal advice, choose forms for cross-state matters, or create an attorney-client relationship.</span>
          </div>
        </div>
        <NextStepTool />
      </section>

      <section className="trust-band" aria-label="Product commitments">
        <div><BookOpenCheck size={20} aria-hidden="true" /><span><strong>Official sources</strong><small>Every link comes from a court or government allowlist.</small></span></div>
        <div><LockKeyhole size={20} aria-hidden="true" /><span><strong>Nothing personal requested</strong><small>No narrative, account, document, or identifying detail.</small></span></div>
        <div><ShieldCheck size={20} aria-hidden="true" /><span><strong>Human review stays visible</strong><small>Urgent, protective, and cross-state issues are never treated as self-serve conclusions.</small></span></div>
      </section>

      <section className="story-section">
        <div>
          <p className="eyebrow">Why this exists</p>
          <h2>Court overwhelm should not decide what happens next.</h2>
        </div>
        <div className="story-copy">
          <p>Built by Faith Atwater-Cheltenham, a Black mother and disabled technologist, from lived experience navigating family court.</p>
          <p>f1ghtback turns a frightening, overloaded moment into one contained action: identify the jurisdiction, name the kind of help, check official information, and prepare better questions for a real person.</p>
        </div>
      </section>

      <figure className="campaign-art">
        <Image src="/og.png" width={1745} height={909} alt="f1ghtback One Safe Next Step visual showing official source checklists and three structured choices" priority={false} unoptimized />
        <figcaption>Public-safe launch artwork. No case records, people, or private documents are shown.</figcaption>
      </figure>

      <section className="architecture-band">
        <div><p className="eyebrow">Built with Codex and GPT-5.6</p><h2>AI drafts the questions. Official sources control the boundaries.</h2></div>
        <ol className="architecture-flow">
          <li><span>1</span><strong>Structured choices</strong><small>No free-text case facts enter the request.</small></li>
          <li><span>2</span><strong>Bounded generation</strong><small>GPT-5.6 may organize one next action and review questions.</small></li>
          <li><span>3</span><strong>Source enforcement</strong><small>Only allowlisted official source IDs become links.</small></li>
          <li><span>4</span><strong>Source-only fallback</strong><small>The core workflow still works if the model is unavailable.</small></li>
        </ol>
      </section>

      <footer>
        <p><strong>f1ghtback</strong> provides legal information and preparation support, not legal advice or representation.</p>
        <p>California and Utah information is kept separate. Cross-state or uncertain matters are routed to human review.</p>
      </footer>
    </main>
  );
}
