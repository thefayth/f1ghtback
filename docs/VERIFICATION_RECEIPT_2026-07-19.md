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
- Owner-only Sites version 1 deployed successfully at
  https://f1ghtback-one-safe-next-step.indigo-iris-5804.chatgpt.site.
- Anonymous access returned `401` while the owner-only policy was active.
- Sites version 2 deployed successfully with the final canonical metadata.
- The contest Sites project was deliberately changed to public after private
  verification; anonymous page access returned `200` and the public API
  returned a valid Utah-scoped source-only response.
- Public desktop and mobile browser checks passed with no overflow, failed
  requests, page errors, or focus regression.
- Public repository verified at https://github.com/thefayth/f1ghtback.
- The separate `f1ghtback Private Command` Sites project remains owner-only.

## Local Review Artifacts

- `outputs/qa/desktop-final.png`
- `outputs/qa/mobile-final.png`
- `outputs/qa/canva-youtube-thumbnail.png`
- `docs/assets/product-desktop.png` - SHA-256
  `12C94A0F9929859BD363860DE30581C1BE91ABADD99D3F9F5B8E375CDA6247BD`
- `docs/assets/product-mobile.png` - SHA-256
  `95F6F54469D29CCA9510B3FE7CA6062C500839B4ABB57709DA2FAFC229002D50`

The local QA folder is intentionally excluded from Git and deployment.
