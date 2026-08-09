import { validateArtifact } from "./artifacts.mjs";

export const DEFAULT_REMIXX_ORIGIN = "https://remixx-sepia.vercel.app";

const MAX_DESCRIPTION_CHARS = 1_000;
const MAX_PAYLOAD_BYTES = 4_096;

function bootstrapOrigin(value) {
  const url = new URL(value);
  const localHttp =
    url.protocol === "http:" &&
    (url.hostname === "127.0.0.1" || url.hostname === "localhost");
  if (url.protocol !== "https:" && !localHttp) {
    throw new Error("Bootstrap origin must use HTTPS (or loopback HTTP)");
  }
  if (url.username || url.password) {
    throw new Error("Bootstrap origin must not contain credentials");
  }
  return url.origin;
}

export async function createProjectBootstrapUrl({
  project,
  description,
  origin = DEFAULT_REMIXX_ORIGIN,
}) {
  await validateArtifact("project", project);

  const exactDescription = description.trim();
  if (
    exactDescription.length < 10 ||
    exactDescription.length > MAX_DESCRIPTION_CHARS
  ) {
    throw new Error(
      "Project description must be between 10 and 1000 characters",
    );
  }

  const payload = {
    projectId: project.projectId,
    slug: project.slug,
    name: project.name,
    description: exactDescription,
  };
  const bytes = Buffer.from(JSON.stringify(payload), "utf8");
  if (bytes.byteLength > MAX_PAYLOAD_BYTES) {
    throw new Error("Project bootstrap payload is too large");
  }

  const url = new URL("/projects/new", bootstrapOrigin(origin));
  url.searchParams.set("bootstrap", bytes.toString("base64url"));
  return url.toString();
}
