import { randomUUID } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { sha256CanonicalJson, withContentHash } from "./canonical.mjs";
import { validateSchema } from "./schemas.mjs";

const forbiddenChapterFields = new Set([
  "privateNotes",
  "privatePayload",
  "proposedVisibility",
  "sourceManifest",
  "extraction",
  "generation",
  "itemDecisions",
  "sourceDecisions",
  "truth",
  "visibility",
  "visibilityDecision",
  "visibilityDecisions",
  "reviewedBy",
  "reviewedAt",
  "locator",
  "sources",
  "decisions",
]);

const credentialPatterns = [
  /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /ghp_[a-zA-Z0-9]{36}/,
  /github_pat_[a-zA-Z0-9_]{20,}/,
  /xox[baprs]-[a-zA-Z0-9-]{10,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
];

const hashedKinds = new Set([
  "project-seed",
  "report",
  "chapter",
  "approved-items",
]);

export async function readJson(filePath) {
  return JSON.parse(await readFile(path.resolve(filePath), "utf8"));
}

export async function writeJsonIdempotently(filePath, value) {
  const resolved = path.resolve(filePath);
  const content = `${JSON.stringify(value, null, 2)}\n`;
  await mkdir(path.dirname(resolved), { recursive: true });
  try {
    await access(resolved, constants.F_OK);
    const existing = await readFile(resolved, "utf8");
    if (existing !== content) {
      throw new Error(`Refusing to overwrite different content at ${resolved}`);
    }
  } catch (error) {
    if (error?.code === "ENOENT") {
      await writeFile(resolved, content, { encoding: "utf8", flag: "wx" });
    } else {
      throw error;
    }
  }
  return resolved;
}

const unique = (values, label) => {
  if (new Set(values).size !== values.length) {
    throw new Error(`${label} must be unique`);
  }
};

const requireKnownRefs = (refs, known, label) => {
  for (const ref of refs) {
    if (!known.has(ref)) throw new Error(`${label} references unknown ${ref}`);
  }
};

function validateProjectSeed(seed) {
  unique(
    seed.originStatements.map((item) => item.statementId),
    "Origin statement IDs",
  );
  unique(
    seed.assumptions.map((item) => item.assumptionId),
    "Assumption IDs",
  );
  unique(
    seed.constraints.map((item) => item.constraintId),
    "Constraint IDs",
  );
  unique(
    seed.experimentLadder.map((item) => item.experimentId),
    "Experiment IDs",
  );
  unique(
    seed.experimentLadder.map((item) => item.order),
    "Experiment order values",
  );
}

function reportCandidates(report) {
  return [
    { kind: "promise", value: report.promiseContext },
    ...[
      ["movement", report.extraction.movement],
      ["decision", report.extraction.decisions],
      ["attempt", report.extraction.attempts],
      ["surprise", report.extraction.surprises],
      ["belief_change", report.extraction.beliefChanges],
      ["friction", report.extraction.frictions],
      ["open_edge", report.extraction.openEdges],
      ["candidate_assumption", report.extraction.candidateAssumptions],
    ].flatMap(([kind, values]) => values.map((value) => ({ kind, value }))),
  ];
}

function validateReport(report) {
  if (
    new Date(report.period.endedAt).getTime() <=
    new Date(report.period.startedAt).getTime()
  ) {
    throw new Error("Report period end must be after its start");
  }
  const sourceIds = report.sourceManifest.entries.map(
    (source) => source.sourceId,
  );
  unique(sourceIds, "Report source IDs");
  const knownSources = new Set(sourceIds);
  const candidates = reportCandidates(report);
  const itemIds = [
    ...candidates.map(({ value }) => value.itemId),
    ...report.extraction.privateNotes.map((note) => note.noteId),
  ];
  unique(itemIds, "Report item IDs");
  for (const item of [
    ...candidates.map(({ value }) => value),
    ...report.extraction.privateNotes,
  ]) {
    requireKnownRefs(item.sourceRefs, knownSources, "Report item");
  }
  if (report.extraction.sessionOutcome === "no_movement") {
    const movementCount = [
      report.extraction.movement,
      report.extraction.decisions,
      report.extraction.attempts,
      report.extraction.surprises,
      report.extraction.beliefChanges,
      report.extraction.frictions,
    ].reduce((count, values) => count + values.length, 0);
    if (movementCount !== 0) {
      throw new Error("A no-movement Report cannot contain claimed movement");
    }
  }
  if (
    report.extraction.sessionOutcome === "blocked" &&
    !report.extraction.attempts.some((attempt) =>
      ["blocked", "failed", "inconclusive"].includes(attempt.classification),
    )
  ) {
    throw new Error("A blocked Report requires a blocking attempt");
  }
}

function validateDecisions(decisions) {
  unique(
    decisions.itemDecisions.map((decision) => decision.itemId),
    "Visibility item decision IDs",
  );
  unique(
    decisions.sourceDecisions.map((decision) => decision.sourceId),
    "Visibility source decision IDs",
  );
  for (const decision of decisions.itemDecisions) {
    if (decision.truth === "rejected" && decision.visibility === "public") {
      throw new Error("A rejected item cannot be approved for public use");
    }
  }
}

function validateApprovedItems(artifact) {
  const itemIds = [
    artifact.promiseContext.itemId,
    ...artifact.items.map((item) => item.itemId),
  ];
  unique(itemIds, "Approved public item IDs");
  const sourceIds = artifact.sourceRefs.map((source) => source.sourceId);
  unique(sourceIds, "Approved public source IDs");
  const knownSources = new Set(sourceIds);
  for (const item of [artifact.promiseContext, ...artifact.items]) {
    requireKnownRefs(item.sourceRefs, knownSources, "Approved public item");
  }
}

function validateChapter(chapter) {
  if (
    new Date(chapter.period.endedAt).getTime() <=
    new Date(chapter.period.startedAt).getTime()
  ) {
    throw new Error("Chapter period end must be after its start");
  }
  const sourceIds = chapter.sourceRefs.map((source) => source.sourceId);
  const claimKeys = chapter.claimRefs.map((claim) => claim.claimKey);
  const sectionKeys = [
    ...chapter.frictionHooks.map((section) => section.key),
    ...chapter.changedBeliefsOrLessons.map((section) => section.key),
    ...chapter.openEdges.map((section) => section.key),
  ];
  unique(sourceIds, "Chapter source IDs");
  unique(claimKeys, "Chapter claim keys");
  unique(sectionKeys, "Chapter section keys");
  unique(
    chapter.riffAnchors.map((anchor) => anchor.key),
    "Chapter Riff anchor keys",
  );
  const knownSources = new Set(sourceIds);
  const knownClaims = new Set(claimKeys);
  const knownSections = new Set(sectionKeys);
  for (const item of [
    chapter.movementSummary,
    ...chapter.frictionHooks,
    ...chapter.changedBeliefsOrLessons,
    ...chapter.openEdges,
  ]) {
    requireKnownRefs(item.sourceRefs, knownSources, "Chapter section");
    requireKnownRefs(item.claimRefs, knownClaims, "Chapter section");
  }
  for (const claim of chapter.claimRefs) {
    requireKnownRefs(claim.sourceRefs, knownSources, "Chapter claim");
  }
  for (const anchor of chapter.riffAnchors) {
    if (!knownSections.has(anchor.targetKey)) {
      throw new Error(
        `Riff anchor references unknown section ${anchor.targetKey}`,
      );
    }
    requireKnownRefs(anchor.claimRefs, knownClaims, "Riff anchor");
  }
}

function validateHash(kind, value) {
  if (!hashedKinds.has(kind)) return;
  const { contentHash, ...withoutHash } = value;
  const expected = sha256CanonicalJson(withoutHash);
  if (contentHash !== expected) {
    throw new Error(
      `${kind} contentHash does not match canonical contents; expected ${expected}`,
    );
  }
}

export async function validateArtifact(kind, value) {
  await validateSchema(kind, value);
  if (kind === "project-seed") validateProjectSeed(value);
  if (kind === "report") validateReport(value);
  if (kind === "decisions") validateDecisions(value);
  if (kind === "approved-items") validateApprovedItems(value);
  if (kind === "chapter") validateChapter(value);
  validateHash(kind, value);
  return value;
}

export async function finalizeArtifact(kind, value) {
  if (!hashedKinds.has(kind)) {
    throw new Error(`Cannot finalize un-hashed artifact kind ${kind}`);
  }
  const finalized = withContentHash(value);
  return validateArtifact(kind, finalized);
}

const sameSet = (left, right) =>
  left.length === right.length &&
  left.every((value) => new Set(right).has(value));

export async function buildApprovedPublicItems({
  report,
  decisions,
  artifactId = randomUUID(),
}) {
  await validateArtifact("report", report);
  await validateArtifact("decisions", decisions);
  if (report.reportId !== decisions.reportId) {
    throw new Error("Visibility decisions do not belong to this Report");
  }

  const candidates = reportCandidates(report);
  if (
    !sameSet(
      candidates.map(({ value }) => value.itemId),
      decisions.itemDecisions.map((decision) => decision.itemId),
    )
  ) {
    throw new Error("Founder review must cover every Report candidate");
  }
  if (
    !sameSet(
      report.sourceManifest.entries.map((source) => source.sourceId),
      decisions.sourceDecisions.map((decision) => decision.sourceId),
    )
  ) {
    throw new Error("Founder review must cover every Report source");
  }

  const itemDecision = new Map(
    decisions.itemDecisions.map((decision) => [decision.itemId, decision]),
  );
  const sourceDecision = new Map(
    decisions.sourceDecisions.map((decision) => [decision.sourceId, decision]),
  );
  const sourceById = new Map(
    report.sourceManifest.entries.map((source) => [source.sourceId, source]),
  );
  const isPublic = (itemId) => {
    const decision = itemDecision.get(itemId);
    return decision?.truth === "confirmed" && decision.visibility === "public";
  };
  if (!isPublic(report.promiseContext.itemId)) {
    throw new Error("The Project promise must be explicitly approved");
  }

  const items = candidates
    .filter(({ kind, value }) => kind !== "promise" && isPublic(value.itemId))
    .map(({ kind, value }) => {
      const { proposedVisibility: _private, ...safe } = value;
      void _private;
      return { kind, ...safe };
    });
  const meaningfulKinds = new Set([
    "movement",
    "decision",
    "attempt",
    "surprise",
    "belief_change",
  ]);
  if (!items.some((item) => meaningfulKinds.has(item.kind))) {
    throw new Error("No founder-approved publishable movement exists");
  }

  const usedSourceIds = new Set([
    ...report.promiseContext.sourceRefs,
    ...items.flatMap((item) => item.sourceRefs),
  ]);
  const sourceRefs = [...usedSourceIds].map((sourceId) => {
    const source = sourceById.get(sourceId);
    const decision = sourceDecision.get(sourceId);
    if (!source || decision?.visibility !== "public") {
      throw new Error(
        `Approved item depends on source ${sourceId} without public approval`,
      );
    }
    return {
      sourceId,
      kind: source.kind,
      label: decision.publicLabel,
      publicLocator: decision.publicLocator,
      contentHash: source.contentHash,
    };
  });

  return finalizeArtifact("approved-items", {
    schemaVersion: "ApprovedPublicItems.v1",
    artifactId,
    reportId: report.reportId,
    project: report.project,
    period: report.period,
    promiseContext: {
      itemId: report.promiseContext.itemId,
      statement: report.promiseContext.statement,
      sourceRefs: report.promiseContext.sourceRefs,
    },
    items,
    sourceRefs,
    approval: {
      approvedBy: decisions.reviewedBy,
      approvedAt: decisions.reviewedAt,
      visibilityDecisionHash: sha256CanonicalJson(decisions),
    },
  });
}

export async function approveSeed(seed, { approvedBy, approvedAt }) {
  await validateArtifact("project-seed", seed);
  if (seed.approval.status !== "draft") {
    throw new Error("Only a draft Project seed may be approved");
  }
  return finalizeArtifact("project-seed", {
    ...seed,
    approval: {
      status: "approved",
      approvedBy,
      approvedAt,
    },
  });
}

export async function approveChapter(chapter, { approvedBy, approvedAt }) {
  await validateArtifact("chapter", chapter);
  if (chapter.approval.chapter.status !== "draft") {
    throw new Error("Only a draft Chapter may be approved");
  }
  return finalizeArtifact("chapter", {
    ...chapter,
    approval: {
      ...chapter.approval,
      chapter: {
        status: "approved",
        approvedBy,
        approvedAt,
      },
    },
  });
}

function scanPublicChapter(value, currentPath = "$") {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      scanPublicChapter(item, `${currentPath}[${index}]`),
    );
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      if (forbiddenChapterFields.has(key)) {
        throw new Error(
          `Refusing to export forbidden private field ${currentPath}.${key}`,
        );
      }
      scanPublicChapter(nested, `${currentPath}.${key}`);
    }
    return;
  }
  if (typeof value === "string") {
    for (const pattern of credentialPatterns) {
      if (pattern.test(value)) {
        throw new Error(
          `Refusing to export credential-like value at ${currentPath}`,
        );
      }
    }
  }
}

export async function exportChapter(chapter) {
  await validateArtifact("chapter", chapter);
  if (chapter.approval.chapter.status !== "approved") {
    throw new Error("Chapter must be explicitly approved before export");
  }
  scanPublicChapter(chapter);
  return chapter;
}

export async function verifyProjectSeedIdentity({ project, seed }) {
  await validateArtifact("project", project);
  await validateArtifact("project-seed", seed);
  if (seed.projectId !== project.projectId) {
    throw new Error("Project seed does not use the permanent Project ID");
  }
  if (
    seed.project.slug !== project.slug ||
    seed.project.name !== project.name
  ) {
    throw new Error(
      "Project seed name or slug does not match .remixx/project.json",
    );
  }
  return { projectId: project.projectId, seedId: seed.seedId };
}

export async function createProjectIdentity({
  name,
  slug,
  vaultPath = "project-brain",
  projectId = randomUUID(),
}) {
  const value = {
    schemaVersion: "remixx-project.v1",
    projectId,
    slug,
    name,
    vaultPath,
  };
  return validateArtifact("project", value);
}
