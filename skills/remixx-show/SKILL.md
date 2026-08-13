---
name: remixx-show
description: Show work already built in the current local web project as a private, ready-to-post video post. Use when the creator says "show what I built", asks for a "video post", says "Use remixx.org to show what I just built here as a video post.", requests an edit to the current private review, or has a legacy /report prompt.
---

# Show what you built

> **Use remixx.org to show what I just built here as a video post.**

Use this skill to prepare a truthful video post about work already present in the current local web project.
Do not add features merely to create something to post, and do not publish anything: the creator reviews the
private result and is the only person who can press **Post**.

If there is no safe, visibly demonstrable outcome, stop honestly. Do not substitute a markdown report,
generated image, manual recording instructions, or another publication path.

## Start the compatible client flow

The current published client uses `report` only as a compatibility protocol command. Run its exact commands
below; the creator's action and the artifact remain **show** and **video post**.

```sh
npx --yes remixx-cli@latest report context --intent "$INTENT" --workspace "$PWD" --json
```

This context handshake is always first. Infer a proposed Project name and one-line public promise from the
current Project and write `remixx-project-intent.v1` in a fresh OS temporary directory. The intent may contain
a canonical `https://remixx.org/p/<slug>` URL only when the creator supplied it in the current conversation.
It never contains a Project ID, filesystem path, Git diff, credential, or model-minted receipt.

The server response is authoritative:

- `mode: existing` means continue that exact owned Project. Use `recentPosts` to understand what its audience
  has already seen and make this post about only the new visible progress.
- `mode: new` means this is a first post. Briefly show the proposed name, slug, and promise. Use the host's
  native picker when it has one; otherwise ask one compact question accepting **Continue**, **Edit**, or
  **Cancel**. Continue is the recommended default. Never print a numeric menu.
- `mode: ambiguous` means ask the creator to choose among the returned named Project links. Never silently
  choose a similar Project.

The context call creates neither a Project nor a private run. Keep its opaque `resolutionToken` in the OS
temporary directory for the create command. Do not decode, edit, log, or place it in the creator's repo.

## Choose the new progress

1. Inspect only this Project's `git log`, committed diff, working-tree diff, and runnable localhost app. The
   diff is the spine of truth. Use the current transcript only when the host already provides it; never search
   for or reconstruct sessions.
2. List outcomes that now work and did not before. Drop config, lint, dependency, refactor, and test churn
   unless browser-visible behavior changed.
3. Compare candidates with every returned `recentPosts` title, caption, and outcome. A later phase must show
   the delta since the latest publication—not retell the first post with a new caption.
4. Rank demonstrability first and importance second. Prefer an outcome localhost can show through clicks in
   under 20 seconds. Reject activity titles; require one outcome sentence.
5. Select the strongest non-repeating subject yourself. Do not ask the creator to approve routine editorial
   choices. If nothing genuinely new is visible, return `no_visible_change` with the concrete reason.

## Capture and create

Write `remixx-report-request.v3`. It has `continuity`, never `project.projectId`:

- first post: `basePostId` and `basePublicationHash` are `null`;
- continuation: copy the latest context watermark exactly;
- `newOutcome` states what is visibly possible now that the recent posts did not already demonstrate.

### Copyable v3 request

This complete shape is a first post. Change values, not keys. For a continuation, copy both
`latestPublication` values into `continuity` and write its new visible outcome. Keep the opaque
`resolutionToken` out of JSON; it is only an argument to `report create`.

