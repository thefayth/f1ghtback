# f1ghtback: Guided Filing and Packet Studio

![f1ghtback One Safe Next Step](public/og.png)

f1ghtback helps self-represented people understand family-court response papers, answer one question at a time, preserve their exact words, and download a draft packet for court self-help, legal aid, or lawyer review.

Built by Faith Atwater-Cheltenham, a Black mother and disabled technologist, from lived experience navigating family court.

## Build Week Entry

- Category: **Apps for Your Life**
- Runtime: OpenAI Sites / Cloudflare Workers
- AI: optional GPT-5.6 step explanations with strict structured output
- Core guarantee: personal preparation answers remain in browser memory and never enter Sites, D1, GPT, analytics, or persistent browser storage
- Live app: https://f1ghtback-one-safe-next-step.indigo-iris-5804.chatgpt.site

Big Stick existed before Build Week as a private local desktop suite. This repository is the separate public-safe contest app. No private desktop source, record, evidence, transcript, credential, or case strategy is included.

## What It Does

1. Routes California, Utah, and cross-state or uncertain situations through three structured choices.
2. Provides two deep blank walkthroughs: California FL-320 response preparation and Utah family answer preparation.
3. Records the user&apos;s exact words only in React memory for the life of the tab.
4. Shows form-item transfer targets, official source links, checked dates, unresolved questions, and human-review holds.
5. Creates `f1ghtback-review-packet.pdf` and `f1ghtback-companion-packet.txt` entirely in the browser.
6. Falls back to deterministic source guidance when GPT is unavailable, over budget, invalid, or not configured.

It does not calculate deadlines, upload evidence, fill or file an official court PDF, contact another person, select a form for cross-state matters, or claim legal sufficiency.

## Local Setup

Requirements: Node.js 22.13 or newer and npm.

```powershell
npm ci
npm run dev
```

Set `OPENAI_API_KEY` in an ignored local environment only if you want optional GPT-5.6 explanations. The full router, walkthroughs, official links, and packet downloads work without it.

## Architecture

```mermaid
flowchart LR
  R["Three-choice router"] --> G["California or Utah guide pack"]
  G --> M["React memory only"]
  M --> P["Browser PDF and text packet"]
  S["Versioned official-source manifest"] --> R
  S --> G
  I["Guide ID + step ID only"] --> A["Optional GPT-5.6 explanation"]
  M -. "never sent" .-x A
```

- `POST /api/next-step` accepts three enums only.
- `POST /api/explain-step` accepts guide ID, step ID, and detail level only.
- GPT requests use `store:false`, no tools, strict JSON Schema, bounded output, and an allowlisted source set.
- D1 stores only reusable finite-output cache entries and a global daily AI counter.
- A stale guide disables form-specific preparation.
- `pdf-lib` builds the review packet locally in the browser.

## Source Maintenance

```powershell
npm run sources:check
```

The weekly workflow checks only allowlisted official URLs, with two-second spacing and no retries. A broken or changed source opens a review issue. Guidance stays held until the current official written source is verified and approved. See [docs/SOURCE_MAINTENANCE.md](docs/SOURCE_MAINTENANCE.md).

## Verification

```powershell
npm run typecheck
npm run lint -- --max-warnings=0
npm run test:unit
npm run build
```

Tests cover all router combinations, jurisdiction isolation, stale-source holds, input schemas, model failure, invented source IDs, exact-word preservation, multi-page PDF output, private-answer exclusion, and public-source hygiene.

## Privacy And Legal Boundary

Personal answers are not legal advice, are not a court form, and are not proof of filing or service. The generated packet is marked `DRAFT - NOT FILED - HUMAN REVIEW REQUIRED`.

Use a private device for sensitive preparation. Download before closing if you want to retain the session. Confirm jurisdiction, forms, timing, attachments, filing, service, safety, and accessibility with court self-help, legal aid, or a qualified lawyer.

## License

Code is licensed under Apache-2.0. The f1ghtback name, marks, founder story, and non-code brand assets are not granted under that license. See `TRADEMARKS.md`.
