#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  access,
  mkdir,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import {
  assertFrameContent,
  assertPlaybackAdvanced,
  assertVideoState,
  decodeGrayPng,
  summariseFrames,
} from "./content-assertions.mjs";
import { probeWebm } from "./webm-metadata.mjs";

const argument = (name) => {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
};

const configPath = argument("config");
if (!configPath) {
  process.stderr.write(
    "Usage: node capture_browser_demo.mjs --config <config.json>\n",
  );
  process.exit(2);
}

const config = JSON.parse(await readFile(resolve(configPath), "utf8"));
const requiredConfigString = (name) => {
  const value = config[name];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`config requires non-empty ${name}`);
  }
  return value;
};
const outputPath = resolve(requiredConfigString("outputPath"));
const cuePath = resolve(config.cuePath ?? `${outputPath}.cues.json`);
const profilePath = resolve(requiredConfigString("profilePath"));
const videoDirectory = resolve(dirname(outputPath), ".playwright-video");
const viewport = config.viewport ?? { width: 1600, height: 1000 };
const executablePath = config.executablePath ?? process.env.CHROMIUM_PATH;
const url = requiredConfigString("url");
const parsedUrl = new URL(url);
const redactions = config.redactions ?? [];
const supportedSteps = new Set([
  "hold",
  "waitFor",
  "moveCursor",
  "click",
  "drag",
]);
const MAX_DRAG_POINTS = 64;

// Content assertions. Structural validation cannot tell a stream playing from a page that never
// loaded -- a recording of an empty div satisfies every byte/dimension/duration bound downstream.
// These assertions are ON BY DEFAULT and a capture that fails one is deleted rather than emitted.
// A genuinely motionless capture must say so explicitly via expectStaticPage; silence is not a pass.
const content = config.content ?? {};
if (content === false || content === null) {
  throw new Error(
    "content assertions cannot be disabled; set content.expectStaticPage if a capture is motionless by design",
  );
}
const videoSelector =
  typeof content.videoSelector === "string" && content.videoSelector.trim()
    ? content.videoSelector.trim()
    : undefined;
const minReadyState = content.minReadyState ?? 3;
const minPlaybackAdvanceMs = content.minPlaybackAdvanceMs ?? 500;
const playbackPollMs = content.playbackPollMs ?? 500;
const expectStaticPage = content.expectStaticPage === true;
const frameSampleFps = content.frameSampleFps ?? 2;
const frameSampleSize = content.frameSampleSize ?? 64;
// A near-uniform frame (one flat colour) has almost no spread. Real UI has plenty.
const minFrameStdDev = content.minFrameStdDev ?? 3;
// Mean absolute luma delta between consecutive sampled frames, worst-case across the run.
const minInterFrameDelta = content.minInterFrameDelta ?? 0.75;

if (
  !Number.isInteger(minReadyState) ||
  minReadyState < 0 ||
  minReadyState > 4
) {
  throw new Error("content.minReadyState must be an integer from 0 to 4");
}
if (!Number.isFinite(frameSampleFps) || frameSampleFps <= 0) {
  throw new Error("content.frameSampleFps must be a positive number");
}
if (
  !Number.isInteger(frameSampleSize) ||
  frameSampleSize < 8 ||
  frameSampleSize > 512
) {
  throw new Error("content.frameSampleSize must be an integer from 8 to 512");
}
for (const [key, value] of [
  ["minFrameStdDev", minFrameStdDev],
  ["minInterFrameDelta", minInterFrameDelta],
  ["minPlaybackAdvanceMs", minPlaybackAdvanceMs],
  ["playbackPollMs", playbackPollMs],
]) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`content.${key} must be a non-negative number`);
  }
}

