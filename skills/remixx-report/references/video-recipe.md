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

## Plan the shot list before you open a browser

This is the step most worth spending real thought on, and skipping it is how a technically perfect video
ends up not worth watching. **Write the shot list down before recording anything**, and show it to the
founder along with the script. It is cheap to change a list and expensive to re-record.

A shot list is just: the states the product goes through, in the order the video shows them, and what makes
each one visible. Three to five is usually plenty.

The single question to hold each shot against: **what visibly changes here?** Name it — a list filling, a
number moving, a page arriving, a stroke appearing, a player starting. If you cannot say what changes, that
shot is not evidence of anything, and the product sitting in its start state while narration talks over it
is the most common way a video says nothing. Then drive the product the way a person would to make that
change happen, and use the step kind that genuinely performs it.

Two things that are easy to get wrong and expensive to discover afterwards:

- **Let the result sit on screen after the action.** A click that is cut away from immediately proves
  nothing, and the eye needs a moment to see what changed. `hold` steps are for this.
- **Do not reload the page between shots unless the reload _is_ the point.** Whatever the product has built
  up — a drawing, a cart, a filtered list, a session, a log — is gone after a reload, and a plan organised
  as one page load per talking point throws away the proof it just created. Plan a single run through the
  product and let it accumulate. This has already produced a finished video whose canvas was blank.

If the product ends up in a state worth seeing whole, show it once near the end. That frame is often the
most convincing one in the video.

Then hand it over and let the founder judge it. The question that decides whether a post is any good is:

> With the sound off, could someone who has never seen this tell what it does?

That is a taste question, so it is theirs, not yours — and no automated check answers it anyway. The content
assertions in the capture script prove a recording is not blank and not frozen, and they pass happily on
browser chrome and a moving cursor over an empty page; a blank-canvas recording scored a `peakStdDev` of 95.9
against a threshold of 3. So do not try to certify the video frame by frame. Show it, say what it shows, and
say that if they want it different they can just tell you what to change and you will make it again.

Planning the shot list well is how you avoid needing a second attempt. If one is asked for, re-record rather
than writing a better caption over a dead screen — and say so and get approval again, because a previous run
approved a 5.4s clip and staged a 12.48s re-record under the same approval.

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
- `approval`: `status` (`pending`, `approved`, or `rejected`) for an optional contact sheet, plus nullable
  `approvedBy` and `approvedAt` until approved.

Use only claim refs present in `approvedClaimRefs`. Keep beats non-overlapping; keep each narration segment
inside its named beat. Resolve relative asset paths from the plan file. Use
`reproducibility: { reproducible, source }`, adding capture time when the source is live. Use cue targets
shaped as `{ assetId, selector }` or `{ assetId, rect: { x, y, width, height } }`. Use retained-proof
entries shaped as `{ assetId, reason }`.

Run `node <skill-directory>/scripts/validate_video_plan.mjs <plan.json>` before review. Once the privacy
state is `approved`, run it again with `--require-approved`; the command verifies the privacy approval and
the referenced file hashes, then prints the exact plan-file hash for the renderer handoff. It does **not**
require a contact-sheet approval — see "The approval gate" — but it will refuse to pass a plan whose contact
sheet was explicitly rejected.

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

**Frame the app at its natural aspect — do not force portrait.** The post's media well takes its shape
from the leading asset and contains it rather than cropping it, and the recap renders at the aspect of the
evidence it shows. So capture the product at whatever viewport it is actually used at: a desktop tool
recorded at 1440x900 stays landscape all the way to the feed. Forcing a landscape app into a portrait
viewport used to shrink the one thing worth watching into a box in the middle of the frame.

Two bounds worth knowing: the well clamps to between 1:2 and 1.91:1, and the recap frame is capped at
2160px per edge and about 2.07 megapixels. Pick a capture viewport inside those and nothing gets reshaped.

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
`{ kind: "click", selector, moveMs?, afterMs? }`, `{ kind: "hold", durationMs? }`, and
`{ kind: "drag", selector, path, segmentMs?, moveMs?, afterMs?, interpolationSteps? }`.

Drive the product the way someone using it would. For most things that is `click` and then `hold` while the
result appears — a button, a form, a navigation, a toggle. Reach for `drag` when the interaction genuinely
needs a held pointer, which `click` cannot express: a canvas stroke, a slider, a map pan, a drag-and-drop.

One trap worth knowing, because it is not obvious: **`moveCursor` moves only the decorative overlay cursor,
not the real pointer.** It is for drawing attention, not for interacting. Used as if it were an interaction
it will show a cursor gliding across a surface that receives nothing.

For `drag`, `path` is 2 to 64 points given as `{ xRatio, yRatio }` fractions of the target element's box, so
a path survives a crop and means the same thing at any viewport. `segmentMs` (default 220) is the dwell
between points and `interpolationSteps` (default 24) is how finely each segment is interpolated. The emitted
cue records the selector, the element rectangle and the resolved absolute points, so a rendered cursor can
follow the same coordinates the pointer actually took.

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

It also carries a `media` block decoded from the emitted WebM bytes: codec, mime, width, height and exact
duration. Use those values in every asset manifest. Do not use the requested viewport or elapsed action
time; a real Plinth capture took 11.2 seconds of scripted actions but encoded a 15.04-second WebM, enough for
the server's exact decoder to reject the wrong declaration.

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

