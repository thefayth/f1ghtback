# Devpost Submission Draft

## Project

**f1ghtback: Guided Filing and Packet Studio**

Category: **Apps for Your Life**

Tagline: Understand the papers, prepare your response, and keep your words private.

## Inspiration

Family court can confront a self-represented person with urgent timing, disability barriers, unfamiliar forms, and more information than anyone can comfortably hold at once. f1ghtback was built by Faith Atwater-Cheltenham, a Black mother and disabled technologist, from lived experience navigating that overload.

The goal is not to let a model choose a form or decide what is legally sufficient. It is to help a person reach one contained next step, preserve their exact language, and arrive at human review better prepared.

## What It Does

The source-backed router turns three non-personal choices into one next action, a short checklist, focused review questions, and official California, Utah, or accessibility links. Cross-state uncertainty blocks state-form recommendations.

Two deep walkthroughs guide a person through California FL-320 response preparation or Utah family answer preparation. The user identifies papers, records dates for human review without deadline calculation, maps requested orders or petition paragraphs, writes in their own words, creates a declaration or document scaffold, lists exhibits without uploading them, and tracks filing and service questions.

The browser creates a marked draft PDF and text companion packet. Personal answers remain in the tab and are never sent to GPT, Sites, D1, analytics, or persistent browser storage.

## How It Was Built

The app uses Next.js, React, TypeScript, vinext, OpenAI Sites, Cloudflare Workers, D1, `pdf-lib`, and the OpenAI Responses API.

GPT-5.6 is optional and explains only a selected guide step. It receives guide ID, step ID, detail level, and curated official source metadata, with no names, dates, narratives, case numbers, addresses, or answers. Requests use no tools, `store:false`, strict structured output, a global capped budget, reusable finite-output caching, and deterministic fallback.

## How Codex Helped

Codex inspected the larger private system, isolated a public-safe product, consolidated the source registry, built the guide-pack schema and two walkthroughs, implemented local packet generation, added bounded GPT explanations, wrote privacy and legal-boundary tests, created the source-maintenance workflow, ran browser QA, and prepared Sites and GitHub releases.

## Challenges

The central problem was building a genuinely useful long-answer tool without turning a public website into an intake database. The solution is architectural: answers live only in React memory, model calls accept enum-like IDs only, packets are generated on-device, state jurisdictions remain separated, stale sources fail closed, and every output requires human review.

## Accomplishments

- Two form-matched, one-question-at-a-time response coaches.
- Exact-word preservation and browser-side PDF/text packet generation.
- Zero account, upload, case database, analytics, or answer persistence.
- Optional GPT-5.6 explanations that never receive personal answers.
- Source versions, review dates, link/hash monitoring, and stale-guide shutdown.
- Cross-state safeguards and deterministic source-only operation.
- A manual `thefaythai.companion.v1` export with no automatic integration.

## What Is New During Build Week

This public Sites app, the safe-next-step router, California and Utah guide packs, local packet studio, bounded explanation API, privacy tests, source-maintenance workflow, responsive interface, and contest release package were built during Build Week. Private Big Stick records and application code remain outside the contest repository.

## What Is Next

The same guide-pack engine can add reviewed California DVRO responses, fee waivers, ADA accommodations, and custody requests, followed by Utah protective orders, temporary orders, modifications, enforcement, support, and fee waivers. Form PDF writing remains held until revision hashes, field maps, round trips, and visual tests pass.

## Submission Links

- Live app: https://f1ghtback-one-safe-next-step.indigo-iris-5804.chatgpt.site
- Repository: https://github.com/thefayth/f1ghtback
- Video: [PUBLIC_YOUTUBE_URL]
- Codex feedback session: `019f72c5-b343-7a92-86c3-f17aa667f2d7`