if (
  !Array.isArray(config.steps) ||
  config.steps.length === 0 ||
  typeof executablePath !== "string" ||
  executablePath.length === 0
) {
  throw new Error(
    "config requires at least one step and executablePath/CHROMIUM_PATH",
  );
}
if (!["http:", "https:"].includes(parsedUrl.protocol)) {
  throw new Error("config url must use http or https");
}
if (parsedUrl.username || parsedUrl.password) {
  throw new Error("config url must not contain credentials");
}
if (extname(outputPath).toLowerCase() !== ".webm") {
  throw new Error(
    "outputPath must end in .webm because Playwright records WebM",
  );
}
if (!Array.isArray(redactions)) {
  throw new Error("config redactions must be an array");
}
if (
  !Number.isInteger(viewport.width) ||
  viewport.width <= 0 ||
  viewport.width > 8_192 ||
  !Number.isInteger(viewport.height) ||
  viewport.height <= 0 ||
  viewport.height > 8_192
) {
  throw new Error("viewport width and height must be integers from 1 to 8192");
}
for (const [index, redaction] of redactions.entries()) {
  if (
    typeof redaction?.selector !== "string" ||
    redaction.selector.trim().length === 0 ||
    typeof redaction?.replacement !== "string" ||
    redaction.replacement.trim().length === 0
  ) {
    throw new Error(`redaction ${index + 1} requires selector and replacement`);
  }
}
for (const [index, step] of config.steps.entries()) {
  if (!supportedSteps.has(step?.kind)) {
    throw new Error(`Unsupported step ${index + 1}: ${String(step?.kind)}`);
  }
  if (
    ["waitFor", "moveCursor", "click", "drag"].includes(step.kind) &&
    (typeof step.selector !== "string" || step.selector.trim().length === 0)
  ) {
    throw new Error(`step ${index + 1} requires a selector`);
  }
  // A drag is the only way to demonstrate anything that responds to a held
  // pointer -- a canvas stroke, a slider, a map pan, a drag-and-drop. Points are
  // ratios of the target element's box so the path survives a crop and stays
  // meaningful at any viewport.
  if (step.kind === "drag") {
    if (
      !Array.isArray(step.path) ||
      step.path.length < 2 ||
      step.path.length > MAX_DRAG_POINTS
    ) {
      throw new Error(
        `step ${index + 1} requires a path of 2 to ${MAX_DRAG_POINTS} points`,
      );
    }
    for (const [pointIndex, point] of step.path.entries()) {
      for (const key of ["xRatio", "yRatio"]) {
        if (
          !Number.isFinite(point?.[key]) ||
          point[key] < 0 ||
          point[key] > 1
        ) {
          throw new Error(
            `step ${index + 1} path point ${pointIndex + 1} needs ${key} from 0 to 1`,
          );
        }
      }
    }
    if (
      step.interpolationSteps !== undefined &&
      (!Number.isInteger(step.interpolationSteps) ||
        step.interpolationSteps < 1 ||
        step.interpolationSteps > 200)
    ) {
      throw new Error(
        `step ${index + 1} interpolationSteps must be an integer from 1 to 200`,
      );
    }
  }
  const timingKeys = ["durationMs", "moveMs", "afterMs", "segmentMs"];
  for (const key of timingKeys) {
    if (
      step[key] !== undefined &&
      (!Number.isFinite(step[key]) || step[key] < 0 || step[key] > 60_000)
    ) {
      throw new Error(`step ${index + 1} has invalid ${key}`);
    }
  }
}

const exists = async (path) => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

const runProcess = (command, args, { capture = "buffer" } = {}) =>
  new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    const stdout = [];
    let stderr = "";
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", rejectPromise);
    child.on("close", (code) => {
      resolvePromise({
        code,
        stderr,
        stdout:
          capture === "string"
            ? Buffer.concat(stdout).toString("utf8")
            : Buffer.concat(stdout),
      });
    });
  });

// pnpm does not hoist @remotion to the root node_modules, so the compositor binary is only
// reachable through the .pnpm store. Discover it instead of guessing a path.
// Playwright ships its own ffmpeg, and although it is built --disable-everything it happens to include
// exactly what frame probing needs: the image2 muxer, the png encoder and the scale filter. It cannot
// mux mp4 or encode audio, so it is useless for a recap render -- but this skill only needs to read
// frames back, so depending on playwright is enough to make capture self-sufficient.
const discoverPlaywrightFfmpeg = async () => {
  const roots = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    process.env.HOME
      ? resolve(process.env.HOME, ".cache/ms-playwright")
      : undefined,
  ].filter((root) => typeof root === "string" && root.length > 0);
  const found = [];
  for (const root of roots) {
    let entries = [];
    try {
      entries = await readdir(root);
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.startsWith("ffmpeg-")) continue;
      found.push(resolve(root, entry, "ffmpeg-linux"));
      found.push(resolve(root, entry, "ffmpeg-mac"));
      found.push(resolve(root, entry, "ffmpeg-win64.exe"));
    }
  }
  return found;
};

