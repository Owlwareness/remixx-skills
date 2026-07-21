---
name: remixx-start-project
description: Turn an explicit founder conversation or document into a reviewed, public-safe Remixx Project seed. Use when the user runs `/start-project`, invokes `$remixx-start-project`, asks to spawn, seed, start, or create a Remixx Project from a conversation or brief, or wants to distill an idea into a portable Project artifact.
---

# Start a remixx Project

Create a truthful `project-seed.v1` without signing in or publishing.

## Workflow

1. Read [project-seed.md](references/project-seed.md).
2. Bound the source to explicit conversation turns and attached documents the
   founder authorizes.
3. Separate founder recollection, observed evidence, and planned experiments.
4. Create the permanent local Project identity once:

   ```sh
   node bin/remixx-artifact.mjs init-project \
     --name <name> \
     --slug <slug> \
     --out .remixx/project.json
   ```

   If `.remixx/project.json` already exists, validate and reuse it; never mint
   another Project ID.

5. Draft the possible future, purpose, why now, current state, assumptions,
   constraints, and first reversible experiment ladder. Set the seed's
   top-level `projectId` to the exact value from `.remixx/project.json`.
6. Include only selected public-safe source statements, never the raw
   transcript.
7. Write a draft seed with `approval.status = "draft"`.
8. Finalize and validate it:

   ```sh
   node bin/remixx-artifact.mjs finalize \
     --kind project-seed \
     --input <draft.json> \
     --out <review.json>

   node bin/remixx-artifact.mjs verify-project-seed \
     --project .remixx/project.json \
     --seed <review.json>
   ```

9. Show the founder the complete seed and pause.
10. After explicit approval, run:

```sh
node bin/remixx-artifact.mjs approve-seed \
  --input <review.json> \
  --approved-by <name> \
  --approved-at <ISO-8601> \
  --out <approved-project-seed.json>
```

11. End with the approved artifact path and instruct the founder to claim it in
    a separate authenticated Remixx session.

## Rules

- Do not sign in, call Remixx, create a hosted Project, or connect GitHub.
- Do not infer approval from the request to start drafting.
- Do not present remembered inspiration as observed repository history.
- Put anticipated pivots in `experimentLadder`; never fabricate completed work.
- Do not include credentials, private source text, inferred biography, or an
  unreviewed public claim.
- Treat the seed as a portable proposal, not proof that a public Project exists.
