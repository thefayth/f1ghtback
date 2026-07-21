import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { OFFICIAL_SOURCES, SOURCE_MANIFEST_VERSION } from "../app/lib/source-manifest.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(root, "outputs", "official-source-check.json");
const baselinePath = resolve(root, "docs", "official-source-baseline.json");
const updateBaseline = process.argv.includes("--update-baseline");
const MAX_URLS = 25;
const MAX_BYTES = 256 * 1024;
const REQUEST_TIMEOUT_MS = 15_000;
const SPACING_MS = 2_000;

function sleep(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

async function readPrefix(response) {
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (total < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      const remaining = MAX_BYTES - total;
      const part = value.byteLength > remaining ? value.slice(0, remaining) : value;
      chunks.push(Buffer.from(part));
      total += part.byteLength;
      if (part.byteLength < value.byteLength) break;
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return Buffer.concat(chunks);
}

function stableHashInput(bytes, contentType) {
  if (!contentType.toLowerCase().includes("text/html")) return bytes;
  const visibleText = new TextDecoder("utf-8", { fatal: false })
    .decode(bytes)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:nbsp|amp|quot|#39);/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return Buffer.from(visibleText, "utf8");
}

async function inspectSource(id, source) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(source.url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        accept: "text/html,application/pdf,application/json;q=0.8,*/*;q=0.5",
        "user-agent": "f1ghtback-source-review/1.0 (+https://github.com/thefayth/f1ghtback)",
      },
    });
    const bytes = await readPrefix(response);
    const contentType = response.headers.get("content-type") ?? "";
    const hashInput = stableHashInput(bytes, contentType);
    return {
      id,
      url: source.url,
      finalUrl: response.url,
      statusCode: response.status,
      ok: response.ok,
      contentType,
      contentLength: response.headers.get("content-length") ?? "",
      prefixBytes: bytes.byteLength,
      prefixSha256: createHash("sha256").update(hashInput).digest("hex"),
      hashMode: contentType.toLowerCase().includes("text/html") ? "visible-text-prefix" : "binary-prefix",
      error: null,
    };
  } catch (error) {
    return {
      id,
      url: source.url,
      finalUrl: "",
      statusCode: 0,
      ok: false,
      contentType: "",
      contentLength: "",
      prefixBytes: 0,
      prefixSha256: "",
      hashMode: "none",
      error: error instanceof Error ? error.name : "request-failed",
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function loadBaseline() {
  try {
    return JSON.parse(await readFile(baselinePath, "utf8"));
  } catch {
    return { manifestVersion: null, sources: {} };
  }
}

const entries = Object.entries(OFFICIAL_SOURCES);
if (entries.length > MAX_URLS) throw new Error(`Source check is limited to ${MAX_URLS} allowlisted URLs.`);

const baseline = await loadBaseline();
const results = [];
for (const [index, [id, source]] of entries.entries()) {
  if (index > 0) await sleep(SPACING_MS);
  const inspected = await inspectSource(id, source);
  const prior = baseline.sources?.[id];
  const changed = Boolean(
    prior
      && inspected.ok
      && (prior.finalUrl !== inspected.finalUrl || prior.prefixSha256 !== inspected.prefixSha256),
  );
  results.push({ ...inspected, changed, baselinePresent: Boolean(prior) });
  process.stdout.write(`${id}: ${inspected.ok ? inspected.statusCode : inspected.error ?? inspected.statusCode}${changed ? " changed" : ""}\n`);
}

const receipt = {
  format: "f1ghtback.official-source-check.v1",
  generatedAt: new Date().toISOString(),
  manifestVersion: SOURCE_MANIFEST_VERSION,
  policy: { allowlistedUrls: entries.length, maxUrls: MAX_URLS, spacingMs: SPACING_MS, retries: 0, prefixBytes: MAX_BYTES },
  summary: {
    checked: results.length,
    reachable: results.filter((item) => item.ok).length,
    broken: results.filter((item) => !item.ok).length,
    changed: results.filter((item) => item.changed).length,
    missingBaseline: results.filter((item) => !item.baselinePresent).length,
  },
  results,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");

if (updateBaseline) {
  const nextBaseline = {
    format: "f1ghtback.official-source-baseline.v1",
    updatedAt: receipt.generatedAt,
    manifestVersion: SOURCE_MANIFEST_VERSION,
    sources: Object.fromEntries(results.filter((item) => item.ok).map((item) => [item.id, {
      finalUrl: item.finalUrl,
      statusCode: item.statusCode,
      contentType: item.contentType,
      prefixSha256: item.prefixSha256,
      hashMode: item.hashMode,
    }])),
  };
  await writeFile(baselinePath, `${JSON.stringify(nextBaseline, null, 2)}\n`, "utf8");
}

if (receipt.summary.broken > 0 || (!updateBaseline && (receipt.summary.changed > 0 || receipt.summary.missingBaseline > 0))) {
  process.exitCode = 1;
}
