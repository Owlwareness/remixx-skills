---
name: remixx-show
description: Turn work already built in the current local web project into a private, ready-to-post video post. Use when the creator mentions Remixx or the Remixx skill, says "show what I built", asks to "make a post" or "post about" a feature, asks for a video post or screencast of local work, names what to capture in the running app, or requests an edit to the current private review.
---

# Show what you built

> **Use remixx.org to show what I just built here as a video post.**

Prepare a truthful post about work already present in this local web project. Do not add a feature merely to
have something to post. Do not publish: the creator reviews the private result and is the only person who can
press **Post**.

If nothing safe and visibly demonstrable exists, stop honestly. Do not substitute a markdown report, a
generated image, manual recording instructions, or another publishing path.

You direct the post. The client captures evidence and carries your edit; Remixx verifies custody, renders the
approved artifact set, and hosts the private review.

## Boundary

Sent to Remixx:

- the proposed project name and one-line promise;
- the title, caption, body, new outcome, and claims you write;
- the recording of the running app and its byte hashes; and
- the edit proposal you author.

Never sent: source code, file contents or paths, Git history or diffs, environment variables, credentials,
the conversation, or anything outside the running app's screen. You may inspect the project to choose what is
worth showing; only your prose, proposal, and recorded pixels leave the machine.

Keep Remixx state out of the project. Never create `.remixx-session`, evidence, request, proposal,
credentials, token, or receipt files here, and never edit `.gitignore` for Remixx. Pass authored documents on
standard input. The client keeps private working state in its OS application-state directory.

## 0. Ask once, before the first command

Every step below runs `npx --yes remixx-cli@latest`. Downloading and executing a package is blocked by
default in many agent harnesses, and that guardrail is correct. Get consent before you trip it, not after.

Before your first CLI call, tell the creator in one short message: that you will download and run
`remixx-cli@latest`, what the Boundary above says leaves the machine, that nothing is published without
them, and ask whether to proceed. Most creators answer yes and nothing is ever blocked.

If a command is refused anyway, escalate in this order and stop at the first step that works:

1. Ask a single native question with two options — run the Remixx CLI, or cancel. The affirmative option
   must say in its own words that it authorizes downloading and executing `remixx-cli@latest` for this
   session. Then retry the identical command.
2. If the refusal repeats, a selected option was not read as consent. Ask the creator to reply in their own
   message with an explicit sentence, and give them the exact words to send: that they authorize you to
   download and execute `remixx-cli@latest` via `npx --yes` for this Remixx session, that only what the
   Boundary names may be sent, and that you must not edit their settings. Then retry the identical command.

**Never propose a permissions fix.** Do not suggest a Bash allow-rule, a settings file edit, a config skill,
or a change of permission mode, and never attempt one yourself. An agent must not expand its own authority,
and a creator should not have to edit a settings file to look at a video. Asking plainly is the supported
path and it works.

## 1. Resolve the destination

Read the current authored-document index first:

```text
https://remixx.org/v1/schemas
```

It publishes the active director contract and links every exact JSON Schema. Fetch the shapes you need rather
than learning them from errors.

```sh
npx --yes remixx-cli@latest report context --intent-stdin --workspace "$PWD" --json <<'REMIXX_INTENT'
<one remixx-project-intent.v1 JSON document>
REMIXX_INTENT
```

Infer the proposed name and public promise from this project. Never send a project ID, path, diff, credential,
or receipt. The response is authoritative:

- `mode: existing`: continue that project and use `recentPosts` to avoid retelling it.
- `mode: new`: show the proposed name, slug, and promise. Ask one compact **Continue / Edit / Cancel**
  question only when the host has no native picker. Continue is the default. Never print a numeric menu.
- `mode: ambiguous`: ask the creator to choose among the returned named links. Never guess.

Keep the returned continuity facts for the capture request, but do not rely on this early opaque
`resolutionToken` for step 5. It is short-lived and consumed by create; do not decode, edit, log, or save it
in the project. Refresh context with the same intent immediately before create to obtain the token you use.

## 2. Choose one newly true thing

Inspect the runnable app plus Git history and diffs. Choose one browser-visible capability that now works and
did not before. Drop config, test, dependency, and refactor churn unless visible behaviour changed.

Rank candidates by visual dominance first and importance second. Lead with the payoff; do not spend the first
seconds navigating toward it. Compare against `recentPosts`, and show only the delta. A static result is valid
when it is visually clear.

Tell the creator your choice in one sentence and continue unless redirected. Do not ask them to approve a
beat list or routine camera decisions. If no result reads at phone size, return `no_visible_change` with the
concrete reason.

## 3. Capture evidence

**Read the target shape before you capture, not after.** The finished post is portrait: the master is
1080x1350, every crop must be an exact 4:5 rectangle inside your source, and the edit is capped at 240
frames. Capture in a portrait window sized so the payoff already fills a 4:5 frame. A landscape capture
costs you the whole recording — its widest legal crop is a fraction of what you filmed, and you will only
discover that from the evidence package afterwards.

