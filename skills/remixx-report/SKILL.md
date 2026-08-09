---
name: remixx-report
description: Turn a real working session into a short, watchable post — a video showing what was built, plus durable private project memory. Use when the user runs `/report`, invokes `$remixx-report`, says they are done for the day, asks to capture or show a work session, wants a video or post of what they just did, or asks to set up a new Remixx project.
---

# Show what you did today

Take a real working session and produce **one short video someone would actually watch**, plus private
memory of the work. Then stage it so the founder can see it as a real post and decide whether to publish.

The founder does the work. This skill does the showing.

## First: new project or existing one?

Look for `.remixx/project.json` in the working directory.

- **It exists** → read it for identity and continue below. If the founder says it has never been created
  on Remixx, or an earlier stage failed because its Project binding was missing, use the bootstrap command
  below with that identity before continuing.
- **It does not exist** → this is a new project. Ask only for a name, a short one-line description of
  what it is, and confirmation of the directory. Do not interrogate the founder about vision, mission or
  strategy — they may not know yet, and none of that is needed to show today's work.

  Create the portable local identity with the runner; do not hand-author a `project-seed.v1`:

  ```sh
  node bin/remixx-artifact.mjs init-project \
    --name <name> --slug <slug> --out .remixx/project.json
  ```

  Then turn that identity and the founder's exact one-line description into the one-click Remixx URL:

  ```sh
  node bin/remixx-artifact.mjs project-bootstrap-url \
    --project .remixx/project.json \
    --description <founder's-exact-words>
  ```

  Show the full URL and pause. **Have the founder open the Remixx studio and sign in first, then open the
  full bootstrap URL.** Do not send them through sign-in from the bootstrap URL: the current auth redirect
  does not preserve its token. Ask them to review the three visible fields and press **Create Project**.
  Continue only after they confirm it succeeded. That one authenticated click records the founder as
  approver, creates the internal seed, adds an honest default brief and contribution policy, publishes the
  Project publicly, and preserves the exact `projectId` from the working directory so staging can bind
  immediately. The agent does not sign in, approve, or publish anything itself.

  **There is no seed checkpoint in this path.** Never send a fresh report through
  `remixx-start-project`, ask the founder to hand-author or paste a `project-seed.v1`, or send them through
  the long brief/policy form. The bootstrap click replaces that ceremony without forging their approval.

Then carry on. The rest of the flow is the same either way.

## The shape of the work

1. **Work out what happened.** Read the session. If context is thin, read the repo and its recent commits.
   Say what you are unsure of rather than guessing.
2. **Find the story that is already in it.** One clear thing usually carries a post. Do not pick a
   structure and then look for content to fill it. Read
   [video-recipe.md](references/video-recipe.md) before planning shots.
3. **Bound the sources.** Show which exact source bytes may reach the model before using them. Read
   [privacy.md](references/privacy.md) and
   [report-protocol.md](references/report-protocol.md).
4. **Create private memory** — a `report.v1` from manifested evidence. Finalize and validate it with the
   artifact CLI.
5. **Pause for truth and visibility decisions**, showing every candidate item and source.
6. **Build the approved public set** deterministically:

   ```sh
   node bin/remixx-artifact.mjs build-approved-items \
     --report <private-report.json> \
     --decisions <visibility-decisions.json> \
     --out <approved-public-items.json>
   ```

7. **Compile the public draft** in a fresh context containing only the approved items. If the host cannot
   isolate that context, stop and hand over the approved-items path.
8. **Plan the shot list, and show it to the founder with the script.** Before opening a browser, write down
   the states the product goes through, in order, and for each one name **what visibly changes**. Three to
   five is plenty. Then drive the product the way a person would to make that change happen, and let each
   result sit on screen for a moment. Do not reload the page between shots unless the reload is the point —
   whatever the product has built up is gone afterwards. This is the step that decides whether the video is
   worth watching, and it is cheap to change a list and expensive to re-record. Read
   [video-recipe.md](references/video-recipe.md) → "Plan the shot list before you open a browser".
