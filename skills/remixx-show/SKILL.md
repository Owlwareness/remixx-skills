---
name: remixx-show
description: Show work already built in the current local web project as a private, ready-to-post video post. Use when the creator says "show what I built", asks for a "video post", says "Use remixx.org to show what I just built here as a video post.", or requests an edit to the current private review.
---

# Show what you built

> **Use remixx.org to show what I just built here as a video post.**

Prepare a truthful video post about work already present in the current local web project. Do not add features
merely to have something to post, and do not publish: the creator reviews the private result and is the only
person who can press **Post**.

If there is no safe, visibly demonstrable outcome, stop honestly. Do not substitute a markdown report, a
generated image, manual recording instructions, or another publication path.

You direct the video. The client captures evidence, the server verifies custody and renders, and the creator
approves. Nothing on Remixx's side chooses your shots, so the quality of the post is your editorial work.

## What leaves the machine, exactly

Say this plainly if a creator or a review step asks, because the answer is narrower than "uploads the project".

Sent to Remixx:

- the proposed project name and one-line promise you write in step 1;
- the story you write in step 3 — title, caption, body, the new outcome, and any claims;
- the **recording of the running app** the client makes in step 3, as video or image bytes, and their hashes;
- the edit plan you write in step 4.

Never sent, and never read for sending: source code, file contents, file paths, the Git history or any diff,
environment variables, credentials, the conversation, or anything outside the running app's own screen. You
read the project to decide _what is worth showing_; only your sentences and the recording travel.

The contact sheet and evidence package in step 4 are written to the client's own state directory on this
machine and stay there. They exist so the editorial judgement happens here rather than on a server.

Model choice and inference cost stay on the creator's side too. Remixx buys no tokens to make a post; the only
work on its side is verifying custody, rendering the accepted plan, and hosting the private review.

## Keep Remixx state out of the Project

The creator's Project is the boundary for project inspection and project mutations. "Stay in this folder"
means stay scoped to that Project; it does not move Remixx's capture, request, or credential machinery into
it. The client owns that machinery in its own OS application-state area.

Never create `.remixx-session`, evidence, intent, request, or proposal JSON, credentials, resolution tokens,
or receipts inside the Project. Never edit the Project's `.gitignore` to hide Remixx state. Pass documents on
standard input and keep returned IDs opaque rather than managing paths.

If the creator forbids **all** filesystem writes outside the folder, Remixx cannot satisfy both constraints:
say so and stop before capture. Do not silently write either inside the Project or outside it.

## The document shapes

Every document you author is published as JSON Schema, generated from the same
definitions the client and server validate against:

```text
https://remixx.org/v1/schemas
```

Fetch one with `?name=remixx-project-intent.v1`, `?name=remixx-report-request.v4`,
or `?name=remixx-director-proposal.v1`. Read the shape you need before writing
the document rather than discovering it from validation errors.

## 1. Resolve the destination

```sh
npx --yes remixx-cli@latest report context --intent-stdin --workspace "$PWD" --json <<'REMIXX_INTENT'
<the remixx-project-intent.v1 JSON document>
REMIXX_INTENT
```

Always first. Infer a proposed Project name and a one-line public promise from the current Project. The intent
may contain a canonical `https://remixx.org/p/<slug>` URL only when the creator supplied it in this
conversation. It never contains a Project ID, filesystem path, Git diff, credential, or minted receipt.

The response is authoritative:

- `mode: existing` — continue that owned Project. Use `recentPosts` to see what its audience already watched.
- `mode: new` — a first post. Show the proposed name, slug, and promise. Use the host's native picker if it
  has one, otherwise ask one compact question accepting **Continue**, **Edit**, or **Cancel**, with Continue
  as the default. Never print a numeric menu.
- `mode: ambiguous` — ask the creator to choose among the returned named Project links. Never pick a
  similar-looking Project yourself.

This creates neither a Project nor a run. Keep the opaque `resolutionToken` as an argument for step 5 only.
Do not decode, edit, log, or write it into the repo.

## 2. Choose what is newly true

1. Inspect this Project's `git log`, committed and working-tree diffs, and the runnable localhost app. The
   diff is the spine of truth. Use the current transcript only if the host already provides it.
2. List outcomes that now work and did not before. Drop config, lint, dependency, refactor, and test churn
   unless browser-visible behaviour changed.
3. Compare candidates against every returned `recentPosts` entry. A later post shows the delta since the last
   publication; it does not retell the first post with a new caption.
4. Rank by **visual dominance** first, importance second — how much of a phone screen visibly becomes
   something else. A payoff that fills the frame beats a truer one that changes a badge in a corner.
5. Choose it yourself. Do not ask the creator to approve routine editorial choices. If nothing genuinely new
   is visible, return `no_visible_change` with the concrete reason.

**Choose the capability worth watching, not the work completed.** "Wired up OAuth" is the work. "The app now
runs on a real live stream" is the capability. Same commit, and only one of them is worth a stranger's two
seconds. Name the payoff a viewer would care about, then find the evidence for it.

A payoff may be **static**. Optimize for visual dominance and comprehensibility, not for how much motion is
in the frame. Never manufacture product behaviour to have something to record.

One externally legible change, shown clearly. Not a progress montage.

### Say what you are about to show

Before capturing, tell the creator in **one sentence** what you intend to show, and continue unless they
redirect you:

> The strongest thing to show is the app connecting to a real live stream and receiving data. I'll lead with
> the connected result. Anything you definitely want in?