const discoverRemotionFfmpeg = async () => {
  const found = [];
  const roots = new Set();
  for (const start of [
    process.cwd(),
    dirname(fileURLToPath(import.meta.url)),
  ]) {
    let current = start;
    for (let depth = 0; depth < 8; depth += 1) {
      roots.add(resolve(current, "node_modules"));
      const parent = dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }
  for (const root of roots) {
    for (const libc of ["gnu", "musl"]) {
      found.push(
        resolve(root, `@remotion/compositor-linux-x64-${libc}/ffmpeg`),
      );
    }
    const store = resolve(root, ".pnpm");
    let entries = [];
    try {
      entries = await readdir(store);
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.startsWith("@remotion+compositor-linux-x64-")) continue;
      const libc = entry.includes("musl") ? "musl" : "gnu";
      found.push(
        resolve(
          store,
          entry,
          `node_modules/@remotion/compositor-linux-x64-${libc}/ffmpeg`,
        ),
      );
    }
  }
  return found;
};

// Playwright ships an ffmpeg built with --disable-everything: webm/image2 muxers and vp8/png
// encoders only. It cannot decode audio, cannot mux mp4, and cannot write rawvideo. Remotion's
// compositor ships a full n7.1 build. Resolve by capability, never by assuming a binary is complete.
const resolveFfmpeg = async () => {
  const candidates = [
    content.ffmpegPath,
    process.env.REMIXX_FFMPEG_PATH,
    ...(await discoverRemotionFfmpeg()),
    ...(await discoverPlaywrightFfmpeg()),
    "ffmpeg",
  ].filter(
    (candidate) => typeof candidate === "string" && candidate.length > 0,
  );
  const rejected = [];
  for (const candidate of candidates) {
    if (candidate.includes("/") && !(await exists(candidate))) continue;
    let muxers;
    let filters;
    let encoders;
    try {
      muxers = await runProcess(candidate, ["-hide_banner", "-muxers"], {
        capture: "string",
      });
      filters = await runProcess(candidate, ["-hide_banner", "-filters"], {
        capture: "string",
      });
      encoders = await runProcess(candidate, ["-hide_banner", "-encoders"], {
        capture: "string",
      });
    } catch {
      continue;
    }
    if (muxers.code !== 0 || filters.code !== 0 || encoders.code !== 0)
      continue;
    // Frame probing needs: the image2 muxer, a png encoder, and the scale filter. Playwright's
    // build happens to have all three but cannot decode audio or mux mp4, so it is still the
    // wrong binary for the recap path -- capability is checked per use, not once globally.
    if (!/\bimage2\b/.test(muxers.stdout)) {
      rejected.push(`${candidate} (no image2 muxer)`);
      continue;
    }
    if (!/\bpng\b/.test(encoders.stdout)) {
      rejected.push(`${candidate} (no png encoder)`);
      continue;
    }
    if (!/\bscale\b/.test(filters.stdout)) {
      rejected.push(`${candidate} (no scale filter)`);
      continue;
    }
    return candidate;
  }
  throw new Error(
    `No ffmpeg capable of PNG frame extraction was found, so recorded frames cannot be inspected. ` +
      `Set content.ffmpegPath or REMIXX_FFMPEG_PATH.` +
      (rejected.length ? ` Rejected: ${rejected.join(", ")}.` : ""),
  );
};

// Assertion 1 -- before recording anything, the media element must actually be presenting frames.
const assertVideoElementReady = async (page, selector) => {
  const handle = page.locator(selector).first();
  try {
    await handle.waitFor({ state: "attached", timeout: 20_000 });
  } catch {
    throw new Error(
      `content.videoSelector matched no element: ${selector}. Nothing was recorded.`,
    );
  }
  const state = await handle.evaluate(
    (element, budgetMs) =>
      new Promise((resolveState) => {
        if (!(element instanceof HTMLVideoElement)) {
          resolveState({ notAVideo: true, tag: element.tagName });
          return;
        }
        const snapshot = () => ({
          readyState: element.readyState,
          videoWidth: element.videoWidth,
          videoHeight: element.videoHeight,
          paused: element.paused,
          ended: element.ended,
          currentTime: element.currentTime,
          networkState: element.networkState,
          error: element.error ? element.error.code : null,
        });
        const deadline = Date.now() + budgetMs;
        const poll = () => {
          const current = snapshot();
          if (
            (current.readyState >= 3 && current.videoWidth > 0) ||
            Date.now() > deadline
          ) {
            resolveState(current);
            return;
          }
          setTimeout(poll, 250);
        };
        poll();
      }),
    20_000,
  );
  return assertVideoState(state, selector, { minReadyState });
};

