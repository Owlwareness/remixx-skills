import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("does not expose the retired project-seed workflow", async () => {
  await assert.rejects(
    access(new URL("../skills/remixx-start-project/SKILL.md", import.meta.url)),
  );

  const readme = await readFile(
    new URL("../README.md", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(readme, /project-seed|start-project/i);
});

test("carries no tooling a reader has no reason to open", async () => {
  // This repository publishes instructions, not a program. Anything a stranger
  // would not open on purpose belongs somewhere else.
  for (const retired of ["../bin", "../lib", "../schemas"]) {
    await assert.rejects(
      access(new URL(retired, import.meta.url)),
      undefined,
      retired,
    );
  }
});
