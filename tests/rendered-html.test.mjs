import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("contains the complete record-review, routing, and preparation workspace", async () => {
  const files = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/contest-workspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/transcript-review-tool.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/transcript-review.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/next-step-tool.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/guided-preparation-tool.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/guide-packs.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/packet-builder.ts", import.meta.url), "utf8"),
  ]);
  const source = files.join("\n");
  assert.match(source, /f1ghtback/);
  assert.match(source, /One Safe Next Step/);
  assert.match(source, /Record to action/);
  assert.match(source, /Find my next step/);
  assert.match(source, /Guided preparation/);
  assert.match(source, /Public Hold active/);
  assert.match(source, /bigstick\.ai-receipt\.v1/);
  assert.match(source, /bigstick\.evidence-promotion\.v1/);
  assert.match(source, /California FL-320 response/);
  assert.match(source, /Utah family answer/);
  assert.match(source, /Cross-state/);
  assert.match(source, /Synthetic demo\. Device-only guides\. Public Hold\./);
  assert.match(source, /DRAFT - NOT FILED/);
  assert.match(source, /thefaythai\.companion\.v1/);
  assert.match(source, /Nothing files or sends automatically/);
  assert.doesNotMatch(source, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("keeps the demo synthetic and private product surfaces out of the public edition", async () => {
  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
  const files = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/contest-workspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/transcript-review-tool.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/guided-preparation-tool.tsx", import.meta.url), "utf8"),
  ]);
  const source = files.join("\n");
  assert.doesNotMatch(source, /vault|pairing|team ops|fantasia queue|\.fayth/i);
  assert.match(source, /fictional transcript/i);
  assert.match(source, /Do not paste names, case numbers, child information, medical details, or private records/i);
  assert.doesNotMatch(source, /file upload|automatic filing|attorney-client relationship is created/i);
  assert.match(source, /Guided filing answers stay in browser memory/i);
  assert.match(source, /not legal advice/i);
});

test("answer entry code has no persistent browser storage calls", async () => {
  const source = await readFile(new URL("../app/guided-preparation-tool.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|document\.cookie|serviceWorker/i);
  assert.match(source, /body: JSON\.stringify\(\{ guideId, stepId: currentStep\.id, detailLevel \}\)/);
});
