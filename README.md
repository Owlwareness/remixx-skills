# remixx skills

Open, vendor-neutral skills for turning real local work into truthful,
ready-to-post video posts.

There is one skill:

- [`remixx-show`](skills/remixx-show/SKILL.md) turns work already present in a
  local web project into a private video-post review. The creator alone decides
  whether to press **Post**.

Any capable AI can retrieve and follow the Markdown directly. Codex-compatible
hosts may install the skill folder and invoke `$remixx-show`.

## The flow

```text
resolve destination → capture evidence → direct the edit → private review → the creator posts
```

The AI following the skill chooses the subject and directs the edit: which
moment is the proof, how it is framed, where it cuts. The published client
captures the evidence and carries the plan. Remixx verifies custody and evidence
lineage, renders the accepted plan, and shows the creator a private review.

Model choice and inference cost stay on the creator's side. Remixx buys no
tokens to make a post, and no Remixx service decides what a post looks like.

## Trust boundary

The skill never publishes. It reads the local project, drives the published
client, and returns a private review link. Project identity, post reservation,
source hashes, and the publication destination are resolved by the server and
never appear in anything the AI writes. Pressing **Post** is the creator's,
inside an authenticated session this skill has no part in.

## Artifact CLI

The included CLI supplies deterministic schema validation, canonical hashes,
public-subset construction, approval transitions, and leak-resistant Chapter
export, plus a bounded approved-Chapter staging handoff. It does not call a
model: the active AI host performs the reasoning, while the CLI protects the
artifact boundaries.

```sh
npm install
node bin/remixx-artifact.mjs help
npm test
```

Its portable contracts live in [`schemas/`](schemas/). They are separate from the
skill above, which needs no schema files to follow.

## Canonical AI retrieval

The public show skill is authored in this repository at
[`skills/remixx-show/SKILL.md`](skills/remixx-show/SKILL.md). The Remixx application serves that source
through the single stable discovery URL:

```text
https://remixx.org/show
```

Give an AI that URL for show instructions. No authentication, clone, install, or existing Remixx directory is
required to read it. The copy in the private application monorepo is a byte-identical deployment mirror; this
public repository remains the source. The Remixx platform remains the authenticated review and publication
surface. The skill names `remixx-cli@latest` so a reader always runs the current published client.
