# remixx skills

Open, vendor-neutral skills for turning real local work into truthful,
ready-to-post video posts.

The canonical public skill is:

- [`remixx-show`](skills/remixx-show/SKILL.md) turns work already present in a
  local web project into a private video-post review. The creator alone decides
  whether to press **Post**.

Any capable AI can retrieve and follow the Markdown directly. Codex-compatible
hosts may install the skill folder and invoke `$remixx-show`. The legacy
[`remixx-report`](skills/remixx-report/SKILL.md) entry remains available for
cached prompts and serves the same instructions.

## Trust boundary

The skills never sign in to Remixx, publish to Remixx, or receive Remixx
credentials. They produce reviewed portable artifacts and may stage only the
final approved public Chapter in a steward-only inbox:

```text
real work → private report.v1 → approved public chapter.v1 → pending inbox
```

Authentication begins in the separate hosted platform session that reviews and
publishes a pending Chapter. Staging grants no publication authority. Private
Reports, raw sources, visibility decisions, and draft Chapters do not cross that
boundary.

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

The schemas under the legacy protocol support directory's `references/schemas/` directory are the
authoritative portable contracts.

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
surface. Before the first npm release, the source names `remixx-cli@latest`; the canonical endpoint resolves
that marker to the exact published version as soon as npm exposes it.
