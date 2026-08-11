---
name: remixx-report
description: Turn a real AI-assisted work session into one truthful, watchable Remixx review. Use when the creator says /report, asks to report or show what they just built, wants a post and demonstration video, or requests an edit to the current review.
---

# Report this work

```sh
npx --yes remixx-cli@latest report create --request "$REQUEST" --evidence-root "$EVIDENCE" --idempotency-key "$KEY" --wait --json
```

This is the only create invocation. Never substitute `@remixx/cli`, `remixx`, a global install, a cached
package, a repository script, or source code found on disk. Prepare `REQUEST`, `EVIDENCE`, and `KEY` as
described below before running it. If npm cannot resolve `remixx-cli@latest`, reports a missing client or 404,
or a command names another package, stop and return this message instead of finding a workaround:

> Remixx client unavailable. Run exactly: `npx --yes remixx-cli@latest report create …`

`@latest` is the pre-publication bootstrap marker. The canonical `/report` response replaces it everywhere
with the exact npm release as soon as the registry exposes one.

The human interface is the sentence that invoked this skill. Never ask the creator to install software, run a
command, or explain Remixx's machinery.

## Idea harness

1. Inspect the session's `git log`, committed diff, and working-tree diff. The diff is the spine of truth. Use
   the current transcript only when the host already provides it; never search for or reconstruct sessions.
2. List outcomes that now work and did not before. Drop config, lint, dependency, refactor, and test churn
   unless browser-visible behavior changed.
3. Rank demonstrability first and importance second. Prefer an outcome localhost can show through clicks in
   under 20 seconds. Reject activity titles; require an outcome sentence.
4. Compare the subject with recent Project posts and skip material repeats. If nothing passes, return
   `no_visible_change` with the concrete reason. Never manufacture a post.
5. Select one subject. It becomes `story.title`; the so-what becomes `story.caption`; one visible change
   becomes one continuous capture run. Do not show candidates, scripts, or capture plans for approval.

## Create the report

1. Exclude secrets, personal data, private logs, absolute paths, and uncertain claims. Render new
   user-generated text as text, never HTML.
2. For an existing Project, continue without a routine question. For a new Project, show only the proposed
   name, slug, and one-line public promise, followed by this terminal picker exactly:

   `1 approve · 2 edit · 3 cancel`

   That response authorizes only the Project proposal. Ask nothing else.

3. Write a `remixx-report-request.v2`. Use 3–5 observable states in one browser run; only the first state
   navigates. Continue accumulated product state thereafter. End each decisive action with an 800ms hold.
   Cap narration at 2.5 spoken words per second; caption-only is valid.
4. Set `presentation.template` to `product-demo-overlay-v1`, `musicMode` to `effects`, and `captionMode` to
   `word-synced`.
5. Put the request, evidence output, and idempotency key in a fresh OS temporary directory outside the
   creator's Project. Capture into `EVIDENCE` and write its `manifest.json`. Evidence IDs must match
   `privacy.allowedEvidenceIds`; use relative media paths and byte-derived metadata. Copy emitted
   `browser-capture-cues.v2` cues into the request. A click may name a `resultSelector` only when that result
   is absent before the click and visibly appears because of it.
6. Run the create invocation at the top. The skill owns truthful subject selection and capture execution. The
   client owns credentials, hashing, upload, retries, idempotency, and review state; the server owns rendering.

Human-readable progress is on stderr. Read stdout only as `remixx-client-result.v1` or
`remixx-client-error.v1`; never infer state by parsing friendly prose. On success, return only:

> [See your finished post and video](reviewUrl)
>
> Want changes? Tell me here. If it looks good, press **Post** there.

## Edits

Resolve the current Run, translate the creator's ordinary-language edit into a
`remixx-report-revision-request.v1`, inherit unchanged evidence by hash, and invoke:

```sh
npx --yes remixx-cli@latest report revise --request "$REQUEST" --evidence-root "$EVIDENCE" --idempotency-key "$KEY" --wait --json
```

Return the same review URL when ready. On error, report the stable `code` and concise `message`; do not
improvise a fallback pipeline.

## Boundaries

- The client supports localhost web applications only. Return `unsupported_capture_target` for anything else.
- Never publish. The authenticated **Post** action on the review page is the only publication authority.
- Never label agent preparation as creator approval.
- Keep generated requests and receipts out of tracked Project files.
- Do not build bootstrap, publication, storage, rendering, or provider mechanics from source.
