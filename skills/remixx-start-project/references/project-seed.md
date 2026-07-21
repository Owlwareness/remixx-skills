# `project-seed.v1`

Use the adjacent `schemas/project-seed.v1.schema.json` as the exact contract.

## Evidence classes

Label each selected origin statement:

- `founder_statement`: an explicit present-tense founder claim or intention;
- `founder_recollection`: a founder's memory of prior events that has not been
  recovered from an independent source; or
- `observed_source`: a claim directly supported by the supplied document or
  repository source.

Never silently promote recollection into observed history.

## Permanent Project identity

Create `.remixx/project.json` once before drafting the seed. Copy its exact
`projectId` into the seed's top-level `projectId`. The `projectId` identifies
the living Project across every future Report, Chapter, Riff, Card, experiment,
and hosted claim. The separate `seedId` identifies only this genesis artifact.
Never replace an existing Project ID during a later invocation.

## Drafting guidance

Write:

- `possibleFuture` as the world the Project wants to make possible;
- `purpose` as the concrete value it intends to create;
- `whyNow` as the present opportunity or pressure;
- `currentState` without implying unobserved implementation;
- `assumptions` as falsifiable beliefs with evidence needed;
- `constraints` as real boundaries;
- `experimentLadder` as ordered reversible moves and premeditated pivots; and
- `repositoryUrl` only when a real repository already exists.

The first experiment should be small enough for an ordinary work session to
produce evidence. Later `/report` invocations record what actually happened.

## Approval

Draft with:

```json
{
  "status": "draft",
  "approvedBy": null,
  "approvedAt": null
}
```

Show the entire finalized draft. Only after the founder explicitly approves it
may the approval become `approved`. Recompute `contentHash` after every change.

An approved seed is public-safe and portable. It is not automatically hosted or
publicly listed.
