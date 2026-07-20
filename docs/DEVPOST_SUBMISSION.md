# Devpost Submission Draft

## Project

**f1ghtback: One Safe Next Step**

Category: **Apps for Your Life**

Tagline: A source-grounded legal-information guide that turns court overwhelm into one contained action.

## Inspiration

Family court can confront a person with unfamiliar procedures, urgent timing, disability barriers, and a frightening amount of information at once. f1ghtback was built by Faith Atwater-Cheltenham, a Black mother and disabled technologist, from lived experience navigating that overload.

The first problem to solve is not every legal question. It is helping someone identify one safe, source-backed next action without asking them to publish their story or trust a model with private case facts.

## What It Does

The user chooses a jurisdiction, a practical need, and a timing window. f1ghtback returns one next action, a short checklist, questions to take to court self-help, legal aid, or counsel, and links to allowlisted official sources.

The app accepts no free-text narrative, identifying information, account, or document. California and Utah sources remain separate. Cross-state uncertainty blocks form-specific conclusions and routes the user to human review.

## How It Was Built

The public entry uses Next.js, React, TypeScript, vinext, OpenAI Sites, Cloudflare Workers, D1, and the OpenAI Responses API.

GPT-5.6 receives only enumerated selections and curated source metadata. It returns structured output containing an action, checklist, review questions, and official source IDs. The server rejects unknown source IDs and maps approved IDs to real links. If the model, key, rate budget, or response validation fails, the application returns a labeled deterministic source-only result.

## How Codex Helped

Codex was used to inspect a much larger private desktop system, isolate a public-safe product, preserve the no-case-data boundary, implement the structured workflow and GPT endpoint, build legal and privacy tests, perform browser QA, prepare the Sites release, and package the public GitHub repository and submission materials.

## Challenges

The central challenge was making AI useful without turning a public contest app into a place where people disclose sensitive court facts. The product therefore uses bounded inputs, official source allowlists, jurisdiction isolation, output validation, human-review markers, and a deterministic fallback.

## Accomplishments

- A complete action-first experience rather than a chatbot or marketing page.
- No fictional cases, seeded users, personal-data fields, or staged model responses.
- California and Utah source separation with cross-state stop rules.
- GPT-5.6 structured output that cannot publish invented links.
- A useful source-only mode when AI is unavailable.
- A public implementation separated from the private evidence and desktop systems that inspired it.

## What Is Next

The next stage is an offline Windows edition with encrypted local records, source-pack refresh receipts, exportable attorney-review bundles, and additional jurisdiction packs. Private evidence processing and filing preparation will remain local and human-reviewed.

## Submission Links

- Live app: `[LIVE_SITES_URL]`
- Repository: `https://github.com/thefayth/f1ghtback`
- Video: `[PUBLIC_YOUTUBE_URL]`
- Codex feedback session: `[FEEDBACK_SESSION_ID]`