**One decision, on the finished thing.** After rendering, show the complete video with audio and its
disclosures, hash its exact bytes, and get an approval bound to the chapter hash, media-manifest hash,
public-presentation hash and output hash. That is the gate, and it is the only taste approval there is.

There used to be a second one earlier: a contact sheet of every beat that had to be signed off before
anything could render. It is now optional. Making a founder approve a storyboard before they have seen a
video is an approval on an artifact that exists only for review, and the honest version of the gate is
seeing the real thing and saying yes or no. Show a contact sheet if it genuinely helps a decision — a
disputed redaction, an unclear claim — not as a checkpoint. If you do show one and it is rejected, do not
render it.

Two things are still required and are not matters of taste:

- Keep `privacy.founderApprovalState` **pending** while producing a private review draft. Do not manufacture
  founder approval just to render. The authenticated **Post** action is where the founder accepts the exact
  formatted post and media that become public.
- Keep every rendered/staged asset hash-bound. If an asset changes, rebuild the presentation and stage the
  new bytes. Never reuse an earlier render binding for a changed output.

Founder presentation edits retain claim references and use founder-edited provenance.

When handing the video over, return the review URL rather than pasting the script into chat. Add one short
line saying they can request changes in chat, or press **Post** on the preview if it looks good.

## Staging

### When the Remixx monorepo is available

Finding a Remixx checkout with `packages/recap/dist/cli.js` means narration/rendering is available even
though this public repository does not bundle it. Build a recap asset manifest beside the capture from the
cue artifact's byte-derived `media` values, then run from that checkout:

```sh
node packages/recap/dist/cli.js \
  --chapter <approved-post.json> \
  --assets <recap-assets.json> \
  --output <recap.mp4> \
  --narrator auto

pnpm --filter @remixx/web stage:media -- \
  --chapter <approved-post.json> \
  --presentation <recap.manifest.json> \
  --assets <recap.stage-assets.json>
```

Load the checkout's configured narration environment without printing it. The render emits both the public
presentation manifest and the staging asset list. Use those emitted paths; do not hand-build a media staging
payload. If the checkout exists, do not report "the public repo has no renderer" as a blocker without
running the render command and naming its actual refusal.

**Staging text-only when a screencast or a rendered recap exists is FORBIDDEN, not a fallback.** Staging is
keyed by content hash: a post staged without media can never afterwards gain media under the same hash — the
retry answers `duplicate: true` — so the "rescue" permanently ruins the post it was trying to rescue.

Use the bounded `chapter-media-stage.v1` flow after the report agent has prepared and hash-bound the complete
private-review bundle. The legacy field named `exactPreviewApproval` is a render-binding envelope during
this migration; its `approvedBy` must identify the report agent, never the founder:

1. POST the agent-prepared chapter, media manifest, renderer-produced `chapter-recap-video.v1` public
   presentation, four-hash render binding, and a fresh upload token as the `manifest` action.
2. PUT each server-requested asset as `application/octet-stream` with the upload token as a bearer token.
   Upload only files whose bytes match the prepared manifest hashes.
3. POST the returned stage ID and the same upload token as the `finalize` action.
4. Return the authenticated review URL. **Never press Post**, and never upload private plans, raw captures,
   contact sheets or alternates that are not part of the finished preview.

Do not improvise that flow per run. The reproducible command is
`apps/web/scripts/stage-chapter-media.mts` in the Remixx monorepo, run as
`pnpm --filter @remixx/web stage:media -- --chapter … --presentation … --assets …`. It computes `mime`,
`width`, `height`, `durationMs` and every hash through the **same** decoder the ingress re-checks uploads
with, refuses before touching the network when anything disagrees, treats an exact retry as the success it
is, writes a receipt beside the artifacts, and prints the review URL as its last line.

**Honest limitation:** that command lives in the monorepo precisely because it must share the server's
decoder, and this skill repo has no renderer yet. A fresh clone can capture evidence but cannot render a
recap or attach media.

**If media cannot be staged, STOP without staging.** Two cases matter in practice: no renderer is available
in this environment, or the founder did not complete the one-click Project bootstrap, so the bindings will
be rejected. Either way, hand over the artifact paths, say plainly what is missing and what would unblock
it, and stage nothing. A crippled post is worse than no post, because the hash is spent.

That is not permission to end quietly. **The run never ends without either a review URL or an exact
statement of what blocked one** — name the missing piece, not a vague apology.

Measured limits, worth planning the shot list around: at most 8 assets, exactly one recap video,
`app_screencast` must be `video/webm`, the recap must be `video/mp4`, every video at most 20 seconds and
32MB, at most 64MB per stage, and `capturedFrom` must be loopback.

Never take `width`, `height`, `durationMs` or `mime` from the render plan or from ffmpeg's rounding. The
endpoint re-decodes every uploaded byte and compares exactly; a real render off by 4ms is enough to be
rejected. Derive them from the decode.

The private `report-video-plan.v1` is an editorial preparation artifact, not the public presentation
contract. Require the renderer to preserve it and emit the validated, hash-bound public presentation
manifest. Fail closed if the renderer cannot represent the prepared plan without silently changing it.
