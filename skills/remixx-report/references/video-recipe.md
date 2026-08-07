# Making the video

The job is to take a real working session and produce a short video someone would actually watch. Not a
slideshow of prose, and not a template with slots to fill.

## Start from what happened

Before anything else, answer plainly: **what did this session do?** Then find the story that is already in
it. The evidence decides the story — never pick a shape first and then go looking for something to fill
each slot.

There is no required beat structure. A session that fixed one thing is one clear story. A session that
tried three things and got one working is a different story, and it is allowed to be told that way.

Two habits, not templates:

- **Lead with the thing itself.** Show it working in the first few seconds. Context can come after.
- **Do not oversell.** If something is half-done, say so in one line and move on. This is a value, not a
  required section. Never manufacture a caveat to look balanced, and never hide a real one to look better.

`beats[]` entries take an optional free-form `storyBeat` label. Use it to organise your own plan. Nothing
validates a particular set of labels or their order.

## Required production artifacts

Create one private `report-video-plan.v1` JSON containing:

- `sourceChapterHash`, `approvedClaimRefs[]`, `durationMs`, `evidenceFrameRatio`, and `titleOccurrences`
  (exactly `1`).
- `beats[]`: `beatId`, optional `storyBeat` label, `atMs`, `durationMs`, `claim`, `proofKind`,
  `mustShowMs`, `assetIds[]`, `narrationSegmentIds[]`, and `claimRefs[]`.
- `assets[]`: `assetId`, `kind`, `path`, `sha256`, `width`, `height`, optional `durationMs`,
  `reproducibility`, optional `crop`, and `captureTimeRedactions[]`.
- `narrationSegments[]`: `segmentId`, `beatId`, `atMs`, `durationMs`, `spoken`, `caption`, `claimRefs[]`,
  and `provenance` (`model_derived`, `founder_recorded`, `founder_edited`, or `synthetic`).
- `cues[]`: `cueId`, `beatId`, `atMs`, `durationMs`, `kind`, target asset plus selector or rectangle,
  optional text, and easing.
- `privacy`: `structuralRedactions[]`, deliberately `retainedPublicProof[]` with reasons, and
  `founderApprovalState` (`pending`, `approved`, or `rejected`).
- `approval`: contact-sheet `status` (`pending`, `approved`, or `rejected`), plus nullable `approvedBy` and
  `approvedAt` until approved.

Use only claim refs present in `approvedClaimRefs`. Keep beats non-overlapping; keep each narration segment
inside its named beat. Resolve relative asset paths from the plan file. Use
`reproducibility: { reproducible, source }`, adding capture time when the source is live. Use cue targets
shaped as `{ assetId, selector }` or `{ assetId, rect: { x, y, width, height } }`. Use retained-proof
entries shaped as `{ assetId, reason }`.

Run `node <skill-directory>/scripts/validate_video_plan.mjs <plan.json>` before review. After recording
contact-sheet approval and changing the privacy state to `approved`, run it again with
`--require-approved`; the command verifies both approvals and referenced file hashes, then prints the exact
plan-file hash for the renderer handoff.

Supported proof kinds: `before_state`, `ui_state`, `interaction`, `external_console`, `negative_evidence`.

Use screenshots for stable states. Use screencasts for `interaction` and `negative_evidence` — a still
cannot prove a click worked, or that something stayed unchanged while everything else moved.

## Visual grammar

1. Fill most of the frame with the thing itself.
2. Show the title once.
3. Put the proof on screen while its claim is spoken.
4. Cause motion from meaning: start a zoom on the named word, draw a box when the object is named, animate
   an arrow when a relationship is explained.
5. Avoid visually unchanged gaps longer than about four seconds. Continuous product video counts as motion.
6. Keep real interactions at normal speed. Show at least three seconds of resulting motion for a playback
   claim.
7. Cursor ring for clicks. Boxes and short labels for fields. A struck or dotted arrow for a missing
   connection.
8. Keep captions secondary to the evidence.

Frame **portrait** where you can. The post's media well is 4:5 and crops the sides off a landscape capture.

## Capturing

Use a dedicated, gitignored browser profile. Complete any OAuth manually once and reuse only that profile.
Never copy cookies from the founder's normal browser profile.

- **Deterministic UI:** drive the page with Playwright and capture a browser screencast. Save element
  rectangles and action coordinates, and render the cursor path from those same coordinates.
- **External setup or consent screens:** capture the smallest useful crop. Mask client IDs, secrets, email,
  account chrome and unrelated scopes before the screenshot exists.

For live third-party media, record `reproducible: false`, the source, and the capture time. Keep stream
audio muted unless its use is explicitly reviewed.

### Use the capture script — never hand-drive a browser

Prepare a private config with `url`, `profilePath`, a `.webm` `outputPath`, `executablePath` (or
`CHROMIUM_PATH`), `steps[]`, and optional capture-time `redactions[]` entries with a leaf-element
`selector` and generic `replacement`. URLs must use HTTP or HTTPS and must not contain credentials.

Steps: `{ kind: "waitFor", selector }`, `{ kind: "moveCursor", selector, durationMs? }`,
`{ kind: "click", selector, moveMs?, afterMs? }`, `{ kind: "hold", durationMs? }`.

```sh
node <skill-directory>/scripts/capture_browser_demo.mjs --config <config.json>
```

It records WebM, draws a repeatable cursor path, reapplies structural replacements after navigation, and
emits file hashes, selector rectangles and a redaction manifest.

