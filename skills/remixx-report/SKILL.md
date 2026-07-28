---
name: remixx-report
description: Turn real work in an accessible Project into durable private memory and, after explicit truth, visibility, and Chapter approval gates, one public Remixx Chapter. Use when the user runs `/report`, invokes `$remixx-report`, asks to capture or report a work session, turn real work into a Remixx post, or update a Project Brain after meaningful work.
---

# Report real Project work

Create private memory and one reviewed public `chapter.v1`, then stage only the
approved artifact for browser review without signing in or publishing.

## Workflow

1. Read [report-protocol.md](references/report-protocol.md) and
   [privacy.md](references/privacy.md).
2. Discover `.remixx/project.json` or ask for stable Project identity.
3. Bound the sources. Show which exact source bytes may reach the active model
   before using them.
4. Create a private `report.v1` from manifested evidence. Finalize and validate
   it with the artifact CLI.
5. Show every candidate item and source. Pause for explicit truth and
   visibility decisions covering all candidates.
6. Build `ApprovedPublicItems.v1` deterministically:

   ```sh
   node bin/remixx-artifact.mjs build-approved-items \
     --report <private-report.json> \
     --decisions <visibility-decisions.json> \
     --out <approved-public-items.json>
   ```

7. Start a fresh isolated model context containing only the approved public
   items. If the host cannot isolate compilation, stop with the approved-items
   path.
8. Compile a draft `chapter.v1`, then finalize and validate it.
9. Show the complete draft and pause for separate Chapter approval.
10. Approve and export only after explicit approval:

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

11. Stage the approved exported Chapter in the steward's private Remixx inbox:

    ```sh
    node bin/remixx-artifact.mjs stage-chapter \
      --input <public-outbox/chapter.json>
    ```

12. End with the exported artifact path and returned review URL. Tell the
    founder to refresh the authenticated Project studio, read the pending
    Chapter, and choose Publish or Dismiss. If staging fails, preserve the file
    and give the manual upload fallback.

## Rules

- Do not sign in, call Supabase directly, or publish.
- Call only the bounded Chapter staging endpoint, and only after explicit
  Chapter approval and successful public-artifact validation.
- Keep sources, Reports, decisions, and drafts private.
- Never auto-confirm truth, visibility, or Chapter approval.
- Never invent movement, failure, rationale, founder observation, or belief
  change.
- Treat `no_movement` as a successful private-memory result with no Chapter.
- Never compile a Chapter in a context that still contains private sources.
