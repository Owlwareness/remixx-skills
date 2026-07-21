# remixx skills

Open, vendor-neutral rituals for turning conversations into living Projects and
real work into truthful public Chapters.

This repository contains two independent skills:

- [`remixx-start-project`](skills/remixx-start-project/SKILL.md) turns an
  explicit conversation or founder document into a reviewed
  `project-seed.v1`.
- [`remixx-report`](skills/remixx-report/SKILL.md) turns a bounded period of
  real Project work into private memory and, after two human gates, an approved
  public `chapter.v1`.

Any capable AI can retrieve and follow the Markdown directly. Codex-compatible
hosts may install the skill folders and invoke `$remixx-start-project` or
`$remixx-report`. Hosts with slash-command routing may expose `/start-project`
and `/report`.

## Trust boundary

The skills never sign in to Remixx, publish to Remixx, or receive Remixx
credentials. They produce reviewed portable artifacts:

```text
conversation → approved project-seed.v1
real work → private report.v1 → approved public chapter.v1
```

Authentication begins in the separate hosted platform session that claims a
Project seed or publishes a matching Chapter. Private Reports, raw sources,
visibility decisions, and draft Chapters do not cross that boundary.

## Artifact CLI

The included CLI supplies deterministic schema validation, canonical hashes,
public-subset construction, approval transitions, and leak-resistant Chapter
export. It does not call a model: the active AI host performs the reasoning,
while the CLI protects the artifact boundaries.

```sh
npm install
node bin/remixx-artifact.mjs help
npm test
```

The schemas under each skill's `references/schemas/` directory are the
authoritative portable contracts.

## Direct AI retrieval

Give an AI one of these raw Markdown URLs:

```text
https://raw.githubusercontent.com/Owlwareness/remixx-skills/main/skills/remixx-start-project/SKILL.md
https://raw.githubusercontent.com/Owlwareness/remixx-skills/main/skills/remixx-report/SKILL.md
```

The public repository is the protocol distribution surface. The Remixx
platform remains the authenticated claim, publication, following, and
participation surface.
