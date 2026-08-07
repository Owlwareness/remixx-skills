#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const planPath = process.argv[2];
if (!planPath) {
  process.stderr.write(
    "Usage: node validate_video_plan.mjs <report-video-plan.json> [--require-approved]\n",
  );
  process.exit(2);
}

const planBytes = await readFile(planPath);
const plan = JSON.parse(planBytes.toString("utf8"));
const requireApproved = process.argv.includes("--require-approved");
const planDirectory = dirname(resolve(planPath));
const errors = [];
const SHA256 = /^[a-f0-9]{64}$/;
// Story beats are a free-form label, not a fixture. A required set of beats forces a plan to
// manufacture content to fill an empty slot -- most obviously a "limitation" invented so the plan
// would validate. The story comes from what actually happened in the session. What is still checked
// is structural: beats do not overlap, narration stays inside its beat, and a claim about motion is
// backed by a screencast long enough to show it.
const PROOF_KINDS = new Set([
  "before_state",
  "ui_state",
  "interaction",
  "external_console",
  "negative_evidence",
]);
const ASSET_KINDS = new Set(["screenshot", "screencast"]);
const CUE_KINDS = new Set([
  "cut",
  "playVideo",
  "push",
  "pan",
  "zoomTo",
  "drawBox",
  "drawArrow",
  "label",
  "cursor",
  "strike",
]);
const PROVENANCE_KINDS = new Set([
  "model_derived",
  "founder_recorded",
  "founder_edited",
  "synthetic",
]);
const requireValue = (condition, message) => {
  if (!condition) errors.push(message);
};
const nonEmptyStrings = (value) =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((item) => typeof item === "string" && item.trim().length > 0);
const interval = (value) => ({
  start: value?.atMs,
  end:
    Number.isFinite(value?.atMs) && Number.isFinite(value?.durationMs)
      ? value.atMs + value.durationMs
      : Number.NaN,
});
const overlaps = (left, right) =>
  left.start < right.end && right.start < left.end;
const uniqueMap = (items, key, label) => {
  const output = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    const value = item?.[key];
    if (typeof value !== "string" || value.length === 0) {
      errors.push(`${label} has no ${key}`);
    } else if (output.has(value)) {
      errors.push(`duplicate ${label} ${value}`);
    } else {
      output.set(value, item);
    }
  }
  return output;
};

requireValue(
  plan.schemaVersion === "report-video-plan.v1",
  "schemaVersion must be report-video-plan.v1",
);
requireValue(
  typeof plan.sourceChapterHash === "string" &&
    SHA256.test(plan.sourceChapterHash),
  "sourceChapterHash must be a sha256",
);
requireValue(
  nonEmptyStrings(plan.approvedClaimRefs),
  "approvedClaimRefs must be a non-empty string array",
);
const approvedClaimRefs = new Set(
  Array.isArray(plan.approvedClaimRefs) ? plan.approvedClaimRefs : [],
);
requireValue(
  Number.isFinite(plan.durationMs) &&
    plan.durationMs > 0 &&
    plan.durationMs <= 120_000,
  "durationMs must be between 1 and 120000",
);
requireValue(
  Number.isFinite(plan.evidenceFrameRatio) &&
    plan.evidenceFrameRatio >= 0.7 &&
    plan.evidenceFrameRatio <= 1,
  "evidenceFrameRatio must be between 0.7 and 1",
);
requireValue(plan.titleOccurrences === 1, "titleOccurrences must be exactly 1");

const beats = uniqueMap(plan.beats, "beatId", "beat");
const assets = uniqueMap(plan.assets, "assetId", "asset");
const segments = uniqueMap(
  plan.narrationSegments,
  "segmentId",
  "narration segment",
);
const cues = uniqueMap(plan.cues, "cueId", "cue");
requireValue(beats.size > 0, "at least one beat is required");
requireValue(assets.size > 0, "at least one asset is required");
requireValue(segments.size > 0, "at least one narration segment is required");
requireValue(cues.size > 0, "at least one cue is required");

const seenStoryBeats = new Set();
let previousBeatEnd = 0;

