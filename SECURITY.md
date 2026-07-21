# Security and privacy

Report vulnerabilities privately to the repository owner rather than opening a
public issue containing secrets or private Project material.

Never attach raw conversations, private Reports, source bundles, visibility
decisions, unapproved Chapters, access tokens, cookies, database credentials,
or private repository contents to a public issue.

Only these artifacts are intended to leave a founder-controlled work
environment:

- an explicitly approved `project-seed.v1`; and
- an explicitly approved public `chapter.v1`.

The CLI rejects common credential patterns, known private Report fields,
unapproved Chapters, mismatched canonical hashes, and changed-content
overwrites. These checks reduce accidental disclosure; they do not replace a
founder's complete review of every exported artifact.