9. **Capture the evidence and make the video.** Drive the real product into each state on the shot list and
   record it. Use `scripts/capture_browser_demo.mjs` — never hand-drive a browser with inline scripts.
   Validate the plan with `scripts/validate_video_plan.mjs`.
10. **Look at what you made, then show the founder the finished thing.** A quick look is enough — is the
    product visibly doing something, is anything obviously broken. You do not have to certify the video, and
    you should not spend the session on frame-by-frame self-review; the capture script already refuses a
    blank or frozen recording, and taste is the founder's call. Render, show the finished video with audio,
    and get the exact-preview approval bound to all four hashes.
11. **Approve and export**, only after explicit approval:

    ```sh
    node bin/remixx-artifact.mjs approve-chapter \
      --input <draft-chapter.json> \
      --approved-by <name> \
      --approved-at <ISO-8601> \
      --out <approved-chapter.json>

    node bin/remixx-artifact.mjs export-chapter \
      --input <approved-chapter.json> \
      --out <public-outbox/chapter.json>
    ```

12. **Stage it** into the founder's private inbox, and **always end with a review URL**. This step is not
    optional and must not be skipped — a run that produces artifacts on disk and no link has failed, from
    the founder's point of view.

    **Staging a post text-only when a screencast or a rendered recap exists is FORBIDDEN.** Staging is
    keyed by content hash, so a post staged without media can never afterwards gain media under the same
    hash — the retry answers `duplicate: true` and that post is spent for good. Text-only staging is
    correct only for a session that produced no visual evidence at all.

    With a rendered recap in hand, stage the post and its media together in one bounded command. It takes
    the approved post, the public presentation manifest and the asset descriptor list, verifies every byte
    locally against the same decoder the server re-checks with, runs the three-phase
    `chapter-media-stage.v1` flow, writes a receipt beside the artifacts, and prints the review URL as its
    last line:

    ```sh
    pnpm --filter @remixx/web stage:media -- \
      --chapter <approved-chapter.json> \
      --presentation <recap.manifest.json> \
      --assets <recap-assets.json>
    ```

    It refuses before touching the network if the post is not approved, if the post and the presentation
    disagree on ID or hash, if any file's bytes do not hash to the sha256 it declares, if the shared
    decoder cannot read a file, or if there is not exactly one `recap_video`. Every refusal names what
    blocked it.

    For a session with no visual evidence at all, the text-only path is still this:

    ```sh
    node bin/remixx-artifact.mjs stage-chapter \
      --input <public-outbox/chapter.json>
    ```

    That command needs no configuration and prints a `reviewUrl`.

    **Honest limitation, stated rather than papered over:** the reproducible media staging command lives
    in the Remixx monorepo today, at `apps/web/scripts/stage-chapter-media.mts`, because it has to share
    the ingress decoder to compute `mime`, `width`, `height` and `durationMs` exactly the way the server
    re-checks them. **This skill repo has no renderer and no narration step**, so a fresh clone can
    capture evidence but cannot yet render a recap or attach media.

    **A discovered Remixx monorepo means the renderer is available.** If `~/dev/remixx` or a path the
    founder supplied contains `packages/recap/dist/cli.js`, read
    [video-recipe.md](references/video-recipe.md) → "When the Remixx monorepo is available" and use it.
    Do not stop merely because the public skill repository itself has no renderer after finding the working
    monorepo, recap CLI and `stage:media` command. Stop only after the applicable command actually refuses,
    and report that concrete refusal.

    **So if media cannot be staged — no renderer is available in this environment, or the founder did not
    complete the one-click Project bootstrap — STOP without staging.** Hand over the artifact paths, say
    plainly what is missing and what would unblock it. Do not stage a crippled post just to have something
    to link to; that spends the post's only hash on a version with no video in it. The run then ends with an
    exact statement of what blocked the review URL, which is the other half of the rule above.

