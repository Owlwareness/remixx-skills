import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const skill = await readFile(
  new URL("../skills/remixx-show/SKILL.md", import.meta.url),
  "utf8",
);

test("the show skill is a focused editorial adapter", () => {
  assert.ok(skill.split("\n").length <= 200);
  assert.match(skill, /^name: remixx-show$/m);
  assert.match(skill, /show what I built/i);
  assert.match(skill, /video post/i);
  assert.match(
    skill,
    /Use remixx\.org to show what I just built here as a video post\./,
  );
  assert.match(skill, /Never print a numeric menu/);
  assert.doesNotMatch(skill, /1 approve|2 edit|3 cancel/i);
  assert.match(skill, /idempotency-key/);
  assert.match(skill, /authentication_required/);
  assert.match(skill, /Remixx client unavailable/);
  assert.doesNotMatch(skill, /npx --yes @remixx\/cli/);
});

test("the skill teaches the current five-step flow in order", () => {
  const steps = [
    /npx --yes remixx-cli@latest report context --intent-stdin --workspace "\$PWD" --json/,
    /npx --yes remixx-cli@latest report capture --request-stdin --json/,
    /npx --yes remixx-cli@latest report direct --capture-id "\$CAPTURE_ID" --json/,
    /npx --yes remixx-cli@latest report direct --capture-id "\$CAPTURE_ID" --proposal-stdin --json/,
    /npx --yes remixx-cli@latest report create --capture-id "\$CAPTURE_ID" --resolution-token "\$RESOLUTION" --workspace "\$PWD" --idempotency-key "\$KEY" --wait --json/,
  ];
  let cursor = 0;
  for (const step of steps) {
    const found = skill.slice(cursor).search(step);
    assert.notEqual(found, -1, String(step));
    cursor += found + 1;
  }
  assert.match(skill, /npx --yes remixx-cli@latest report revise/);

  // The context handshake is always the first command shown.
  assert.match(
    skill.match(/^npx[^\r\n]+/m)?.[0] ?? "",
    /report context --intent-stdin/,
  );
});

test("the skill names only shipping contract versions", () => {
  assert.match(skill, /remixx-report-request\.v4/);
  assert.match(skill, /remixx-director-proposal\.v1/);
  assert.match(skill, /remixx-report-revision-request\.v3/);
  assert.match(skill, /proof-of-change-v1/);

  // Retired contracts and flags must not survive anywhere in the public skill:
  // an agent that copies one produces a request the server refuses.
  for (const retired of [
    "remixx-report-request.v1",
    "remixx-report-request.v2",
    "remixx-report-request.v3",
    "remixx-report-revision-request.v1",
    "remixx-report-revision-request.v2",
    "product-demo-overlay-v1",
    "spoken-preferred",
    "musicMode",
    "captionMode",
    '"cues"',
    "--output-dir",
    "--evidence-root",
    "--request <file>",
  ]) {
    assert.equal(skill.includes(retired), false, retired);
  }
});

test("the public skill carries no deprecation or compatibility framing", () => {
  // Models follow the clearest path they can see. A skill that also describes a
  // legacy path teaches the legacy path to someone.
  for (const confusing of [
    "legacy",
    "compatibility",
    "compatible client flow",
    "deprecated",
    "backwards",
  ]) {
    assert.equal(
      skill.toLowerCase().includes(confusing.toLowerCase()),
      false,
      confusing,
    );
  }
  // The retired skill name, but not the contract versions that share its prefix.
  assert.doesNotMatch(skill, /remixx-report(?!-re(quest|vision))/);
});

test("the retired duplicate skill is gone from the public repo", async () => {
  await assert.rejects(
    access(new URL("../skills/remixx-report/SKILL.md", import.meta.url)),
  );
});

test("the skill leaks no internal machinery", () => {
  for (const forbidden of [
    "ELEVENLABS_API_KEY",
    "ffmpeg",
    "Remotion",
    "chapter-media-stage",
    "exactPreviewApproval",
    "~/dev/remixx",
    "pnpm --filter",
    "~/dev/remixx-skills",
    "supabase",
  ]) {
    assert.equal(skill.includes(forbidden), false, forbidden);
  }
});
