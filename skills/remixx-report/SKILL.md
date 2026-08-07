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

- **It exists** → this is an existing project. Read it for identity and continue below.
- **It does not exist** → this is a new project. Ask only what is needed to create it: a name, a short
  one-line description of what it is, and confirmation of the directory. Write
  `.remixx/project.json` with `schemaVersion`, `projectId` (a fresh UUID), `slug`, `name` and `vaultPath`.
  Do not interrogate the founder about vision, mission or strategy — they may not know yet, and it is not
  needed to show today's work.

  **Then say this out loud, because it is a hard limit:** writing that file creates a _local_ identity
  only. The project does not exist on the platform, and **staging a post for it will be rejected** —
  `assert_chapter_bindings` returns "Chapter, media, presentation, or Project binding was rejected."
  The founder has to create the project in their studio once, and the `projectId` in
  `.remixx/project.json` must match the one the platform issued. Tell them that before doing the work,
  not after, so a whole session's output does not end up unstageable.

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
8. **Capture the evidence and make the video.** Drive the real product into each state you named and record
   it. Use `scripts/capture_browser_demo.mjs` — never hand-drive a browser with inline scripts. Validate
   the plan with `scripts/validate_video_plan.mjs`.
9. **Show the contact sheet and pause.** Then render, show the finished video with audio, and pause again
   for exact-preview approval bound to all four hashes.
10. **Approve and export**, only after explicit approval:

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

11. **Stage it** into the founder's private inbox, and **always end with a review URL**. This step is not
    optional and must not be skipped — a run that produces artifacts on disk and no link has failed, from
    the founder's point of view.

    ```sh
    node bin/remixx-artifact.mjs stage-chapter \
      --input <public-outbox/chapter.json>
    ```

    That command needs no configuration and prints a `reviewUrl`.

    **On video:** staging media requires a rendered recap — the endpoint demands exactly one
    `recap_video` MP4, a public presentation manifest, and a four-hash exact-preview approval. **This repo
    does not yet contain a renderer or a narration step**, so if all you have is a raw screencast, you
    cannot stage media yet. Do not stop and leave the founder with nothing. Stage the post, hand over the
    URL, and say plainly that the video is captured but not yet rendered or attached.

    Be aware this has a cost worth stating out loud: staging is keyed by content hash, so a post staged
    without media cannot later gain media under the same hash. Say so when you hand over the link.

12. **Hand over the review URL as the last line of your response.** The founder refreshes their studio,
    sees the post as it will actually appear, and chooses Publish or Dismiss.

## Rules

- Do not sign in, call the database directly, or publish. Publication is the founder's, always.
- **Never write the founder's name into an approval field for an approval they did not give.** The
  approval fields on the artifact are a provenance claim, not a formality. If the founder has not said yes
  in this session, you may not pass their name to `--approved-by`. Ask, or stop and hand over the
  unapproved draft path. Recording an approval that did not happen is the most expensive kind of bug this
  product can ship, and it is worse than the friction of asking.
- Never auto-confirm truth, visibility, or final approval.
- Keep sources, private memory, decisions and drafts private. Never compile a public draft in a context
  that still holds private sources.
- Never invent movement, failure, rationale, an observation, or a change of mind. If a session produced
  little, say so — `no_movement` is a successful private-memory result with no post.
- Never manufacture a caveat to look balanced, and never hide a real one to look better.
- Do not put a number in the title. Say what happened.
- **Watch every second of every recording before approving it.** Publication is immutable.
- Do not finish without a review URL, or without saying exactly what blocked one.

## Vocabulary

The public artifact is still called `chapter.v1` in the schemas and the CLI, and that name is load-bearing
in the contracts. In anything the founder reads, call it a **post**. Do not narrate chapter numbers, and do
not talk to the founder about chapters.
