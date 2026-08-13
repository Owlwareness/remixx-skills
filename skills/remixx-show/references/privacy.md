# Privacy boundary

Private:

- raw conversations and source bytes;
- source bundles and private locators;
- `report.v1`;
- visibility decisions;
- `ApprovedPublicItems.v1` before intentional handoff;
- draft Chapters; and
- model-provider credentials.

Eligible for export:

- an approved `chapter.v1` whose canonical hash validates and whose complete
  contents the founder reviewed.

Before export, scan recursively for forbidden Report fields and credential-like
values. Refuse changed-content overwrite. A successful schema check never
substitutes for founder review.

The staging endpoint and platform session may receive the exported Chapter
only. Staging does not publish and must not open the private Project Brain to
make the handoff convenient.
