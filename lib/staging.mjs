import { exportChapter } from "./artifacts.mjs";

export const DEFAULT_STAGE_ENDPOINT =
  "https://remixx-sepia.vercel.app/api/chapters/stage";

function stagingEndpoint(value) {
  const url = new URL(value ?? DEFAULT_STAGE_ENDPOINT);
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new Error("Chapter staging requires HTTPS except on localhost");
  }
  return url;
}

function stagedResponse(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Remixx returned an invalid staging response");
  }
  const requiredStrings = [
    "stageId",
    "projectId",
    "chapterId",
    "contentHash",
    "status",
    "stagedAt",
    "reviewPath",
  ];
  for (const key of requiredStrings) {
    if (typeof value[key] !== "string" || value[key].length === 0) {
      throw new Error("Remixx returned an invalid staging response");
    }
  }
  if (typeof value.duplicate !== "boolean") {
    throw new Error("Remixx returned an invalid staging response");
  }
  return value;
}

export async function stageChapter({
  chapter,
  endpoint = DEFAULT_STAGE_ENDPOINT,
  fetchImpl = fetch,
}) {
  const approved = await exportChapter(chapter);
  const url = stagingEndpoint(endpoint);
  const response = await fetchImpl(url, {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
    headers: { "content-type": "application/json" },
    body: JSON.stringify(approved),
  });

  if (!response.ok) {
    throw new Error(`Remixx staging failed with HTTP ${response.status}`);
  }

  const staged = stagedResponse(await response.json());
  if (
    staged.projectId !== approved.project.projectId ||
    staged.chapterId !== approved.chapterId ||
    staged.contentHash !== approved.contentHash
  ) {
    throw new Error("Remixx staging response does not match the Chapter");
  }

  return {
    ...staged,
    reviewUrl: new URL(staged.reviewPath, url.origin).toString(),
  };
}
