# Verification Receipt

Date: 2026-07-19

Project: `f1ghtback: One Safe Next Step`

## Verified

- `npm test`: build passed; 15 of 15 tests passed.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed.
- `npm audit --omit=dev`: zero known vulnerabilities.
- All 45 jurisdiction, need, and timing combinations returned the exact public
  response shape and valid jurisdiction-scoped source IDs.
- Extra fields and malformed, oversized, and wrong-content-type requests were
  rejected with `400`, `413`, or `415` as appropriate.
- Desktop viewport: 1440 px, no horizontal overflow, completed result visible.
- Mobile viewport: 390 px, no horizontal overflow, completed result visible.
- Narrow/zoom-equivalent viewport: 720 px, keyboard-only selection and submit
  passed, result focus passed, and reduced-motion preference was detected.
- Text secret/email scan: no matches.
- Public runtime private-product scan: no matches.
- No-fiction/no-demo runtime scan: no matches.
- Official source URLs were checked on 2026-07-19.

## Privacy State

- The public interface accepts only three enums.
- No name, email, case narrative, case number, upload, account, analytics, or
  personal record is accepted or stored.
- D1 may store only hashed daily network counters and globally reusable,
  validated output for one of the 45 finite combinations.
- The model request uses only the three enums and curated official-source
  metadata.

## Deployment State

- Contest Sites project created separately from the private command site.
- Initial access is custom and owner-only: Faith is the sole allowed user.
- `NEXT_STEP_RATE_SALT` is installed as a masked Sites secret.
- `OPENAI_API_KEY` is not yet configured; the deployed app therefore uses its
  fully functional, clearly labeled source-only path until the masked key is
  added.

## Local Review Artifacts

- `outputs/qa/desktop-final.png`
- `outputs/qa/mobile-final.png`
- `outputs/qa/canva-youtube-thumbnail.png`

The local QA folder is intentionally excluded from Git and deployment.