```json
{
  "schemaVersion": "remixx-report-request.v3",
  "outcome": "ready_for_capture",
  "continuity": {
    "basePostId": null,
    "basePublicationHash": null,
    "newOutcome": "A maker can turn an empty board into a working route."
  },
  "story": {
    "title": "Draw a route and watch the city respond",
    "caption": "Connected stations turn the map into a network.",
    "body": "The demo draws a route, adds stations, and shows the city responding.",
    "narration": "Draw a route. Add stations. Watch the city respond."
  },
  "claims": [
    {
      "statement": "Connected stations make the city respond.",
      "evidenceRefs": ["capture:network"]
    }
  ],
  "capture": {
    "target": { "kind": "localhost-web", "url": "http://127.0.0.1:3000" },
    "viewport": { "width": 1280, "height": 720 },
    "scenes": [
      {
        "sceneId": "empty_map",
        "path": "/",
        "readySelector": "[data-ready]",
        "actions": [
          {
            "kind": "waitFor",
            "selector": "[data-ready]",
            "state": "visible",
            "timeoutMs": 10000
          },
          { "kind": "hold", "durationMs": 800 }
        ]
      },
      {
        "sceneId": "route_drawn",
        "continueFromPrevious": true,
        "readySelector": "[data-route-drawn]",
        "actions": [
          { "kind": "click", "selector": "[data-draw-route]", "afterMs": 500 },
          { "kind": "hold", "durationMs": 800 }
        ]
      },
      {
        "sceneId": "stations_added",
        "continueFromPrevious": true,
        "readySelector": "[data-stations-added]",
        "actions": [
          { "kind": "click", "selector": "[data-add-station]", "afterMs": 500 },
          { "kind": "hold", "durationMs": 800 }
        ]
      }
    ],
    "cues": [],
    "budget": { "maxDurationMs": 20000, "maxOutputBytes": 33554432 }
  },
  "privacy": {
    "excludedPatterns": [],
    "allowedEvidenceIds": ["capture:network"]
  },
  "presentation": {
    "template": "product-demo-overlay-v1",
    "narrationMode": "spoken-preferred",
    "musicMode": "effects",
    "captionMode": "word-synced"
  }
}
```

Use 3–5 accumulated observable states. Only the first state must navigate; later states continue from prior
state unless they intentionally change route. End each decisive state with an 800ms hold. Use exactly one
allowed evidence ID for the continuous screencast. Keep narration within 2.5 spoken words per second. Set
`product-demo-overlay-v1`, `effects`, and `word-synced` presentation values. Exclude secrets, personal data,
private logs, absolute paths, and uncertain claims.

The client—not the agent—executes Playwright, draws interactions, probes the resulting bytes, and writes the
evidence manifest:

```sh
npx --yes remixx-cli@latest report capture --request "$REQUEST" --output-dir "$EVIDENCE" --json
```

Then create the resolved draft:

```sh
npx --yes remixx-cli@latest report create --request "$REQUEST" --resolution-token "$RESOLUTION" --workspace "$PWD" --evidence-root "$EVIDENCE" --idempotency-key "$KEY" --wait --json
```

Use only `remixx-cli@latest`. Never substitute a global install, cached package, repository script, local
Remixx source, credentials, another dev folder, an old transcript, or a Project ID found on disk. If the
package is unavailable, stop with `Remixx client unavailable` rather than building a workaround.

If stdout returns `authentication_required`, run `npx --yes remixx-cli@latest login --json`, complete the
browser connection, and retry the identical command and idempotency key. Read stdout only as versioned JSON;
human-readable progress is on stderr.

On success, return only:

> [See your finished post and video](reviewUrl)
>
> Want changes? Tell me here. If it looks good, press **Post to _Project name_** there.

The review may be a new-Project draft even though no Project exists yet. Pressing **Post** is the sole
authority that atomically creates that Project and publishes its first post. Never publish from the agent.

## Edits

Translate ordinary-language feedback into `remixx-report-revision-request.v2`, inherit unchanged evidence by
hash, capture only when visible evidence changes, and invoke:

```sh
npx --yes remixx-cli@latest report revise --request "$REQUEST" --evidence-root "$EVIDENCE" --idempotency-key "$KEY" --wait --json
```

Revision custody comes from the Run. Never resolve or accept a different Project destination during revise.
Return the same review URL when ready. On error, report the stable `code` and concise `message`; do not
improvise a fallback pipeline.
