# Guided Filing Studio Verification Receipt

Date: 2026-07-21

Scope: public contest edition only. This receipt contains no personal answers,
case records, credentials, evidence, transcripts, or private project data.

## California status

- The California FL-320 response coach is implemented as a nine-step guided
  preparation flow.
- The flow identifies an FL-300 Request for Order, confirms the California-only
  jurisdiction boundary, records the service date without calculating a
  deadline, maps requested orders, preserves the user's exact words, builds a
  facts scaffold and exhibit index, prepares human-review questions, and tracks
  filing and service.
- A California-only answer proceeds. Cross-state uncertainty holds form-specific
  guidance and routes the user to human review.
- Personal answers remain in React memory only. Closing the tab clears them.
- Browser-side exports produce a text packet and PDF marked
  `DRAFT - NOT FILED - HUMAN REVIEW REQUIRED`.
- The optional AI explainer receives only guide ID, step ID, detail level, and
  allowlisted source metadata. It does not receive packet answers.

## Automated checks

| Check | Result |
|---|---|
| ESLint with zero warnings | Pass |
| TypeScript `tsc --noEmit` | Pass |
| Unit and source-boundary tests | 26 passed, 0 failed |
| Production Sites build | Pass |
| Production dependency audit | 0 vulnerabilities |
| Git whitespace check | Pass; Windows line-ending notices only |
| Secret-pattern scan | No matches |
| Private-project/material scan | No exposed material; matches are safety rules and tests only |

## Official-source check

The bounded source checker used an explicit 14-URL allowlist, two-second
spacing, zero retries, a 15-second timeout, and a 256 KB response prefix limit.

- Reachable: 14 of 14
- Broken: 0
- Changed from recorded baseline: 0
- Missing baseline: 0

California form-specific sources include the California Courts Request for
Order response guide, current FL-320 page, and Rule of Court 5.92. Source-pack
review dates remain enforced in the app.

## Browser and visual checks

- Desktop California guide: verified at 1440 x 1000.
- Mobile California guide: verified at 390 x 844.
- 200 percent desktop reflow equivalent: verified through the 640 CSS-pixel
  breakpoint; the document does not gain horizontal page overflow.
- Mobile step navigation intentionally scrolls horizontally inside its own
  progress rail.
- Browser console warnings and errors during the California mobile pass: none.
- Long answers remain verbatim in the live preview.

Receipts:

- `docs/assets/california-guide-desktop.png`
- `docs/assets/california-guide-mobile.png`
- `outputs/official-source-check.json` (local generated receipt; excluded from
  the public Git tree)

## Remaining release gates

1. Reconcile and push the isolated verified branch to
   `https://github.com/thefayth/f1ghtback`.
2. Deploy the same verified source to the existing public Sites project.
3. Verify the anonymous live page, California walkthrough, API fallback, and
   source links after deployment.
4. Update the contest submission links and final walkthrough only after the live
   checks pass.
