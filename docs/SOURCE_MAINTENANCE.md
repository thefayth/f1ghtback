# Official Source Maintenance

f1ghtback treats legal guidance as a versioned source pack, not model memory.

## Weekly check

`npm run sources:check` checks only URLs in `app/lib/source-manifest.ts`. It spaces requests by two seconds, performs no retries or discovery, records redirects and a bounded content hash, and writes a redacted receipt to `outputs/official-source-check.json`.

A broken or changed link fails the GitHub workflow and opens a `source-review` issue. The affected guide must remain held until a human verifies the current official written source and approves the source-pack change.

The baseline is updated deliberately with `npm run sources:baseline` only after review. A reachable page is not proof that its procedure, form revision, timing, fee, or local rule is unchanged.

## Listen Up maintainer intake

Listen Up may locally transcribe an official court webinar, briefing, or caption file. That transcript is a quarantined research candidate, never controlling guidance.

1. Preserve the original URL, title, publisher, date, timestamps, and local transcript receipt.
2. Keep the transcript outside this public repository.
3. Ask Codex or Fantasia to propose a source-pack diff without copying private Listen Up code or media.
4. Find the controlling official written page, form, rule, or instruction.
5. Require human approval before changing a guide, checked date, review date, or baseline.

Audio, video, transcripts, model summaries, blogs, and search snippets cannot replace an official written source.
