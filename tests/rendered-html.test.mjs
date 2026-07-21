import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("contains the guided filing and packet studio in public source", async () => {
  const files = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/contest-workspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/next-step-tool.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/guided-preparation-tool.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/guide-packs.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/packet-builder.ts", import.meta.url), "utf8"),
  ]);
  const source = files.join("\n");
  assert.match(source, /f1ghtback/);
  assert.match(source, /Guided Filing and Packet Studio/);
  assert.match(source, /California FL-320 response/);
  assert.match(source, /Utah family answer/);
  assert.match(source, /Cross-state/);
  assert.match(source, /No account\. No upload\. Answers stay in this tab\./);
  assert.match(source, /DRAFT - NOT FILED/);
  assert.match(source, /thefaythai\.companion\.v1/);
  assert.match(source, /Nothing files or sends automatically/);
  assert.doesNotMatch(source, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("keeps the public app free of seeded cases and private product surfaces", async () => {
  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
  const files = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/contest-workspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/guided-preparation-tool.tsx", import.meta.url), "utf8"),
  ]);
  const source = files.join("\n");
  assert.doesNotMatch(source, /vault|pairing|team ops|fantasia queue|\.fayth/i);
  assert.doesNotMatch(source, /fictional (person|case|transcript|record)|sample case|seeded case/i);
  assert.doesNotMatch(source, /file upload|automatic filing/i);
  assert.match(source, /Personal answers stay only in browser memory/i);
  assert.match(source, /not legal advice/i);
});

test("answer entry code has no persistent browser storage calls", async () => {
  const source = await readFile(new URL("../app/guided-preparation-tool.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|document\.cookie|serviceWorker/i);
  assert.match(source, /body: JSON\.stringify\(\{ guideId, stepId: currentStep\.id, detailLevel \}\)/);
});