// Remotion's ffmpeg is built with a 50-filter allowlist that excludes `fps`, and with no rawvideo
// muxer. Use the -r output option for rate and the image2 muxer, both of which are present.
const analyseFrames = async (ffmpegPath, path) => {
  const side = frameSampleSize;
  const frameDirectory = resolve(
    dirname(outputPath),
    `.frame-probe-${process.pid}`,
  );
  await mkdir(frameDirectory, { recursive: true });
  try {
    const result = await runProcess(ffmpegPath, [
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      path,
      "-r",
      String(frameSampleFps),
      "-vf",
      `scale=${side}:${side}`,
      "-pix_fmt",
      "gray",
      "-c:v",
      "png",
      "-f",
      "image2",
      resolve(frameDirectory, "f%05d.png"),
    ]);
    if (result.code !== 0) {
      throw new Error(
        `ffmpeg could not decode the recording for frame inspection: ${result.stderr.trim()}`,
      );
    }
    const names = (await readdir(frameDirectory))
      .filter((name) => name.endsWith(".png"))
      .sort();
    if (names.length < 1) {
      throw new Error(
        "the recording yielded no decodable frames; it is not a usable video",
      );
    }
    const framePixels = [];
    for (const name of names) {
      framePixels.push(
        decodeGrayPng(await readFile(resolve(frameDirectory, name))).pixels,
      );
    }
    return {
      ...summariseFrames(framePixels),
      sampleFps: frameSampleFps,
      sampleSize: side,
    };
  } finally {
    await rm(frameDirectory, { recursive: true, force: true });
  }
};

// Resolved before the browser launches: a capture that cannot be inspected must not be attempted.
const ffmpegPath = await resolveFfmpeg();

await Promise.all([
  mkdir(dirname(outputPath), { recursive: true }),
  mkdir(profilePath, { recursive: true }),
  mkdir(videoDirectory, { recursive: true }),
]);

const context = await chromium.launchPersistentContext(profilePath, {
  executablePath,
  headless: config.headless !== false,
  ignoreHTTPSErrors: config.ignoreHTTPSErrors === true,
  viewport,
  recordVideo: { dir: videoDirectory, size: viewport },
  args: ["--autoplay-policy=no-user-gesture-required", "--mute-audio"],
});

const page = context.pages()[0] ?? (await context.newPage());
const startedAt = Date.now();
await page.addInitScript(
  ({ structuralRedactions }) => {
    const install = () => {
      const applyRedactions = () => {
        for (const redaction of structuralRedactions) {
          for (const element of document.querySelectorAll(redaction.selector)) {
            if (
              element instanceof HTMLInputElement ||
              element instanceof HTMLTextAreaElement
            ) {
              if (element.value !== redaction.replacement)
                element.value = redaction.replacement;
              if (element.placeholder)
                element.placeholder = redaction.replacement;
            } else if (element.textContent !== redaction.replacement) {
              element.textContent = redaction.replacement;
            }
          }
        }
      };
      applyRedactions();
      new MutationObserver(applyRedactions).observe(document.documentElement, {
        attributes: false,
        childList: true,
        subtree: true,
        characterData: true,
      });

      const cursor = document.createElement("div");
      cursor.id = "remixx-report-cursor";
      Object.assign(cursor.style, {
        position: "fixed",
        left: "0",
        top: "0",
        width: "28px",
        height: "28px",
        borderRadius: "999px",
        border: "3px solid white",
        boxShadow: "0 0 0 5px rgba(139,92,246,.72), 0 6px 20px rgba(0,0,0,.45)",
        transform: "translate(-100px,-100px)",
        transition:
          "transform 520ms cubic-bezier(.2,.8,.2,1), opacity 160ms ease",
        pointerEvents: "none",
        zIndex: "2147483647",
        opacity: "0",
      });
      document.documentElement.append(cursor);
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", install, { once: true });
    } else {
      install();
    }
  },
  { structuralRedactions: redactions },
);
await page.goto(url, { waitUntil: "domcontentloaded" });

