import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("contains the complete public product in the built source", async () => {
  const files = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/next-step-tool.tsx", import.meta.url), "utf8"),
  ]);
  const source = files.join("\n");
  assert.match(source, /f1ghtback/);
  assert.match(source, /What is the one thing you need to do next/);
  assert.match(source, /California/);
  assert.match(source, /Utah/);
  assert.match(source, /Cross-state/);
  assert.match(source, /No names\. No uploads\. No case storage\./);
  assert.match(source, /Built with Codex and GPT-5\.6/);
  assert.doesNotMatch(source, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("removes starter preview code and private product surfaces", async () => {
  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
  const files = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/next-step-tool.tsx", import.meta.url), "utf8"),
  ]);
  const source = files.join("\n");
  assert.doesNotMatch(source, /vault|pairing|team ops|fantasia queue|\.fayth/i);
  assert.doesNotMatch(source, /case number[^,]*input|textarea|file upload/i);
  assert.match(source, /does not provide legal advice/i);
});
