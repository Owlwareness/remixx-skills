import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createProjectBootstrapUrl,
  DEFAULT_REMIXX_ORIGIN,
} from "../lib/bootstrap.mjs";

const project = {
  schemaVersion: "remixx-project.v1",
  projectId: "11111111-1111-4111-8111-111111111111",
  slug: "plinth",
  name: "Plinth",
  vaultPath: "project-brain",
};

test("builds the production one-click bootstrap URL from local identity", async () => {
  const url = new URL(
    await createProjectBootstrapUrl({
      project,
      description: "  Put a screenshot on a pedestal.  ",
    }),
  );

  assert.equal(url.origin, DEFAULT_REMIXX_ORIGIN);
  assert.equal(url.pathname, "/projects/new");
  const token = url.searchParams.get("bootstrap");
  assert.ok(token);
  assert.deepEqual(
    JSON.parse(Buffer.from(token, "base64url").toString("utf8")),
    {
      projectId: project.projectId,
      slug: "plinth",
      name: "Plinth",
      description: "Put a screenshot on a pedestal.",
    },
  );
});

test("supports loopback origins for local end-to-end runs", async () => {
  const url = await createProjectBootstrapUrl({
    project,
    description: "Put a screenshot on a pedestal.",
    origin: "http://127.0.0.1:3000/ignored",
  });

  assert.match(url, /^http:\/\/127\.0\.0\.1:3000\/projects\/new\?bootstrap=/);
});

test("refuses descriptions the platform cannot accept", async () => {
  await assert.rejects(
    createProjectBootstrapUrl({ project, description: "Too short" }),
    /between 10 and 1000 characters/,
  );
});

test("refuses insecure non-loopback origins", async () => {
  await assert.rejects(
    createProjectBootstrapUrl({
      project,
      description: "Put a screenshot on a pedestal.",
      origin: "http://example.com",
    }),
    /must use HTTPS/,
  );
});
