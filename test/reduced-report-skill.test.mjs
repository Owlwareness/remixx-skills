import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const skill = await readFile(
  new URL("../skills/remixx-report/SKILL.md", import.meta.url),
  "utf8",
);

test("the report skill is a thin editorial adapter", () => {
  assert.ok(skill.split("\n").length <= 90);
  assert.equal(
    skill.match(/^npx[^\r\n]+/m)?.[0],
    'npx --yes remixx-cli@latest report create --request "$REQUEST" --evidence-root "$EVIDENCE" --idempotency-key "$KEY" --wait --json',
  );
  assert.match(
    skill,
    /npx --yes remixx-cli@latest report create --request "\$REQUEST" --evidence-root "\$EVIDENCE"/,
  );
  assert.match(skill, /npx --yes remixx-cli@latest report revise/);
  assert.doesNotMatch(skill, /npx --yes @remixx\/cli/);
  assert.match(
    skill,
    /Remixx client unavailable\. Run exactly: `npx --yes remixx-cli@latest report create …`/,
  );
  assert.match(skill, /remixx-client-result\.v1/);
  assert.match(skill, /idempotency-key/);
  for (const forbidden of [
    "ELEVENLABS_API_KEY",
    "ffmpeg",
    "Playwright",
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