const redactionManifest = [];
for (const redaction of redactions) {
  const locator = page.locator(redaction.selector);
  const count = await locator.count();
  if (count === 0)
    throw new Error(`Redaction selector did not match: ${redaction.selector}`);
  redactionManifest.push({
    selector: redaction.selector,
    replacement: redaction.replacement,
    matchedElements: count,
  });
}
// Assertion 1 runs before a single step executes, so a dead player fails fast instead of
// producing twelve seconds of nothing that passes every downstream structural gate.
const videoReadyState = videoSelector
  ? await assertVideoElementReady(page, videoSelector)
  : null;

// Assertion 2's sampler. Polls in the background for the whole scripted run.
const playbackSamples = [];
let playbackSamplerError = null;
const playbackSampler = videoSelector
  ? setInterval(() => {
      page
        .locator(videoSelector)
        .first()
        .evaluate((element) => ({
          currentTime: element.currentTime,
          paused: element.paused,
        }))
        .then((sample) =>
          playbackSamples.push({ ...sample, atMs: Date.now() - startedAt }),
        )
        .catch((error) => {
          playbackSamplerError ??= error;
        });
    }, playbackPollMs)
  : null;

const cues = [];
const locate = async (selector) => {
  const locator = page.locator(selector).first();
  await locator.waitFor({ state: "visible", timeout: 15_000 });
  const rect = await locator.boundingBox();
  if (!rect) throw new Error(`No visible rectangle for ${selector}`);
  return { locator, rect };
};
const moveCursor = async (selector, moveMs = 650) => {
  const { rect } = await locate(selector);
  const x = Math.round(rect.x + rect.width / 2);
  const y = Math.round(rect.y + rect.height / 2);
  await page.evaluate(
    ({ x, y, moveMs }) => {
      const cursor = document.getElementById("remixx-report-cursor");
      cursor.style.transitionDuration = `${moveMs}ms`;
      cursor.style.opacity = "1";
      cursor.style.transform = `translate(${x - 14}px,${y - 14}px)`;
    },
    { x, y, moveMs },
  );
  cues.push({
    atMs: Date.now() - startedAt,
    kind: "cursor",
    selector,
    rect,
    x,
    y,
    durationMs: moveMs,
  });
  await page.waitForTimeout(moveMs);
};

for (const [index, step] of config.steps.entries()) {
  if (step.kind === "hold") {
    await page.waitForTimeout(step.durationMs ?? 1000);
    continue;
  }
  if (step.kind === "waitFor") {
    const { rect } = await locate(step.selector);
    cues.push({
      atMs: Date.now() - startedAt,
      kind: "waitFor",
      selector: step.selector,
      rect,
      durationMs: 0,
    });
    continue;
  }
  if (step.kind === "moveCursor") {
    await moveCursor(step.selector, step.durationMs);
    continue;
  }
  if (step.kind === "click") {
    await moveCursor(step.selector, step.moveMs);
    const { locator, rect } = await locate(step.selector);
    await page.evaluate(() => {
      const cursor = document.getElementById("remixx-report-cursor");
      cursor.animate(
        [
          { transform: `${cursor.style.transform} scale(1)` },
          { transform: `${cursor.style.transform} scale(.68)` },
          { transform: `${cursor.style.transform} scale(1)` },
        ],
        { duration: 320, easing: "ease-out" },
      );
    });
    cues.push({
      atMs: Date.now() - startedAt,
      kind: "click",
      selector: step.selector,
      rect,
      durationMs: 320,
    });
    await locator.click();
    await page.waitForTimeout(step.afterMs ?? 1000);
    continue;
  }
  if (step.kind === "drag") {
    // The real pointer, held down, along the path. `moveCursor` only animates the
    // decorative overlay, so it can show a cursor travelling over a canvas while
    // the canvas receives nothing -- which is exactly how a drawing app ended up
    // blank in a finished video that passed every structural gate.
    const { rect } = await locate(step.selector);
    const points = step.path.map((point) => ({
      x: rect.x + rect.width * point.xRatio,
      y: rect.y + rect.height * point.yRatio,
    }));
    const first = points[0];
    const segmentMs = step.segmentMs ?? 220;
    const interpolationSteps = step.interpolationSteps ?? 24;
    const placeOverlay = async (x, y, ms) => {
      await page.evaluate(
        ({ x, y, ms }) => {
          const cursor = document.getElementById("remixx-report-cursor");
          cursor.style.transitionDuration = `${ms}ms`;
          cursor.style.opacity = "1";
          cursor.style.transform = `translate(${x - 14}px,${y - 14}px)`;
        },
        { x, y, ms },
      );
    };

    await page.mouse.move(first.x, first.y);
    await placeOverlay(first.x, first.y, step.moveMs ?? 650);
    await page.waitForTimeout(step.moveMs ?? 650);
    await page.mouse.down();
    for (const point of points.slice(1)) {
      await page.mouse.move(point.x, point.y, { steps: interpolationSteps });
      await placeOverlay(point.x, point.y, segmentMs);
      await page.waitForTimeout(segmentMs);
    }
    await page.mouse.up();
    cues.push({
      atMs: Date.now() - startedAt,
      kind: "drag",
      selector: step.selector,
      rect,
      points,
      durationMs: segmentMs * (points.length - 1),
    });
    await page.waitForTimeout(step.afterMs ?? 1000);
    continue;
  }
  throw new Error(`Unsupported step ${index + 1}: ${step.kind}`);
}

