import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const skill = await readFile(
  new URL("../skills/remixx-report/SKILL.md", import.meta.url),
  "utf8",
);

test("the report skill is a focused editorial adapter", () => {
  assert.ok(skill.split("\n").length <= 180);
  assert.equal(
    skill.match(/^npx[^\r\n]+/m)?.[0],
    'npx --yes remixx-cli@latest report context --intent "$INTENT" --workspace "$PWD" --json',
  );
  assert.match(
    skill,
    /npx --yes remixx-cli@latest report capture --request "\$REQUEST" --output-dir "\$EVIDENCE"/,
  );
  assert.match(
    skill,
    /npx --yes remixx-cli@latest report create --request "\$REQUEST" --resolution-token "\$RESOLUTION" --workspace "\$PWD" --evidence-root "\$EVIDENCE"/,
  );
  assert.match(skill, /npx --yes remixx-cli@latest report revise/);
  assert.match(skill, /npx --yes remixx-cli@latest login --json/);
  assert.match(skill, /authentication_required/);
  assert.doesNotMatch(skill, /npx --yes @remixx\/cli/);
  assert.match(skill, /Remixx client unavailable/);
  assert.match(skill, /remixx-report-request\.v3/);
  assert.match(skill, /### Copyable v3 request/);
  assert.match(skill, /Never print a numeric menu/);
  assert.match(skill, /never `project\.projectId`/);
  assert.doesNotMatch(skill, /1 approve|2 edit|3 cancel/i);
  assert.match(skill, /idempotency-key/);
  for (const forbidden of [
    "ELEVENLABS_API_KEY",
    "ffmpeg",
    "Remotion",
    "chapter-media-stage",
    "exactPreviewApproval",
    "~/dev/remixx",
    "pnpm --filter",
    "~/dev/remixx-skills",
  ]) {
    assert.equal(skill.includes(forbidden), false, forbidden);
  }
});
