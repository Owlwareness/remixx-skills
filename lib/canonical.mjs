import { createHash } from "node:crypto";

export function canonicalizeJson(value) {
  if (value === null || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new TypeError(
        "Portable artifact numbers must be safe integers; encode decimals as strings",
      );
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalizeJson).join(",")}]`;
  }
  if (typeof value !== "object" || value === undefined) {
    throw new TypeError("Portable artifacts must contain JSON values only");
  }

  const keys = Object.keys(value);
  if (keys.some((key) => !/^[A-Za-z][A-Za-z0-9_]*$/.test(key))) {
    throw new TypeError(
      "Portable artifact keys must be ASCII identifiers beginning with a letter",
    );
  }
  return `{${keys
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalizeJson(value[key])}`)
    .join(",")}}`;
}

export function sha256CanonicalJson(value) {
  return createHash("sha256")
    .update(canonicalizeJson(value), "utf8")
    .digest("hex");
}

export function withContentHash(value) {
  const { contentHash: _ignored, ...withoutHash } = value;
  void _ignored;
  return {
    ...withoutHash,
    contentHash: sha256CanonicalJson(withoutHash),
  };
}