**Never hand-drive Playwright with inline scripts to produce a deliverable screencast.** A previous run did
exactly that and staged three WebM files that were inside every declared bound, hash-bound end to end, and
verified byte-by-byte server-side — and all three were blank. Nothing had ever loaded. Every structural
gate validates form; none validates content. A twelve-second recording of an empty div satisfies byte
length, sha256, mime, width, height and duration.

So this script refuses to emit a worthless file. The assertions are **on by default**, and a capture that
fails one is deleted rather than returned:

1. **Before recording** — when `content.videoSelector` is set, the element must be a real `<video>`, report
   no `MediaError`, reach `readyState >= 3` (`content.minReadyState`), and have non-zero
   `videoWidth`/`videoHeight`.
2. **During recording** — `currentTime` must advance by at least `content.minPlaybackAdvanceMs` (default
   500ms). Positive deltas accumulate, so a looping or seeking stream is not mistaken for a frozen one.
3. **After recording** — the emitted file is decoded back to greyscale frames and rejected if every frame
   is near-uniform (`content.minFrameStdDev`, default 3) or if nothing changes between frames
   (`content.minInterFrameDelta`, default 0.75).

Optional `content` keys: `videoSelector`, `minReadyState`, `minPlaybackAdvanceMs`, `playbackPollMs`,
`frameSampleFps`, `frameSampleSize`, `minFrameStdDev`, `minInterFrameDelta`, `expectStaticPage`,
`ffmpegPath`.

Set `content.expectStaticPage` only for a capture that is motionless _by design_; it relaxes the motion
check and never the uniformity check. Content assertions cannot be switched off.

**Set `content.videoSelector` whenever the claim is about playback.** Without it only the frame checks run,
and a player frozen on a busy page could still pass.

Frame extraction needs an ffmpeg with the `image2` muxer, a `png` encoder and the `scale` filter. The
script discovers one automatically — Playwright's bundled build, which this skill depends on, has all
three — and verifies the capabilities before launching the browser, so an incapable binary fails
immediately instead of after a long capture. Override with `content.ffmpegPath` or `REMIXX_FFMPEG_PATH`.

One environment fact worth knowing: Playwright's ffmpeg is built `--disable-everything`. It is fine for
reading frames back, but it **cannot mux MP4 and cannot encode audio at all**, so it is not usable for
rendering the final recap. That needs a full ffmpeg.

The emitted cue artifact is `browser-capture-cues.v2` and carries a `contentAssertions` block recording the
measured `readyState`, dimensions, playback advance, frame count, `peakStdDev`, `maxInterFrameDelta` and
the thresholds applied. **Quote those numbers** rather than asserting that the recording worked.

## Cue kinds

`cut`, `playVideo`, `push`, `pan`, `zoomTo`, `drawBox`, `drawArrow`, `label`, `cursor`, `strike`.

Anchor cues to `{assetId, selector}` during browser capture where possible, resolve the selector to a
capture-time rectangle, and store both. Arrows then stay attached after crops, and the output stays
inspectable.

## Voice

Keep `spoken` and `caption` separate. Caption `GSI`; spoken `G-S-I`.

Normalise spoken text before synthesis:

- Convert smart quotes, em dashes, ellipses, arrows, multiplication signs and code punctuation to
  speech-safe forms.
- Expand acronyms, URLs, versions, dimensions, paths and numbers through a project lexicon.
- Reject mojibake such as `â`, `€` or `™` unless deliberately approved.
- Generate a short pronunciation preview covering every unusual token before the full take.

Provider order: founder-recorded voice, approved expressive TTS, approved general TTS, then a local
deterministic fallback. **Always disclose synthetic or cloned speech.** If you end up on a deterministic
fallback voice, say so — that is a configuration problem to report, not something to ship quietly.

## The approval gate

Show every visual beat as:

`thumbnail with final cues | spoken text | caption text | proof claim | redactions`

Do not render the public video until that contact sheet is approved. Founder presentation edits retain
claim references and use founder-edited provenance. After rendering, show the complete output with audio
and disclosures, hash its exact bytes, and get a second approval bound to the chapter hash, media-manifest
hash, public-presentation hash and output hash. Do not stage from contact-sheet approval alone.

**If any asset changes after the contact sheet is approved, say so and get approval again.** A previous run
approved a 5.4s clip and staged a 12.48s re-record under the same approval.

## Staging

Use the bounded `chapter-media-stage.v1` flow, only after exact-preview approval:

1. POST the approved chapter, approved media manifest, renderer-produced `chapter-recap-video.v1` public
   presentation, four-hash exact-preview approval, and a fresh upload token as the `manifest` action.
2. PUT each server-requested asset as `application/octet-stream` with the upload token as a bearer token.
   Upload only files whose bytes match the approved manifest hashes.
3. POST the returned stage ID and the same upload token as the `finalize` action.
4. Return the authenticated review URL. **Never call Publish**, and never upload private plans, raw or
   unapproved captures, contact sheets, or unapproved alternates.

Measured limits, worth planning the shot list around: at most 8 assets, exactly one recap video,
`app_screencast` must be `video/webm`, the recap must be `video/mp4`, every video at most 20 seconds and
32MB, at most 64MB per stage, and `capturedFrom` must be loopback.

The private `report-video-plan.v1` is an editorial and approval artifact, not the public presentation
contract. Require the renderer to preserve it and emit the validated, hash-bound public presentation
manifest. Fail closed if the renderer cannot represent the approved plan without silently changing it.