13. **Hand over the review URL as the last line of your response, and offer to change it.** The founder
    refreshes their studio, sees the post as it will actually appear, and chooses Publish or Dismiss. Say
    plainly that if they do not like it — the video, the script, the framing, any of it — they can just tell
    you what to change and you will make it again. They should not have to approve each step to get there;
    they should see the result and say yes or no.

    One mechanic to be straight about if they do ask for a different video: staging is keyed on the post's
    exact content hash, so if the post text is unchanged the platform returns the existing staged record
    rather than accepting new media. A re-render therefore lands as a new post rather than swapping the
    video on the old one, and the old one should be dismissed. Say so rather than silently staging
    something that did not take.

## Rules

- Do not sign in, call the database directly, or publish. Publication is the founder's, always.
- **Never write the founder's name into an approval field for an approval they did not give.** The
  approval fields on the artifact are a provenance claim, not a formality. If the founder has not said yes
  in this session, you may not pass their name to `--approved-by`. Ask, or stop and hand over the
  unapproved draft path. Recording an approval that did not happen is the most expensive kind of bug this
  product can ship, and it is worse than the friction of asking.
- Never auto-confirm truth, visibility, or final approval.
- **Approval is scoped to the proposal immediately above it.** Confirmation of a Project name and promise
  approves only that Project proposal. It does not approve Report facts, source visibility, privacy, post
  text, narration or media. Likewise, "continue" after Project creation is not public-content approval.
- **Show the actual public content in chat before recording its approval.** Before writing
  `report-visibility-decisions.v1`, show every proposed public item and source. Before invoking
  `approve-chapter`, show the complete title, dek, movement, hooks/edges and disclosure. Never write
  `reviewedBy`, `approvedBy`, `founderApprovalState: "approved"` or an approval timestamp from a role label
  such as `Founder`; those fields describe an event that must have happened in the current conversation.
- Keep sources, private memory, decisions and drafts private. Never compile a public draft in a context
  that still holds private sources.
- Never invent movement, failure, rationale, an observation, or a change of mind. If a session produced
  little, say so — `no_movement` is a successful private-memory result with no post.
- Never manufacture a caveat to look balanced, and never hide a real one to look better.
- Do not put a number in the title. Say what happened.
- **Plan the shot list before recording, and name what visibly changes in each shot.** A product sitting in
  its start state while narration talks over it is the most common way a video says nothing. Do not reload
  the page between shots unless the reload is the point; whatever the product has built up is gone
  afterwards. This has already produced a finished video whose canvas was blank.
- **Show the finished video and offer to change it.** You do not need to certify it frame by frame — the
  capture script already refuses a blank or frozen recording, and whether it is any good is the founder's
  call. Publication is immutable, which is exactly why the founder is the gate and the post is staged rather
  than published. If they want it different, take the note and make it again.
- **Never stage a post text-only when a screencast or a rendered recap exists.** Staging is content-hash
  keyed, so that post can never gain its media afterwards. Stop, hand over the artifact paths, and say what
  is missing.
- Do not finish without a review URL, or without saying exactly what blocked one.
- **Keep report machinery out of the Project being reported on.** Put private/generated work under
  `.remixx/`, ensure capture profiles and configs are gitignored before launching a browser, and never add
  a Project-specific artifact-builder script or commit report plumbing to the product repository.
- **Never delete finalized artifacts to make an overwrite guard pass.** If a run changes, mint a new run
  directory or new artifact IDs. Broad deletion such as `rm -f .remixx/artifacts/*.json` destroys capture
  cues and the evidence needed to detect changed content.

## Vocabulary

The public artifact is still called `chapter.v1` in the schemas and the CLI, and that name is load-bearing
in the contracts. In anything the founder reads, call it a **post**. Do not narrate chapter numbers, and do
not talk to the founder about chapters.
