import assert from "node:assert/strict";
import { test } from "node:test";
import {
  approveChapter,
  buildApprovedPublicItems,
  exportChapter,
  finalizeArtifact,
  validateArtifact,
} from "../lib/artifacts.mjs";
import { stageChapter } from "../lib/staging.mjs";

const ids = {
  project: "11111111-1111-4111-8111-111111111111",
  report: "77777777-7777-4777-8777-777777777777",
  source: "88888888-8888-4888-8888-888888888888",
  promise: "99999999-9999-4999-8999-999999999999",
  movement: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  extractionExecution: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  criticExecution: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  approvedItems: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  chapter: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  chapterExecution: "ffffffff-ffff-4fff-8fff-ffffffffffff",
};

const at = "2026-07-18T18:00:00.000Z";
const later = "2026-07-18T19:00:00.000Z";

async function substantiveReport() {
  return finalizeArtifact("report", {
    schemaVersion: "report.v1",
    reportId: ids.report,
    project: {
      projectId: ids.project,
      slug: "noterelay",
      name: "NoteRelay",
    },
    period: { startedAt: at, endedAt: later },
    sourceManifest: {
      schemaVersion: "report-source-manifest.v1",
      entries: [
        {
          sourceId: ids.source,
          kind: "repository",
          label: "First implementation checkpoint",
          contentHash: "a".repeat(64),
          locator: "git:HEAD",
          capturedAt: later,
          proposedVisibility: "public",
        },
      ],
    },
    promiseContext: {
      itemId: ids.promise,
      statement:
        "Turn ordinary meeting notes into a reliable, shared action list.",
      sourceRefs: [ids.source],
      proposedVisibility: "public",
    },
    extraction: {
      sessionOutcome: "substantive",
      movement: [
        {
          itemId: ids.movement,
          summary:
            "A deterministic parser now produces a first structured action list from a fixture.",
          significance:
            "The extraction can be tested before it handles free-form notes.",
          sourceRefs: [ids.source],
          proposedVisibility: "public",
        },
      ],
      decisions: [],
      attempts: [],
      surprises: [],
      beliefChanges: [],
      frictions: [],
      openEdges: [],
      candidateAssumptions: [],
      privateNotes: [
        {
          noteId: "12121212-1212-4212-8212-121212121212",
          body: "This private note must never enter the approved subset.",
          sourceRefs: [ids.source],
          visibility: "private",
        },
      ],
    },
    generation: {
      generatedAt: later,
      provider: "active-agent",
      model: "host-model",
      promptVersion: "report-extract.v1",
      criticVersion: "report-critic.v1",
      extractionExecutionId: ids.extractionExecution,
      criticExecutionId: ids.criticExecution,
      aiExpanded: true,
    },
  });
}

function decisions(report) {
  return {
    schemaVersion: "report-visibility-decisions.v1",
    reportId: report.reportId,
    reviewedBy: "Founder",
    reviewedAt: later,
    itemDecisions: [
      {
        itemId: ids.promise,
        truth: "confirmed",
        visibility: "public",
      },
      {
        itemId: ids.movement,
        truth: "confirmed",
        visibility: "public",
      },
    ],
    sourceDecisions: [
      {
        sourceId: ids.source,
        visibility: "public",
        publicLabel: "First implementation checkpoint",
        publicLocator: null,
      },
    ],
  };
}

async function draftChapter(approvedItems) {
  return finalizeArtifact("chapter", {
    schemaVersion: "chapter.v1",
    chapterId: ids.chapter,
    reportId: ids.report,
    approvedPublicItemsId: approvedItems.artifactId,
    project: approvedItems.project,
    period: approvedItems.period,
    title: "The first action list appears",
    dek: "A deterministic parser now drafts the first NoteRelay action list.",
    promiseContext: approvedItems.promiseContext.statement,
    movementSummary: {
      text: "The first structured action list is now produced from deterministic evidence.",
      sourceRefs: [ids.source],
      claimRefs: ["first_movement"],
    },
    frictionHooks: [
      {
        key: "real_notes",
        heading: "Real notes are next",
        tension:
          "The parser works on a fixture, but it does not yet handle free-form meeting notes.",
        whyItMatters:
          "The product promise depends on earning reliable actions from ordinary notes.",
        sourceRefs: [ids.source],
        claimRefs: ["first_movement"],
      },
    ],
    changedBeliefsOrLessons: [],
    openEdges: [],
    sourceRefs: approvedItems.sourceRefs,
    claimRefs: [
      {
        claimKey: "first_movement",
        approvedItemId: ids.movement,
        statement:
          "A deterministic parser produces the first structured action list.",
        sourceRefs: [ids.source],
      },
    ],
    riffAnchors: [
      {
        key: "riff_real_notes",
        kind: "friction",
        targetKey: "real_notes",
        prompt:
          "What is the smallest real-notes sample that would make this extraction credible?",
        claimRefs: ["first_movement"],
      },
    ],
    aiDisclosure: {
      assisted: true,
      statement:
        "AI compiled this Chapter only from founder-approved public items.",
      provider: "active-agent",
      model: "host-model",
      promptVersion: "chapter-compile.v1",
      executionId: ids.chapterExecution,
    },
    approval: {
      publicItemsApprovedBy: "Founder",
      publicItemsApprovedAt: later,
      publicItemsContentHash: approvedItems.contentHash,
      chapter: {
        status: "draft",
        approvedBy: null,
        approvedAt: null,
      },
    },
    generatedAt: later,
  });
}

