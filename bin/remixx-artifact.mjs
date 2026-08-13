#!/usr/bin/env node

import {
  approveChapter,
  buildApprovedPublicItems,
  exportChapter,
  finalizeArtifact,
  readJson,
  validateArtifact,
  writeJsonIdempotently,
} from "../lib/artifacts.mjs";
import { artifactKinds } from "../lib/schemas.mjs";
import { stageChapter } from "../lib/staging.mjs";

function parseArguments(values) {
  const [command, ...rest] = values;
  const options = {};
  for (let index = 0; index < rest.length; index += 2) {
    const flag = rest[index];
    const value = rest[index + 1];
    if (!flag?.startsWith("--") || value === undefined) {
      throw new Error(`Invalid argument near ${flag ?? "<end>"}`);
    }
    options[flag.slice(2)] = value;
  }
  return { command, options };
}

function required(options, key) {
  const value = options[key];
  if (!value) throw new Error(`Missing required --${key}`);
  return value;
}

const help = `remixx-artifact

Commands:
  finalize --kind <report|chapter|approved-items>
    --input <json> --out <json>

  validate --kind <${artifactKinds.join("|")}> --input <json>

  build-approved-items --report <json> --decisions <json> --out <json>
    [--artifact-id <uuid>]

  approve-chapter --input <json> --approved-by <name>
    --approved-at <ISO-8601> --out <json>

  export-chapter --input <approved-json> --out <public-json>

  stage-chapter --input <approved-json> [--endpoint <https-url>]
`;

async function main() {
  const { command, options } = parseArguments(process.argv.slice(2));
  if (!command || command === "help" || command === "--help") {
    process.stdout.write(help);
    return;
  }

  if (command === "finalize") {
    const value = await finalizeArtifact(
      required(options, "kind"),
      await readJson(required(options, "input")),
    );
    process.stdout.write(
      `${await writeJsonIdempotently(required(options, "out"), value)}\n`,
    );
    return;
  }

  if (command === "validate") {
    const kind = required(options, "kind");
    const value = await readJson(required(options, "input"));
    await validateArtifact(kind, value);
    process.stdout.write(`${kind}:valid\n`);
    return;
  }

  if (command === "build-approved-items") {
    const value = await buildApprovedPublicItems({
      report: await readJson(required(options, "report")),
      decisions: await readJson(required(options, "decisions")),
      artifactId: options["artifact-id"],
    });
    process.stdout.write(
      `${await writeJsonIdempotently(required(options, "out"), value)}\n`,
    );
    return;
  }

  if (command === "approve-chapter") {
    const value = await approveChapter(
      await readJson(required(options, "input")),
      {
        approvedBy: required(options, "approved-by"),
        approvedAt: required(options, "approved-at"),
      },
    );
    process.stdout.write(
      `${await writeJsonIdempotently(required(options, "out"), value)}\n`,
    );
    return;
  }

  if (command === "export-chapter") {
    const value = await exportChapter(
      await readJson(required(options, "input")),
    );
    process.stdout.write(
      `${await writeJsonIdempotently(required(options, "out"), value)}\n`,
    );
    return;
  }

  if (command === "stage-chapter") {
    const result = await stageChapter({
      chapter: await readJson(required(options, "input")),
      endpoint: options.endpoint,
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }

  throw new Error(`Unknown command ${command}\n\n${help}`);
}

main().catch((error) => {
  process.stderr.write(
    `remixx-artifact: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
