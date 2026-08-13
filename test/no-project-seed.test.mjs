import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { artifactKinds } from "../lib/schemas.mjs";

test("does not expose the retired project-seed workflow", async () => {
  await assert.rejects(
    access(new URL("../skills/remixx-start-project/SKILL.md", import.meta.url)),
  );

  const readme = await readFile(
    new URL("../README.md", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(readme, /project-seed|start-project/i);
  assert.equal(artifactKinds.includes("project-seed"), false);
  assert.equal(artifactKinds.includes("project"), false);
});