test("builds the exact public subset and exports only an approved Chapter", async () => {
  const report = await substantiveReport();
  const approvedItems = await buildApprovedPublicItems({
    report,
    decisions: decisions(report),
    artifactId: ids.approvedItems,
  });

  const serialized = JSON.stringify(approvedItems);
  assert.equal(serialized.includes("private note"), false);
  assert.equal(serialized.includes("privateNotes"), false);
  assert.equal(serialized.includes("sourceManifest"), false);

  const draft = await draftChapter(approvedItems);
  await assert.rejects(exportChapter(draft), /explicitly approved/);

  const approved = await approveChapter(draft, {
    approvedBy: "Founder",
    approvedAt: later,
  });
  assert.equal((await exportChapter(approved)).chapterId, ids.chapter);

  const leaking = await finalizeArtifact("chapter", {
    ...approved,
    dek: `This contains ghp_${"a".repeat(36)} and must not export.`,
  });
  await assert.rejects(exportChapter(leaking), /credential-like value/);
});

test("no-movement Reports remain private and cannot build public items", async () => {
  const report = await substantiveReport();
  const noMovement = await finalizeArtifact("report", {
    ...report,
    extraction: {
      ...report.extraction,
      sessionOutcome: "no_movement",
      movement: [],
      privateNotes: [],
    },
  });
  const review = {
    ...decisions(noMovement),
    itemDecisions: [decisions(noMovement).itemDecisions[0]],
  };
  await assert.rejects(
    buildApprovedPublicItems({
      report: noMovement,
      decisions: review,
      artifactId: ids.approvedItems,
    }),
    /No founder-approved publishable movement/,
  );
});

test("stages only an approved public Chapter and returns its review URL", async () => {
  const report = await substantiveReport();
  const approvedItems = await buildApprovedPublicItems({
    report,
    decisions: decisions(report),
    artifactId: ids.approvedItems,
  });
  const draft = await draftChapter(approvedItems);
  const approved = await approveChapter(draft, {
    approvedBy: "Founder",
    approvedAt: later,
  });
  let sent;
  const result = await stageChapter({
    chapter: approved,
    endpoint: "https://remixx.example/api/chapters/stage",
    fetchImpl: async (_url, init) => {
      sent = JSON.parse(init.body);
      return new Response(
        JSON.stringify({
          stageId: "abababab-abab-4bab-8bab-abababababab",
          projectId: approved.project.projectId,
          chapterId: approved.chapterId,
          contentHash: approved.contentHash,
          status: "pending",
          stagedAt: later,
          duplicate: false,
          reviewPath: `/projects/${approved.project.projectId}/chapters`,
        }),
        {
          status: 202,
          headers: { "content-type": "application/json" },
        },
      );
    },
  });

  assert.deepEqual(sent, approved);
  assert.equal(
    result.reviewUrl,
    `https://remixx.example/projects/${approved.project.projectId}/chapters`,
  );
});

test("never stages a draft Chapter or trusts a mismatched response", async () => {
  const report = await substantiveReport();
  const approvedItems = await buildApprovedPublicItems({
    report,
    decisions: decisions(report),
    artifactId: ids.approvedItems,
  });
  const draft = await draftChapter(approvedItems);
  let called = false;
  await assert.rejects(
    stageChapter({
      chapter: draft,
      endpoint: "https://remixx.example/api/chapters/stage",
      fetchImpl: async () => {
        called = true;
      },
    }),
    /explicitly approved/,
  );
  assert.equal(called, false);

  const approved = await approveChapter(draft, {
    approvedBy: "Founder",
    approvedAt: later,
  });
  await assert.rejects(
    stageChapter({
      chapter: approved,
      endpoint: "https://remixx.example/api/chapters/stage",
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            stageId: "abababab-abab-4bab-8bab-abababababab",
            projectId: approved.project.projectId,
            chapterId: "cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd",
            contentHash: approved.contentHash,
            status: "pending",
            stagedAt: later,
            duplicate: false,
            reviewPath: `/projects/${approved.project.projectId}/chapters`,
          }),
          { status: 202 },
        ),
    }),
    /does not match/,
  );
});