Author one `remixx-report-request.v4` document. Use `presentation.template: "proof-of-change-v1"` and
`narrationMode: "none"`. Use one to five scenes; only the first needs a path. Keep continuity watermarks
exactly as returned. Exclude secrets, personal data, private logs, absolute paths, and claims the recording
cannot prove.

Stage the app one action before the payoff, capture the trigger and settled result, and hold the result long
enough to read. Do not reload between scenes unless reload itself is the point. Never film a third-party sign
in, payment page, external console, or credentials; capture the resulting localhost state instead.

```sh
npx --yes remixx-cli@latest report capture --request-stdin --json <<'REMIXX_REQUEST'
<the complete remixx-report-request.v4 JSON document>
REMIXX_REQUEST
```

Keep the returned `captureId` opaque.

## 4. Direct the ordered post

```sh
npx --yes remixx-cli@latest report direct --capture-id "$CAPTURE_ID" --json
```

Read both returned private files: the evidence package and contact sheet. The package embeds the exact active
instructions. The current contract is `remixx-director-proposal.v2`; fetch its schema from the index and
follow the package when authoring it. Use only `evidence_*` handles—never source hashes, project/post/review
IDs, destinations, URLs, or provider metadata.

The first card is the evidence hero. Frame its strongest authentic moment tightly enough to read on a phone.
The crop is the camera: static crops and hard cuts are allowed; replay, reverse time, speed changes, moving
crops, and invented pixels are not.

After the hero, use one to five presentation cards when explanation adds value. Every presentation card maps
to one distinct full-frame `authored-slide` segment in the same order. Write semantic HTML fragments with
inline styles only—no scripts, stylesheets, SVG, canvas, links, forms, remote resources, data URLs, or
images. The client sanitizes each fragment, records the exact cleaned bytes and SHA-256, and stores only that
canonical proposal. Remixx verifies it independently and sanitizes again before rendering each slide.

Slides may animate. Add `presentation.motionProfile` with id `editorial-reveal` and version `v1` for a
2-3 second reveal; omit it for a still. Remixx renders the motion from a trusted composition, never from
your fragment—CSS animations and transitions are rejected. Mark what it animates with `data-role`, whose
only values are `claim`, `result`, and `proof`; any other `data-` attribute is rejected. A `result`
element's text must be the recorded value and must stay constant. Revealing it is allowed; counting up to
it is not, because every number on the way is a measurement nobody made.

A hero-only post remains valid when another card would add nothing; do not pad it. Otherwise the private
review and public feed are the hero followed by the authored slides in plan order.

```sh
npx --yes remixx-cli@latest report direct --capture-id "$CAPTURE_ID" --proposal-stdin --json <<'REMIXX_PLAN'
<the complete remixx-director-proposal.v2 JSON document>
REMIXX_PLAN
```

If rejected, address every exact code and JSON path with a genuinely different proposal. Do not patch fields
mechanically or repeat a rejected edit. An accepted proposal can still return non-blocking advisory findings;
those are a reason to correct the proposal, not a publication block.

## 5. Create the private review

Refresh context now, with the same `remixx-project-intent.v1` document and workspace from step 1. Use the
fresh response's `resolutionToken`; this spends its short TTL on the create mutation rather than the thinking
and directing steps. It does not re-record or alter the retained evidence.

```sh
npx --yes remixx-cli@latest report context --intent-stdin --workspace "$PWD" --json <<'REMIXX_INTENT'
<the same remixx-project-intent.v1 JSON document from step 1>
REMIXX_INTENT
```

```sh
npx --yes remixx-cli@latest report create --capture-id "$CAPTURE_ID" --resolution-token "$RESOLUTION" --workspace "$PWD" --idempotency-key "$KEY" --wait --json
```

Use only `remixx-cli@latest`. Never substitute a global install, cached package, repository script, local
Remixx source, old transcript, credential, or project ID. If the package is unavailable, stop with
`Remixx client unavailable`.

If stdout returns `authentication_required`, run `npx --yes remixx-cli@latest login --json`, complete the
browser connection, and retry the identical command with the same idempotency key. Read stdout only as
versioned JSON; progress belongs on stderr.

On success return only:

> [See your finished post](reviewUrl)
>
> Want changes? Tell me here. If it looks good, press **Post to _Project name_** there.

The agent never presses Post. That creator action alone creates a first project and publishes its exact
reviewed artifact set.

## Edits

Any saved creator-side verifier outcome opens a successor: a rejection, or an accepted result with advisory
findings. Translate the correction into a `remixx-report-revision-request.v3`; inherit unchanged evidence by
hash and capture again only when visible evidence must change. Direct the successor edit again, then run:

```sh
npx --yes remixx-cli@latest report revise --capture-id "$CAPTURE_ID" --idempotency-key "$KEY" --wait --json
```

Revision custody comes from the existing run and cannot be redirected. Return the same review URL. A retryable
`render_failed` may be retried with the identical command only while `proposalHash` is unchanged. If the
proposal needs correction, store it with `report direct`, then use `report revise` with a fresh idempotency
key; do not create a new run with the old resolution token. If a genuinely new run is needed, re-run `report
context` for a fresh token and use a new key. On error, report the stable code and concise message; do not
invent a fallback pipeline.