This is not asking permission — do not print a beat list, a shot table, or a plan for approval, and do not
wait when the answer is obvious ("The magic is the grid rerouting when a feeder is cut. I'm making that the
post."). It exists because the creator knows which change is the magic and you can only see which changed.
One sentence of theirs before capture is worth more than any correction afterwards.

## 3. Capture the evidence

Send a `remixx-report-request.v4` document on standard input. It carries `continuity`, never a project ID:

- first post — `basePostId` and `basePublicationHash` are `null`;
- continuation — copy the context watermark exactly;
- `newOutcome` — what is visibly possible now that the recent posts did not already show.

`presentation` is `{ "template": "proof-of-change-v1", "narrationMode": "none" }`. Posts are currently silent,
so omit narration text. Use one to five scenes; only the first needs a `path`, and later scenes either
navigate or set `continueFromPrevious`. Exclude secrets, personal data, private logs, absolute paths, and
claims you cannot show.

**Stage the app one action before the payoff happens.** Put it in the state where the interesting thing is
about to occur, capture the trigger and the settled result, and hold long enough for a stranger to
understand what changed. Do not record the route you took to get there: a chronological tutorial spends the
only seconds you have on setup. There is no minimum number of scenes, and context worth showing is recorded
as its own scene rather than folded into the payoff.

Some payoffs cannot be captured at all. Anything that navigates away from the creator's localhost app — a
third-party sign-in, a payment page, an external console — is outside what this records, and its credentials
must never be filmed. Capture the *result* on localhost and leave the offscreen step to be explained.

```sh
npx --yes remixx-cli@latest report capture --request-stdin --json <<'REMIXX_REQUEST'
<the complete remixx-report-request.v4 JSON document>
REMIXX_REQUEST
```

The client runs the browser, performs the interactions, records what happened, and privately writes the
evidence. The result is an opaque `captureId`. Keep it opaque.

## 4. Direct the edit

```sh
npx --yes remixx-cli@latest report direct --capture-id "$CAPTURE_ID" --json
```

This writes a private evidence package and a contact sheet image, and returns their paths. **Read both.** The
package contains the exact instructions for a `remixx-director-proposal.v1`, the de-identified evidence
catalog addressed by opaque `evidence_*` handles, the recorded event log with the timing and geometry of what
the capture actually did, and the labelled frames in the sheet. Open the contact sheet image and look at it.

Use the event log to decide where the proof is, and the frames to decide whether it reads. Geometry tells you
where something happened; only the pixels tell you whether a viewer can see it.

### Lead with the payoff

Open on the strongest authentic moment, already happening. Do not build up to it, and do not open on the app
sitting in its start state — the first two seconds decide whether anyone sees the rest. Explanation follows
the proof; it never precedes it. End when the proof is understood: there is no required outro, closing
context shot, limitation, or invitation to respond.

Selected source ranges must move forward and may not replay a frame, so the video cannot return to an
earlier moment. If you want to end back on the result, take a **later, non-overlapping** slice of the same
held result rather than reusing the frames you opened with.

### Check the hero at phone size before you commit to it

Look at the chosen frames at the size the post is actually watched — a phone, not your screen. **A viewer
must be able to find the payoff within two seconds without reading any text.** If the interesting region is a
thin line, a small badge, a few pixels of colour, or text too small to resolve, the edit cannot save it.

If it does not read, make **one** bounded repair — a better starting state, a tighter viewport, different
framing, or a different candidate entirely — and look again. If it still does not read, return
`no_visible_change` and say concretely what was too small to see. Shipping an unreadable post costs more
than shipping nothing.

Then write the proposal and submit it:

```sh
npx --yes remixx-cli@latest report direct --capture-id "$CAPTURE_ID" --proposal-stdin --json <<'REMIXX_PLAN'
<the complete remixx-director-proposal.v1 JSON document>
REMIXX_PLAN
```

Refer only to `evidence_*` handles. Never emit a source hash, project ID, post ID, review ID, destination, or
provider metadata; those are server-owned and a proposal containing one is rejected.

If the server rejects the plan it returns exact codes and JSON paths. Change the edit to address them rather
than patching fields mechanically, and submit a different proposal. Some findings come back as review notes
instead: the post still renders and the creator judges them.

## 5. Create the private review

```sh
npx --yes remixx-cli@latest report create --capture-id "$CAPTURE_ID" --resolution-token "$RESOLUTION" --workspace "$PWD" --idempotency-key "$KEY" --wait --json
```

Use only `remixx-cli@latest`. Never substitute a global install, a cached package, a repository script, local
Remixx source, credentials, another folder, an old transcript, or a Project ID found on disk. If the package
is unavailable, stop with `Remixx client unavailable` rather than building a workaround.

If stdout returns `authentication_required`, run `npx --yes remixx-cli@latest login --json`, complete the
browser connection, and retry the identical command with the same idempotency key. Read stdout only as
versioned JSON; human-readable progress goes to stderr.

On success, return only:

> [See your finished post and video](reviewUrl)
>
> Want changes? Tell me here. If it looks good, press **Post to _Project name_** there.

The review may be a draft for a Project that does not exist yet. Pressing **Post** is the sole authority that
creates it and publishes the first post. Never publish from the agent.

## Edits

Translate feedback into a `remixx-report-revision-request.v3`, inherit unchanged evidence by hash, and capture
again only when the visible evidence itself must change. Direct the new edit exactly as in step 4 — a revision
needs its own proposal — then:

```sh
npx --yes remixx-cli@latest report revise --capture-id "$CAPTURE_ID" --idempotency-key "$KEY" --wait --json
```

Custody comes from the run. Never resolve or accept a different Project during a revision. Return the same
review URL when ready. On error, report the stable `code` and its concise `message`; do not improvise a
fallback pipeline.
