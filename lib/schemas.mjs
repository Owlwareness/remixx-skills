import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const schemaPaths = {
  report: path.join(
    root,
    "schemas/report.v1.schema.json",
  ),
  chapter: path.join(
    root,
    "schemas/chapter.v1.schema.json",
  ),
  decisions: path.join(
    root,
    "schemas/report-visibility-decisions.v1.schema.json",
  ),
  "approved-items": path.join(
    root,
    "schemas/ApprovedPublicItems.v1.schema.json",
  ),
  "source-manifest": path.join(
    root,
    "schemas/report-source-manifest.v1.schema.json",
  ),
  "session-capture": path.join(
    root,
    "schemas/session-capture.v1.schema.json",
  ),
};

const validators = new Map();

export const artifactKinds = Object.freeze(Object.keys(schemaPaths));

export async function schemaFor(kind) {
  const schemaPath = schemaPaths[kind];
  if (!schemaPath) {
    throw new Error(
      `Unknown artifact kind ${kind}; expected one of ${artifactKinds.join(", ")}`,
    );
  }
  return JSON.parse(await readFile(schemaPath, "utf8"));
}

export async function validateSchema(kind, value) {
  let validate = validators.get(kind);
  if (!validate) {
    const ajv = new Ajv({
      allErrors: true,
      allowUnionTypes: true,
      strict: false,
    });
    addFormats(ajv);
    validate = ajv.compile(await schemaFor(kind));
    validators.set(kind, validate);
  }
  if (!validate(value)) {
    const details = validate.errors
      .map(
        (error) =>
          `${error.instancePath || "/"} ${error.message || "is invalid"}`,
      )
      .join("; ");
    throw new Error(`${kind} schema validation failed: ${details}`);
  }
  return value;
}