for (const beat of beats.values()) {
  if (beat.storyBeat !== undefined) {
    requireValue(
      typeof beat.storyBeat === "string" && beat.storyBeat.trim().length > 0,
      `beat ${beat.beatId} has an empty storyBeat label`,
    );
    seenStoryBeats.add(beat.storyBeat);
  }
  const beatInterval = interval(beat);
  requireValue(
    Number.isFinite(beatInterval.start) &&
      beatInterval.start >= previousBeatEnd,
    `beat ${beat.beatId} has invalid or overlapping atMs`,
  );
  requireValue(
    Number.isFinite(beat.durationMs) &&
      beat.durationMs > 0 &&
      beatInterval.end <= plan.durationMs,
    `beat ${beat.beatId} has invalid durationMs`,
  );
  if (Number.isFinite(beatInterval.end)) previousBeatEnd = beatInterval.end;
  requireValue(
    typeof beat.claim === "string" && beat.claim.trim().length > 0,
    `beat ${beat.beatId} has no claim`,
  );
  requireValue(
    PROOF_KINDS.has(beat.proofKind),
    `beat ${beat.beatId} has invalid proofKind`,
  );
  requireValue(
    Number.isFinite(beat.mustShowMs) &&
      beat.mustShowMs > 0 &&
      beat.mustShowMs <= beat.durationMs,
    `beat ${beat.beatId} has invalid mustShowMs`,
  );
  requireValue(
    nonEmptyStrings(beat.claimRefs),
    `beat ${beat.beatId} has no claimRefs`,
  );
  for (const claimRef of Array.isArray(beat.claimRefs) ? beat.claimRefs : []) {
    requireValue(
      approvedClaimRefs.has(claimRef),
      `beat ${beat.beatId} references unapproved claim ${claimRef}`,
    );
  }
  const assetIds = Array.isArray(beat.assetIds) ? beat.assetIds : [];
  const segmentIds = Array.isArray(beat.narrationSegmentIds)
    ? beat.narrationSegmentIds
    : [];
  requireValue(assetIds.length > 0, `beat ${beat.beatId} has no assets`);
  requireValue(
    segmentIds.length > 0,
    `beat ${beat.beatId} has no narration segments`,
  );
  for (const assetId of assetIds)
    requireValue(
      assets.has(assetId),
      `beat ${beat.beatId} references unknown asset ${assetId}`,
    );
  for (const segmentId of segmentIds) {
    requireValue(
      segments.has(segmentId),
      `beat ${beat.beatId} references unknown narration segment ${segmentId}`,
    );
    requireValue(
      segments.get(segmentId)?.beatId === beat.beatId,
      `beat ${beat.beatId} references narration segment ${segmentId} from another beat`,
    );
  }
  if (["interaction", "negative_evidence"].includes(beat.proofKind)) {
    const requiredMs = Number.isFinite(beat.mustShowMs) ? beat.mustShowMs : 0;
    const provingVideo = assetIds
      .map((assetId) => assets.get(assetId))
      .find(
        (asset) =>
          asset?.kind === "screencast" &&
          Number(asset.durationMs) >= requiredMs,
      );
    requireValue(
      Boolean(provingVideo),
      `beat ${beat.beatId} requires a screencast lasting at least ${requiredMs}ms`,
    );
  }
}

