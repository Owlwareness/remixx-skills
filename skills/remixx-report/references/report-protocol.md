# Portable Report protocol

## Artifact sequence

```text
explicit bounded sources
  → private report.v1
  → complete report-visibility-decisions.v1
  → ApprovedPublicItems.v1
  → fresh isolated Chapter compiler
  → draft chapter.v1
  → explicit Chapter approval
  → approved public chapter.v1
```

The authoritative schemas live in `schemas/`.

## Report extraction

Use source IDs and SHA-256 content hashes. Cite every Report item to one or more
manifested sources. Capture movement, decisions with rationale, attempts and
their classification, surprises, belief changes, friction, open edges,
candidate assumptions, and private notes only when supported.

Finalize the AI-produced Report:

```sh
node bin/remixx-artifact.mjs finalize \
  --kind report \
  --input <report-without-hash.json> \
  --out <private-report.json>
```

If the outcome is `no_movement`, preserve the Report and stop.

## Visibility review

Create one decision for every candidate item and every source. A rejected item
cannot be public. Every public item may cite only sources explicitly approved
as public.

The deterministic `build-approved-items` command fails on incomplete coverage,
non-public dependencies, mismatched Report IDs, or no publishable movement.

## Chapter compilation

Give a fresh context only `ApprovedPublicItems.v1`. Never give it the Report,
source bundle, decisions, private notes, or draft history.

Finalize the AI-produced draft:

```sh
node bin/remixx-artifact.mjs finalize \
  --kind chapter \
  --input <chapter-without-hash.json> \
  --out <draft-chapter.json>
```

Display the complete draft. Do not infer approval from approval of the public
items.