if (playbackSampler) clearInterval(playbackSampler);

const video = page.video();
if (!video) throw new Error("Playwright did not create a video");
const saveVideo = video.saveAs(outputPath);
await context.close();
await saveVideo;

// From here the file exists on disk. Every assertion below deletes it rather than emitting it,
// because a blank artifact that reaches the staging pipeline will pass every structural gate.
let contentReport;
try {
  if (videoSelector) {
    if (playbackSamplerError) throw playbackSamplerError;
    contentReport = {
      videoElement: {
        selector: videoSelector,
        readyState: videoReadyState.readyState,
        videoWidth: videoReadyState.videoWidth,
        videoHeight: videoReadyState.videoHeight,
      },
      playback: assertPlaybackAdvanced(playbackSamples, {
        minPlaybackAdvanceMs,
      }),
    };
  } else {
    contentReport = { videoElement: null, playback: null };
  }
  contentReport.frames = assertFrameContent(
    await analyseFrames(ffmpegPath, outputPath),
    { minFrameStdDev, minInterFrameDelta, expectStaticPage },
  );
  contentReport.thresholds = {
    minReadyState,
    minPlaybackAdvanceMs,
    minFrameStdDev,
    minInterFrameDelta,
    expectStaticPage,
  };
} catch (error) {
  await rm(outputPath, { force: true });
  await rm(cuePath, { force: true });
  throw new Error(
    `Capture rejected and discarded -- ${error.message}\n` +
      `No file was emitted. Structural validation downstream would have accepted this recording, ` +
      `which is exactly why this assertion exists.`,
    { cause: error },
  );
}

const outputBytes = await readFile(outputPath);
const outputSha256 = createHash("sha256").update(outputBytes).digest("hex");
let media;
try {
  media = probeWebm(outputBytes);
} catch (error) {
  await rm(outputPath, { force: true });
  await rm(cuePath, { force: true });
  throw new Error(
    `Capture rejected and discarded -- emitted WebM metadata is invalid: ${error.message}`,
    { cause: error },
  );
}
const cueArtifact = {
  schemaVersion: "browser-capture-cues.v2",
  url: `${parsedUrl.origin}${parsedUrl.pathname}`,
  viewport,
  durationMs: media.durationMs,
  media,
  videoSha256: outputSha256,
  cues,
  structuralRedactions: redactionManifest,
  contentAssertions: contentReport,
};
const cueBytes = `${JSON.stringify(cueArtifact, null, 2)}\n`;
await writeFile(cuePath, cueBytes, "utf8");

process.stdout.write(
  `${JSON.stringify(
    {
      outputPath,
      outputSha256,
      cuePath,
      cueSha256: createHash("sha256").update(cueBytes).digest("hex"),
      cueCount: cues.length,
      media,
      contentAssertions: contentReport,
    },
    null,
    2,
  )}\n`,
);