for (const asset of assets.values()) {
  requireValue(
    ASSET_KINDS.has(asset.kind),
    `asset ${asset.assetId} has invalid kind`,
  );
  requireValue(
    typeof asset.path === "string" && asset.path.trim().length > 0,
    `asset ${asset.assetId} has no path`,
  );
  requireValue(
    typeof asset.sha256 === "string" && SHA256.test(asset.sha256),
    `asset ${asset.assetId} has invalid sha256`,
  );
  requireValue(
    Number.isInteger(asset.width) && asset.width > 0,
    `asset ${asset.assetId} has invalid width`,
  );
  requireValue(
    Number.isInteger(asset.height) && asset.height > 0,
    `asset ${asset.assetId} has invalid height`,
  );
  if (asset.kind === "screencast") {
    requireValue(
      Number.isFinite(asset.durationMs) && asset.durationMs > 0,
      `screencast ${asset.assetId} has invalid durationMs`,
    );
  }
  requireValue(
    typeof asset.reproducibility?.reproducible === "boolean",
    `asset ${asset.assetId} has no reproducibility decision`,
  );
  requireValue(
    typeof asset.reproducibility?.source === "string" &&
      asset.reproducibility.source.trim().length > 0,
    `asset ${asset.assetId} has no reproducibility source`,
  );
  requireValue(
    Array.isArray(asset.captureTimeRedactions),
    `asset ${asset.assetId} has no captureTimeRedactions array`,
  );
  if (typeof asset.path === "string" && asset.path.trim().length > 0) {
    try {
      const bytes = await readFile(resolve(planDirectory, asset.path));
      const actualHash = createHash("sha256").update(bytes).digest("hex");
      requireValue(
        actualHash === asset.sha256,
        `asset ${asset.assetId} sha256 does not match its file`,
      );
    } catch (error) {
      requireValue(
        false,
        `asset ${asset.assetId} could not be read: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

for (const segment of segments.values()) {
  requireValue(
    beats.has(segment.beatId),
    `narration segment ${segment.segmentId} references unknown beat ${segment.beatId}`,
  );
  const segmentInterval = interval(segment);
  requireValue(
    Number.isFinite(segmentInterval.start) && segmentInterval.start >= 0,
    `narration segment ${segment.segmentId} has invalid atMs`,
  );
  requireValue(
    Number.isFinite(segment.durationMs) &&
      segment.durationMs > 0 &&
      segmentInterval.end <= plan.durationMs,
    `narration segment ${segment.segmentId} has invalid durationMs`,
  );
  requireValue(
    typeof segment.spoken === "string" && segment.spoken.trim().length > 0,
    `narration segment ${segment.segmentId} has no spoken text`,
  );
  requireValue(
    typeof segment.caption === "string" && segment.caption.trim().length > 0,
    `narration segment ${segment.segmentId} has no caption text`,
  );
  requireValue(
    nonEmptyStrings(segment.claimRefs),
    `narration segment ${segment.segmentId} has no claimRefs`,
  );
  requireValue(
    PROVENANCE_KINDS.has(segment.provenance),
    `narration segment ${segment.segmentId} has invalid provenance`,
  );
  const beat = beats.get(segment.beatId);
  if (beat) {
    requireValue(
      overlaps(segmentInterval, interval(beat)),
      `narration segment ${segment.segmentId} does not overlap its beat`,
    );
    requireValue(
      Array.isArray(beat.narrationSegmentIds) &&
        beat.narrationSegmentIds.includes(segment.segmentId),
      `narration segment ${segment.segmentId} is not listed by its beat`,
    );
    const beatClaims = new Set(
      Array.isArray(beat.claimRefs) ? beat.claimRefs : [],
    );
    for (const claimRef of Array.isArray(segment.claimRefs)
      ? segment.claimRefs
      : []) {
      requireValue(
        beatClaims.has(claimRef),
        `narration segment ${segment.segmentId} references claim ${claimRef} outside its beat`,
      );
    }
  }
}

const continuousKinds = new Set([
  "playVideo",
  "push",
  "pan",
  "zoomTo",
  "drawBox",
  "drawArrow",
  "cursor",
  "strike",
]);
const motionIntervals = [];
for (const cue of cues.values()) {
  requireValue(
    beats.has(cue.beatId),
    `cue ${cue.cueId} references unknown beat ${cue.beatId}`,
  );
  requireValue(CUE_KINDS.has(cue.kind), `cue ${cue.cueId} has invalid kind`);
  requireValue(
    Number.isFinite(cue.atMs) && cue.atMs >= 0 && cue.atMs <= plan.durationMs,
    `cue ${cue.cueId} has invalid atMs`,
  );
  const assetId = cue.target?.assetId;
  requireValue(
    typeof assetId === "string" && assets.has(assetId),
    `cue ${cue.cueId} references an unknown target asset`,
  );
  const durationMs =
    Number.isFinite(cue.durationMs) && cue.durationMs > 0 ? cue.durationMs : 0;
  requireValue(
    cue.atMs + durationMs <= plan.durationMs,
    `cue ${cue.cueId} extends beyond the video`,
  );
  const beat = beats.get(cue.beatId);
  if (beat) {
    requireValue(
      Array.isArray(beat.assetIds) && beat.assetIds.includes(assetId),
      `cue ${cue.cueId} targets an asset outside its beat`,
    );
    requireValue(
      cue.atMs >= beat.atMs && cue.atMs < beat.atMs + beat.durationMs,
      `cue ${cue.cueId} starts outside its beat`,
    );
  }
  const rect = cue.target?.rect;
  const hasRect =
    rect &&
    [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) &&
    rect.width > 0 &&
    rect.height > 0;
  const hasSelector =
    typeof cue.target?.selector === "string" &&
    cue.target.selector.trim().length > 0;
  requireValue(
    Boolean(hasSelector || hasRect),
    `cue ${cue.cueId} target needs a selector or rectangle`,
  );
  if (cue.kind === "playVideo" && typeof assetId === "string") {
    requireValue(
      assets.get(assetId)?.kind === "screencast",
      `cue ${cue.cueId} can only play a screencast`,
    );
  }
  if (continuousKinds.has(cue.kind)) {
    requireValue(
      durationMs > 0,
      `cue ${cue.cueId} needs a positive durationMs`,
    );
  }
  const endMs = continuousKinds.has(cue.kind)
    ? Math.min(plan.durationMs, cue.atMs + durationMs)
    : cue.atMs;
  motionIntervals.push([cue.atMs, endMs]);
}

for (const beat of beats.values()) {
  if (!["interaction", "negative_evidence"].includes(beat.proofKind)) continue;
  const beatAssets = new Set(Array.isArray(beat.assetIds) ? beat.assetIds : []);
  const proofCues = [...cues.values()].filter(
    (cue) =>
      cue.beatId === beat.beatId &&
      cue.kind === "playVideo" &&
      beatAssets.has(cue.target?.assetId) &&
      cue.durationMs >= beat.mustShowMs,
  );
  requireValue(
    proofCues.length > 0,
    `beat ${beat.beatId} has no timed playVideo cue for its motion proof`,
  );
  for (const segmentId of Array.isArray(beat.narrationSegmentIds)
    ? beat.narrationSegmentIds
    : []) {
    const segment = segments.get(segmentId);
    if (segment)
      requireValue(
        proofCues.some((cue) => overlaps(interval(cue), interval(segment))),
        `narration segment ${segmentId} does not overlap motion proof`,
      );
  }
}

requireValue(
  plan.privacy && typeof plan.privacy === "object",
  "privacy manifest is required",
);
requireValue(
  Array.isArray(plan.privacy?.structuralRedactions),
  "privacy.structuralRedactions must be an array",
);
requireValue(
  Array.isArray(plan.privacy?.retainedPublicProof),
  "privacy.retainedPublicProof must be an array",
);
const retainedPublicProof = Array.isArray(plan.privacy?.retainedPublicProof)
  ? plan.privacy.retainedPublicProof
  : [];
for (const [index, item] of retainedPublicProof.entries()) {
  requireValue(
    typeof item?.reason === "string" && item.reason.trim().length > 0,
    `retained public proof ${index + 1} has no reason`,
  );
}
requireValue(
  ["pending", "approved", "rejected"].includes(
    plan.privacy?.founderApprovalState,
  ),
  "privacy.founderApprovalState is invalid",
);
requireValue(
  ["pending", "approved", "rejected"].includes(plan.approval?.status),
  "approval.status is invalid",
);
if (plan.approval?.status === "approved") {
  requireValue(
    typeof plan.approval.approvedBy === "string" &&
      plan.approval.approvedBy.trim().length > 0,
    "approval.approvedBy is required when approved",
  );
  requireValue(
    typeof plan.approval.approvedAt === "string" &&
      /(?:Z|[+-]\d{2}:\d{2})$/.test(plan.approval.approvedAt) &&
      Number.isFinite(Date.parse(plan.approval.approvedAt)),
    "approval.approvedAt must be an offset ISO-8601 timestamp when approved",
  );
}
if (requireApproved) {
  // Privacy approval is required and stays required: it is what confirms the
  // founder agreed to what becomes public, and that is not a matter of taste.
  requireValue(
    plan.privacy?.founderApprovalState === "approved",
    "founder privacy approval is required for rendering",
  );
  // Contact-sheet approval is deliberately NOT required. It used to be, which
  // meant the founder had to sign off a storyboard before anything could render
  // -- an approval on an intermediate artifact that exists only for review.
  // The taste decision belongs on the finished video, where it is one yes or no
  // bound to the real hashes. If a contact sheet is shown and approved anyway,
  // the block above still validates its fields.
  requireValue(
    plan.approval?.status !== "rejected",
    "the contact sheet was rejected; do not render it",
  );
}

motionIntervals.sort((left, right) => left[0] - right[0]);
let coveredUntil = 0;
for (const [startMs, endMs] of motionIntervals) {
  if (startMs - coveredUntil > 4_000)
    errors.push(`visual motion gap exceeds 4000ms before ${startMs}ms`);
  coveredUntil = Math.max(coveredUntil, endMs);
}
if (
  Number.isFinite(plan.durationMs) &&
  plan.durationMs - coveredUntil > 4_000
) {
  errors.push(`visual motion gap exceeds 4000ms at the end of the video`);
}

if (errors.length > 0) {
  process.stderr.write(`${errors.map((error) => `- ${error}`).join("\n")}\n`);
  process.exit(1);
}

process.stdout.write(
  `Valid report video plan: ${beats.size} beats, ${assets.size} assets, ${segments.size} narration segments, ${cues.size} cues, file sha256 ${createHash("sha256").update(planBytes).digest("hex")}.\n`,
);
