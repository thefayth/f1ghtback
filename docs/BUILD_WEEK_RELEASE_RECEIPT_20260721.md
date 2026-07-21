# Build Week Release Receipt

Updated: 2026-07-21

## Current release candidate

- Product: `f1ghtback: Guided Filing and Packet Studio`
- Category: `Apps for Your Life`
- Public app: https://f1ghtback-one-safe-next-step.indigo-iris-5804.chatgpt.site
- Public repository: https://github.com/thefayth/f1ghtback
- Codex feedback session: `019f72c5-b343-7a92-86c3-f17aa667f2d7`
- Current verified source: `docs/VERIFICATION_2026-07-21.md`

The current release candidate contains the structured next-step router,
California FL-320 response coach, Utah family answer coach, browser-only answer
state, text/PDF review packets, bounded GPT explanations, and official-source
maintenance. It does not contain the earlier public transcript-review
experiment or its screenshots.

## Verification

- TypeScript: passed
- ESLint with zero warnings: passed
- Production vinext build: passed
- Automated tests: `26 passed, 0 failed`
- Production dependency audit: `0 vulnerabilities`
- Official sources: `14 reachable, 0 broken, 0 changed`
- Desktop California QA: `1440 x 1000`
- Mobile California QA: `390 x 844`
- Personal packet answers: browser memory only and excluded from GPT prompts
- Cross-state cases: form-specific guidance held for human review

## Runtime

- Exact API model ID: `gpt-5.6-sol`
- Responses API contract: strict JSON Schema, `store:false`, no tools, bounded
  input and output
- Missing key, quota failure, timeout, malformed output, legal conclusion, or
  invented source ID: deterministic source-only fallback

The previously recorded Sites version 4 deployment succeeded under deployment
ID `appgdep_6a5f2b90e9448191bfdb769ad3c25589`. It predates the final
guided-filing-only reconciliation and must not be treated as proof of the new
live tree until the post-deployment check is recorded.

## Remaining account actions

1. Publish the prepared under-three-minute video on YouTube.
2. Add the public video URL to `docs/DEVPOST_SUBMISSION.md`.
3. Review the live app, repository, submission declaration, and submit on
   Devpost.

No private Big Stick record, evidence, transcript, child information, case data,
credential, passcode, desktop storage, or worker storage is included.
